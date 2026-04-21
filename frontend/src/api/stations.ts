import { parseApiError } from './vehicles'
import { unwrapApiData } from './apiResponse'
import { authFetch } from './authFetch'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type StationDto = {
  id: number
  name: string
  address?: string | null
  hotline?: string | null
  status?: string | null
  rating?: number | null
  photo?: string | null
  /** WGS84 — dùng marker Google Map; có thể null. */
  latitude?: number | null
  longitude?: number | null
  /** ISO local time từ API, ví dụ "08:00:00" */
  startTime?: string | null
  endTime?: string | null
}

export type StationCreatePayload = {
  name: string
  address: string
  hotline?: string | null
  photo?: string | null
  latitude?: number | null
  longitude?: number | null
  startTime?: string | null
  endTime?: string | null
}

export type StationUpdatePayload = {
  name?: string | null
  address?: string | null
  hotline?: string | null
  photo?: string | null
  latitude?: number | null
  longitude?: number | null
  /** Gửi true khi muốn xóa tọa độ (backend merge bỏ qua null). */
  clearCoordinates?: boolean | null
  status?: string | null
  startTime?: string | null
  endTime?: string | null
}

export type PagedStationsResponse = {
  content: StationDto[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

/** Admin: phân trang + sort + lọc (JWT). */
export async function fetchStationsPage(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  status?: string
  keyword?: string
}): Promise<PagedStationsResponse> {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 10))
  q.set('sortBy', params.sortBy ?? 'id')
  q.set('sortDir', params.sortDir ?? 'desc')
  if (params.status) q.set('status', params.status)
  if (params.keyword != null && params.keyword.trim() !== '') {
    q.set('keyword', params.keyword.trim())
  }
  const res = await authFetch(`${API_BASE}/stations/paged?${q}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const paged = unwrapApiData<PagedStationsResponse>(payload)
  if (!paged) throw new Error('Phản hồi danh sách trạm không hợp lệ.')
  return paged
}

export async function fetchStations(): Promise<StationDto[]> {
  const res = await fetch(`${API_BASE}/stations`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const list = unwrapApiData<unknown>(payload)
  if (!Array.isArray(list)) return []
  return list as StationDto[]
}

export async function fetchStationById(id: number): Promise<StationDto> {
  const res = await fetch(`${API_BASE}/stations/${id}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const station = unwrapApiData<StationDto>(payload)
  if (!station) throw new Error('Phản hồi trạm không hợp lệ.')
  return station
}

export async function createStation(
  payload: StationCreatePayload,
): Promise<StationDto> {
  const res = await fetch(`${API_BASE}/stations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const responsePayload = (await res.json()) as unknown
  const station = unwrapApiData<StationDto>(responsePayload)
  if (!station) throw new Error('Phản hồi tạo trạm không hợp lệ.')
  return station
}

export async function updateStation(
  id: number,
  payload: StationUpdatePayload,
): Promise<StationDto> {
  const res = await fetch(`${API_BASE}/stations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const responsePayload = (await res.json()) as unknown
  const station = unwrapApiData<StationDto>(responsePayload)
  if (!station) throw new Error('Phản hồi cập nhật trạm không hợp lệ.')
  return station
}

/** Backend đặt trạng thái INACTIVE (soft delete). */
export async function deleteStation(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/stations/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
}

export function stationLabel(s: StationDto): string {
  return s.name?.trim() || `Trạm #${s.id}`
}

/** Chuỗi "HH:mm:ss" hoặc "HH:mm" → giá trị cho input type="time" */
export function stationTimeToInput(v: string | null | undefined): string {
  if (v == null || v === '') return ''
  const s = String(v)
  return s.length >= 5 ? s.slice(0, 5) : s
}

/** Từ input time "HH:mm" → gửi API LocalTime */
export function stationTimeFromInput(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  return t.length === 5 ? `${t}:00` : t
}
