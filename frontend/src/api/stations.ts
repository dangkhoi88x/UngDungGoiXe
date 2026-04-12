import { parseApiError } from './vehicles'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type StationDto = {
  id: number
  name: string
  address?: string | null
  hotline?: string | null
  status?: string | null
  rating?: number | null
  photo?: string | null
  /** ISO local time từ API, ví dụ "08:00:00" */
  startTime?: string | null
  endTime?: string | null
}

export type StationCreatePayload = {
  name: string
  address: string
  hotline?: string | null
  photo?: string | null
  startTime?: string | null
  endTime?: string | null
}

export type StationUpdatePayload = {
  name?: string | null
  address?: string | null
  hotline?: string | null
  photo?: string | null
  status?: string | null
  startTime?: string | null
  endTime?: string | null
}

export async function fetchStations(): Promise<StationDto[]> {
  const res = await fetch(`${API_BASE}/stations`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data as StationDto[]
}

export async function fetchStationById(id: number): Promise<StationDto> {
  const res = await fetch(`${API_BASE}/stations/${id}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as StationDto
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
  return (await res.json()) as StationDto
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
  return (await res.json()) as StationDto
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
