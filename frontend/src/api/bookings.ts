import { parseApiError, type VehicleDto } from './vehicles'
import { authFetch } from './authFetch'
import { parseApiErrorFromResponse, unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type BookingDto = {
  id: number
  bookingCode: string
  renterId: number
  renterName: string
  vehicleId: number
  vehicleName: string
  stationId: number
  stationName: string
  startTime: string
  expectedEndTime: string
  actualEndTime: string | null
  status: string
  checkedOutById: number | null
  checkedInById: number | null
  basePrice: string | number | null
  partiallyPaid: string | number | null
  extraFee: string | number | null
  totalAmount: string | number | null
  pickupNote: string | null
  returnNote: string | null
  paymentStatus: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type PageResponse<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export type PagedBookingsResponse = PageResponse<BookingDto>

export type BookingCreatePayload = {
  renterId: number
  vehicleId: number
  stationId: number
  startTime: string
  expectedEndTime: string
  pickupNote?: string | null
}

export type BookingUpdatePayload = {
  startTime?: string | null
  expectedEndTime?: string | null
  actualEndTime?: string | null
  status?: string | null
  paymentStatus?: string | null
  partiallyPaid?: number | null
  extraFee?: number | null
  totalAmount?: number | null
  pickupNote?: string | null
  returnNote?: string | null
}

function buildPagedQuery(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  renterId?: number
  stationId?: number
  vehicleId?: number
  status?: string
  paymentStatus?: string
  startTimeFrom?: string
  startTimeTo?: string
  createdAtFrom?: string
  createdAtTo?: string
  keyword?: string
}): string {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 10))
  q.set('sortBy', params.sortBy ?? 'id')
  q.set('sortDir', params.sortDir ?? 'desc')
  if (params.renterId != null) q.set('renterId', String(params.renterId))
  if (params.stationId != null) q.set('stationId', String(params.stationId))
  if (params.vehicleId != null) q.set('vehicleId', String(params.vehicleId))
  if (params.status && params.status !== '') q.set('status', params.status)
  if (params.paymentStatus && params.paymentStatus !== '') q.set('paymentStatus', params.paymentStatus)
  if (params.startTimeFrom && params.startTimeFrom !== '') q.set('startTimeFrom', params.startTimeFrom)
  if (params.startTimeTo && params.startTimeTo !== '') q.set('startTimeTo', params.startTimeTo)
  if (params.createdAtFrom && params.createdAtFrom !== '') q.set('createdAtFrom', params.createdAtFrom)
  if (params.createdAtTo && params.createdAtTo !== '') q.set('createdAtTo', params.createdAtTo)
  if (params.keyword != null && params.keyword.trim() !== '') q.set('keyword', params.keyword.trim())
  return q.toString()
}

/** Đơn đặt xe của user đang đăng nhập (JWT). */
export async function fetchMyBookings(): Promise<BookingDto[]> {
  const res = await authFetch(`${API_BASE}/bookings/me`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BookingDto[]>(payload)
  if (!Array.isArray(data)) {
    throw new Error('Phản hồi danh sách booking của tôi không hợp lệ.')
  }
  return data
}

export async function fetchBookingsPaged(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  renterId?: number
  stationId?: number
  vehicleId?: number
  status?: string
  paymentStatus?: string
  startTimeFrom?: string
  startTimeTo?: string
  createdAtFrom?: string
  createdAtTo?: string
  keyword?: string
}): Promise<PagedBookingsResponse> {
  const res = await authFetch(
    `${API_BASE}/bookings/paged?${buildPagedQuery(params)}`,
  )
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const paged = unwrapApiData<PagedBookingsResponse>(payload)
  if (!paged) throw new Error('Phản hồi danh sách booking không hợp lệ.')
  return paged
}

/** Khớp `BookingService#calculateBasePrice`: max(1, ceil(ngày)) × dailyRate. */
export function computeBookingEstimate(
  vehicle: VehicleDto,
  startLocal: string,
  endLocal: string,
): { days: number; subtotal: number; exactDays: number; hours: number; roundedUp: boolean } {
  const rateRaw = vehicle.dailyRate
  const rate =
    rateRaw == null
      ? 0
      : typeof rateRaw === 'number'
        ? rateRaw
        : parseFloat(String(rateRaw))
  const daily = Number.isFinite(rate) ? rate : 0
  if (!startLocal?.trim() || !endLocal?.trim()) {
    return { days: 0, subtotal: 0, exactDays: 0, hours: 0, roundedUp: false }
  }
  const start = new Date(startLocal)
  const end = new Date(endLocal)
  if (!(end.getTime() > start.getTime())) {
    return { days: 0, subtotal: 0, exactDays: 0, hours: 0, roundedUp: false }
  }
  const durationMs = end.getTime() - start.getTime()
  const exactDays = durationMs / 86400000
  const hours = durationMs / 3600000
  const rawDays = Math.ceil(exactDays)
  const days = Math.max(1, rawDays)
  return { days, subtotal: days * daily, exactDays, hours, roundedUp: days > exactDays }
}

