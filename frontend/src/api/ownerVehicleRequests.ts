import { parseApiErrorFromResponse, unwrapApiData } from './apiResponse'
import { authFetch } from './authFetch'
import type { BookingDto } from './bookings'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type OwnerVehicleRequestStatus =
  | 'PENDING'
  | 'NEED_MORE_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export type OwnerVehicleRequestHistoryItemDto = {
  eventType?: string | null
  status?: OwnerVehicleRequestStatus | null
  actorRole?: string | null
  actorId?: number | null
  actorEmail?: string | null
  note?: string | null
  createdAt?: string | null
}

export type OwnerVehicleRequestDto = {
  id: number
  ownerId: number
  stationId: number
  approvedVehicleId?: number | null
  licensePlate: string
  name?: string | null
  brand?: string | null
  fuelType?: string | null
  capacity?: number | null
  hourlyRate?: number | string | null
  dailyRate?: number | string | null
  depositAmount?: number | string | null
  description?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  registrationDocUrl?: string | null
  insuranceDocUrl?: string | null
  photos?: string[] | null
  policies?: string[] | null
  status: OwnerVehicleRequestStatus
  adminNote?: string | null
  history?: OwnerVehicleRequestHistoryItemDto[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type AdminReviewPayload = {
  adminNote?: string | null
}

/** Khớp `com.example.ungdunggoixe.common.FuelType` */
export type OwnerVehicleFuelType = 'GASOLINE' | 'ELECTRICITY' | 'DIESEL'

/** Payload POST `/owner/vehicle-requests` */
export type CreateOwnerVehicleRequestPayload = {
  stationId: number
  licensePlate: string
  name: string
  brand: string
  fuelType: OwnerVehicleFuelType
  capacity?: number | null
  hourlyRate: number
  dailyRate: number
  depositAmount: number
  description?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  registrationDocUrl: string
  insuranceDocUrl: string
  photos: string[]
  policies?: string[] | null
}

/** Payload PUT `/owner/vehicle-requests/{id}` — chỉ gửi field cần đổi. */
export type UpdateOwnerVehicleRequestPayload = {
  stationId?: number | null
  licensePlate?: string | null
  name?: string | null
  brand?: string | null
  fuelType?: OwnerVehicleFuelType | null
  capacity?: number | null
  hourlyRate?: number | null
  dailyRate?: number | null
  depositAmount?: number | null
  description?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  registrationDocUrl?: string | null
  insuranceDocUrl?: string | null
  photos?: string[] | null
  policies?: string[] | null
}

async function parseApiError(res: Response): Promise<string> {
  return parseApiErrorFromResponse(res)
}

function parseOwnerVehicleRequestItem(body: unknown): OwnerVehicleRequestDto {
  const item = unwrapApiData<OwnerVehicleRequestDto>(body)
  if (!item || typeof item !== 'object' || typeof item.id !== 'number') {
    throw new Error('Phản hồi yêu cầu xe owner không hợp lệ.')
  }
  return item
}

export async function fetchAdminOwnerVehicleRequests(params?: {
  status?: OwnerVehicleRequestStatus | 'ALL'
}): Promise<OwnerVehicleRequestDto[]> {
  const q = new URLSearchParams()
  if (params?.status && params.status !== 'ALL') q.set('status', params.status)
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const res = await authFetch(`${API_BASE}/admin/vehicle-requests${suffix}`)
  if (!res.ok) throw new Error(await parseApiError(res))
  const payload = (await res.json()) as unknown
  const list = unwrapApiData<unknown>(payload)
  if (!Array.isArray(list)) return []
  return list as OwnerVehicleRequestDto[]
}

export async function approveOwnerVehicleRequest(
  id: number,
  payload: AdminReviewPayload,
): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(`${API_BASE}/admin/vehicle-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseApiError(res))
  const body = (await res.json()) as unknown
  const item = unwrapApiData<OwnerVehicleRequestDto>(body)
  if (!item) throw new Error('Phản hồi duyệt request không hợp lệ.')
  return item
}

export async function rejectOwnerVehicleRequest(
  id: number,
  payload: AdminReviewPayload,
): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(`${API_BASE}/admin/vehicle-requests/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseApiError(res))
  const body = (await res.json()) as unknown
  const item = unwrapApiData<OwnerVehicleRequestDto>(body)
  if (!item) throw new Error('Phản hồi từ chối request không hợp lệ.')
  return item
}

export async function needMoreInfoOwnerVehicleRequest(
  id: number,
  payload: AdminReviewPayload,
): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(
    `${API_BASE}/admin/vehicle-requests/${id}/need-more-info`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) throw new Error(await parseApiError(res))
  const body = (await res.json()) as unknown
  const item = unwrapApiData<OwnerVehicleRequestDto>(body)
  if (!item) throw new Error('Phản hồi request need-more-info không hợp lệ.')
  return item
}

const OWNER_VEHICLE_REQUESTS = `${API_BASE}/owner/vehicle-requests`

export async function createOwnerVehicleRequest(
  payload: CreateOwnerVehicleRequestPayload,
): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(OWNER_VEHICLE_REQUESTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseApiError(res))
  return parseOwnerVehicleRequestItem(await res.json())
}

export async function fetchMyOwnerVehicleRequests(): Promise<OwnerVehicleRequestDto[]> {
  const res = await authFetch(OWNER_VEHICLE_REQUESTS)
  if (!res.ok) throw new Error(await parseApiError(res))
  const payload = (await res.json()) as unknown
  const list = unwrapApiData<unknown>(payload)
  if (!Array.isArray(list)) return []
  return list as OwnerVehicleRequestDto[]
}

export async function fetchMyOwnerVehicleRequestById(
  id: number,
): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(`${OWNER_VEHICLE_REQUESTS}/${id}`)
  if (!res.ok) throw new Error(await parseApiError(res))
  return parseOwnerVehicleRequestItem(await res.json())
}

export async function updateOwnerVehicleRequest(
  id: number,
  payload: UpdateOwnerVehicleRequestPayload,
): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(`${OWNER_VEHICLE_REQUESTS}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseApiError(res))
  return parseOwnerVehicleRequestItem(await res.json())
}

export async function resubmitOwnerVehicleRequest(id: number): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(`${OWNER_VEHICLE_REQUESTS}/${id}/resubmit`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await parseApiError(res))
  return parseOwnerVehicleRequestItem(await res.json())
}

export async function cancelOwnerVehicleRequest(id: number): Promise<OwnerVehicleRequestDto> {
  const res = await authFetch(`${OWNER_VEHICLE_REQUESTS}/${id}/cancel`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await parseApiError(res))
  return parseOwnerVehicleRequestItem(await res.json())
}

export async function fetchMyOwnerRequestBookings(id: number): Promise<BookingDto[]> {
  const res = await authFetch(`${OWNER_VEHICLE_REQUESTS}/${id}/bookings`)
  if (!res.ok) throw new Error(await parseApiError(res))
  const payload = (await res.json()) as unknown
  const list = unwrapApiData<unknown>(payload)
  if (!Array.isArray(list)) return []
  return list as BookingDto[]
}
