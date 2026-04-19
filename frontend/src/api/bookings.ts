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

export type PagedBookingsResponse = {
  content: BookingDto[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

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
  status?: string
}): string {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 10))
  q.set('sortBy', params.sortBy ?? 'id')
  q.set('sortDir', params.sortDir ?? 'desc')
  if (params.renterId != null) q.set('renterId', String(params.renterId))
  if (params.stationId != null) q.set('stationId', String(params.stationId))
  if (params.status && params.status !== '') q.set('status', params.status)
  return q.toString()
}

export async function fetchBookingsPaged(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  renterId?: number
  stationId?: number
  status?: string
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

/** Khớp `BookingService#calculateBasePrice`: max(1, floor(giờ)) × hourlyRate. */
export function computeBookingEstimate(
  vehicle: VehicleDto,
  startLocal: string,
  endLocal: string,
): { hours: number; subtotal: number } {
  const rateRaw = vehicle.hourlyRate
  const rate =
    rateRaw == null
      ? 0
      : typeof rateRaw === 'number'
        ? rateRaw
        : parseFloat(String(rateRaw))
  const hourly = Number.isFinite(rate) ? rate : 0
  if (!startLocal?.trim() || !endLocal?.trim()) return { hours: 0, subtotal: 0 }
  const start = new Date(startLocal)
  const end = new Date(endLocal)
  if (!(end.getTime() > start.getTime())) return { hours: 0, subtotal: 0 }
  const rawHours = Math.floor((end.getTime() - start.getTime()) / 3600000)
  const hours = Math.max(1, rawHours)
  return { hours, subtotal: hours * hourly }
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
