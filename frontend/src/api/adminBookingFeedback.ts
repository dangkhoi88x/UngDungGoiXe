import { authFetch } from './authFetch'
import { unwrapApiData } from './apiResponse'
import { parseApiError } from './vehicles'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type AdminBookingFeedbackRowDto = {
  id: number
  bookingId: number | null
  bookingCode: string | null
  vehicleId: number | null
  vehicleName: string | null
  renterId: number | null
  renterEmail: string | null
  renterDisplayName: string | null
  vehicleRating: number | null
  comment: string | null
  photoUrls: string[] | null
  createdAt: string | null
}

export type PagedAdminBookingFeedbackDto = {
  content: AdminBookingFeedbackRowDto[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export async function fetchAdminBookingFeedbacksPage(params: {
  page?: number
  size?: number
}): Promise<PagedAdminBookingFeedbackDto> {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 20))
  const res = await authFetch(`${API_BASE}/admin/booking-feedbacks?${q}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const paged = unwrapApiData<PagedAdminBookingFeedbackDto>(payload)
  if (!paged) throw new Error('Phản hồi danh sách đánh giá không hợp lệ.')
  return paged
}
