import { parseApiError } from './vehicles'

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
  const res = await fetch(
    `${API_BASE}/bookings/paged?${buildPagedQuery(params)}`,
  )
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as PagedBookingsResponse
}

export async function createBooking(
  payload: BookingCreatePayload,
): Promise<BookingDto> {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as BookingDto
}

export async function updateBooking(
  id: number,
  payload: BookingUpdatePayload,
): Promise<BookingDto> {
  const res = await fetch(`${API_BASE}/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as BookingDto
}

export async function deleteBooking(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/bookings/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
}

export async function confirmBooking(id: number): Promise<BookingDto> {
  const res = await fetch(`${API_BASE}/bookings/${id}/confirm`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as BookingDto
}

export async function pickupBooking(id: number): Promise<BookingDto> {
  const res = await fetch(`${API_BASE}/bookings/${id}/pickup`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as BookingDto
}

export async function returnBooking(id: number): Promise<BookingDto> {
  const res = await fetch(`${API_BASE}/bookings/${id}/return`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as BookingDto
}

export async function cancelBooking(id: number): Promise<BookingDto> {
  const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as BookingDto
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