export async function checkVehicleAvailability(params: {
  vehicleId: number
  start: string
  end: string
}): Promise<boolean> {
  const q = new URLSearchParams({
    vehicleId: String(params.vehicleId),
    start: params.start,
    end: params.end,
  })
  const res = await fetch(`${API_BASE}/bookings/vehicle-availability?${q}`)
  if (!res.ok) {
    throw new Error(await parseApiErrorFromResponse(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<{ available?: boolean }>(payload)
  return Boolean(data?.available)
}

export async function createBooking(
  payload: BookingCreatePayload,
): Promise<BookingDto> {
  const res = await authFetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const responsePayload = (await res.json()) as unknown
  const booking = unwrapApiData<BookingDto>(responsePayload)
  if (!booking) throw new Error('Phản hồi tạo booking không hợp lệ.')
  return booking
}

export type MomoCreatePaymentDto = {
  partnerCode?: string
  requestId?: string
  orderId?: string
  resultCode?: number
  message?: string
  payUrl?: string
  deeplink?: string
  qrCodeUrl?: string
  responseTime?: number
  extraData?: string
  signature?: string
}

/** MoMo v2 create: ví (`captureWallet`) hoặc thẻ ATM nội địa (`payWithATM`). */
export type MomoPrepayRequestType = 'captureWallet' | 'payWithATM'

export async function createMomoPrepayTotalForBooking(
  bookingId: number,
  options?: { momoRequestType?: MomoPrepayRequestType },
): Promise<MomoCreatePaymentDto> {
  const momoRequestType = options?.momoRequestType ?? 'captureWallet'
  const q = new URLSearchParams()
  q.set('momoRequestType', momoRequestType)
  const res = await authFetch(
    `${API_BASE}/bookings/${bookingId}/payments/momo/prepay-total?${q.toString()}`,
    { method: 'POST' },
  )
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<MomoCreatePaymentDto>(payload)
  if (!data) throw new Error('Phản hồi tạo thanh toán MoMo không hợp lệ.')
  return data
}

export async function updateBooking(
  id: number,
  payload: BookingUpdatePayload,
): Promise<BookingDto> {
  const res = await authFetch(`${API_BASE}/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const responsePayload = (await res.json()) as unknown
  const booking = unwrapApiData<BookingDto>(responsePayload)
  if (!booking) throw new Error('Phản hồi cập nhật booking không hợp lệ.')
  return booking
}

export async function deleteBooking(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/bookings/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
}

export async function confirmBooking(id: number): Promise<BookingDto> {
  const res = await authFetch(`${API_BASE}/bookings/${id}/confirm`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const booking = unwrapApiData<BookingDto>(payload)
  if (!booking) throw new Error('Phản hồi xác nhận booking không hợp lệ.')
  return booking
}

export async function pickupBooking(id: number): Promise<BookingDto> {
  const res = await authFetch(`${API_BASE}/bookings/${id}/pickup`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const booking = unwrapApiData<BookingDto>(payload)
  if (!booking) throw new Error('Phản hồi nhận xe không hợp lệ.')
  return booking
}

export async function returnBooking(id: number): Promise<BookingDto> {
  const res = await authFetch(`${API_BASE}/bookings/${id}/return`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const booking = unwrapApiData<BookingDto>(payload)
  if (!booking) throw new Error('Phản hồi trả xe không hợp lệ.')
  return booking
}

/** Đánh giá xe sau booking COMPLETED (ảnh optional qua upload riêng). */
export type BookingVehicleFeedbackDto = {
  id: number
  bookingId: number
  vehicleId: number
  vehicleRating: number
  comment: string | null
  photoUrls: string[] | null
  createdAt: string | null
}

export const MAX_BOOKING_FEEDBACK_PHOTOS = 8

/** null = chưa có đánh giá (404). */
export async function fetchMyBookingVehicleFeedback(
  bookingId: number,
): Promise<BookingVehicleFeedbackDto | null> {
  const res = await authFetch(`${API_BASE}/bookings/${bookingId}/feedback/me`)
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BookingVehicleFeedbackDto>(payload)
  if (!data) return null
  return data
}

export async function uploadBookingFeedbackPhoto(
  bookingId: number,
  file: File,
): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await authFetch(`${API_BASE}/bookings/${bookingId}/feedback/photos`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const wrapped = unwrapApiData<{ url?: string }>(payload)
  const url = wrapped?.url?.trim()
  if (!url) throw new Error('Phản hồi upload ảnh đánh giá không hợp lệ.')
  return url
}

export async function submitBookingVehicleFeedback(
  bookingId: number,
  body: {
    vehicleRating: number
    comment?: string | null
    photoUrls?: string[]
  },
): Promise<BookingVehicleFeedbackDto> {
  const res = await authFetch(`${API_BASE}/bookings/${bookingId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleRating: body.vehicleRating,
      comment: body.comment ?? null,
      photoUrls: body.photoUrls?.length ? body.photoUrls : undefined,
    }),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BookingVehicleFeedbackDto>(payload)
  if (!data) throw new Error('Phản hồi gửi đánh giá không hợp lệ.')
  return data
}

export async function cancelBooking(id: number): Promise<BookingDto> {
  const res = await authFetch(`${API_BASE}/bookings/${id}/cancel`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const booking = unwrapApiData<BookingDto>(payload)
  if (!booking) throw new Error('Phản hồi hủy booking không hợp lệ.')
  return booking
}

export function formatBookingMoney(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫'
}

/** API trả `yyyy-MM-ddTHH:mm:ss` → `yyyy-MM-ddTHH:mm` cho input datetime-local (không đổi múi giờ). */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return ''
  return `${m[1]}T${m[2]}:${m[3]}`
}

/** Gửi backend LocalDateTime dạng `yyyy-MM-ddTHH:mm:ss` (không đổi múi giờ). */
export function fromDateTimeLocalValue(v: string): string {
  const t = v.trim()
  if (!t) return ''
  return t.length === 16 ? `${t}:00` : t
}
