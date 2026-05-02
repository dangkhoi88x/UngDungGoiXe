import {
  parseApiErrorFromResponse,
  unwrapApiData,
} from './apiResponse'
import { authFetch } from './authFetch'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/** Khớp mặc định backend: app.owner-vehicle-upload.max-file-size-bytes (6MiB) */
export const MAX_VEHICLE_PHOTO_UPLOAD_BYTES = Number(
  import.meta.env.VITE_MAX_VEHICLE_PHOTO_BYTES ?? 6291456,
)

const VEHICLE_PHOTO_ACCEPT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

export function validateVehiclePhotoFileClient(file: File): string | null {
  if (!VEHICLE_PHOTO_ACCEPT_TYPES.has(file.type.trim().toLowerCase())) {
    return 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.'
  }
  if (file.size > MAX_VEHICLE_PHOTO_UPLOAD_BYTES) {
    const mb = MAX_VEHICLE_PHOTO_UPLOAD_BYTES / (1024 * 1024)
    return `Ảnh quá lớn (tối đa khoảng ${mb.toFixed(1)} MB).`
  }
  return null
}

/** Upload ảnh xe (Cloudinary); yêu cầu JWT — admin hoặc chủ xe đã duyệt. */
export async function uploadVehiclePhoto(
  vehicleId: number,
  file: File,
): Promise<string> {
  const clientErr = validateVehiclePhotoFileClient(file)
  if (clientErr) throw new Error(clientErr)

  const body = new FormData()
  body.append('file', file)

  const res = await authFetch(`${API_BASE}/vehicles/${vehicleId}/photos`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    throw new Error(await parseVehiclePhotoUploadError(res))
  }

  const payload = (await res.json()) as unknown
  const data = unwrapApiData<{ url?: string }>(payload)
  const url = data?.url
  if (!url || typeof url !== 'string') {
    throw new Error('Phản hồi upload không chứa URL.')
  }
  return url
}

async function parseVehiclePhotoUploadError(res: Response): Promise<string> {
  const base = await parseApiErrorFromResponse(res)
  if (res.status === 401) {
    return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
  }
  if (res.status === 403) {
    return base.includes('Forbidden') || base.startsWith('Lỗi')
      ? 'Bạn không có quyền tải ảnh cho xe này (chỉ admin hoặc chủ xe đã được duyệt).'
      : base
  }
  if (res.status === 404) {
    return 'Không tìm thấy xe.'
  }
  if (res.status === 413) {
    return `File vượt giới hạn máy chủ (tối đa khoảng ${(
      MAX_VEHICLE_PHOTO_UPLOAD_BYTES /
      (1024 * 1024)
    ).toFixed(1)} MB).`
  }
  return base
}

export type VehicleDto = {
  id: number
  stationId: number
  licensePlate: string
  name: string
  brand: string
  ownerEmail?: string | null
  fuelType: string | null
  rating: number | null
  capacity: number | null
  rentCount: number | null
  photos: string[] | null
  status: string
  hourlyRate: string | number | null
  dailyRate: string | number | null
  depositAmount: string | number | null
  policies: string[] | null
}

function parseNum(v: string | number | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

export type PagedVehiclesResponse = {
  content: VehicleDto[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

/** Admin: phân trang + sort + lọc (JWT). */
export async function fetchVehiclesPage(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  stationId?: number
  status?: string
  fuelType?: string
  keyword?: string
}): Promise<PagedVehiclesResponse> {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 10))
  q.set('sortBy', params.sortBy ?? 'id')
  q.set('sortDir', params.sortDir ?? 'desc')
  if (params.stationId != null && params.stationId > 0) {
    q.set('stationId', String(params.stationId))
  }
  if (params.status) q.set('status', params.status)
  if (params.fuelType) q.set('fuelType', params.fuelType)
  if (params.keyword != null && params.keyword.trim() !== '') {
    q.set('keyword', params.keyword.trim())
  }
  const res = await authFetch(`${API_BASE}/vehicles/paged?${q}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const paged = unwrapApiData<PagedVehiclesResponse>(payload)
  if (!paged) throw new Error('Phản hồi danh sách xe không hợp lệ.')
  return paged
}

export async function fetchAllVehicles(): Promise<VehicleDto[]> {
  const res = await fetch(`${API_BASE}/vehicles`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const list = unwrapApiData<unknown>(payload)
  if (!Array.isArray(list)) return []
  return list as VehicleDto[]
}

export async function fetchAvailableVehicles(): Promise<VehicleDto[]> {
  const res = await fetch(`${API_BASE}/vehicles?status=AVAILABLE`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const list = unwrapApiData<unknown>(payload)
  if (!Array.isArray(list)) return []
  return list as VehicleDto[]
}

export async function parseApiError(res: Response): Promise<string> {
  return parseApiErrorFromResponse(res)
}

export type VehicleWritePayload = {
  stationId: number
  licensePlate: string
  name?: string | null
  brand?: string | null
  fuelType?: string | null
  rating?: number | null
  capacity?: number | null
  rentCount?: number | null
  photos?: string[] | null
  policies?: string[] | null
  status?: string | null
  hourlyRate?: number | null
  dailyRate?: number | null
  depositAmount?: number | null
}

export async function createVehicle(
  payload: VehicleWritePayload,
): Promise<VehicleDto> {
  const res = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const body = (await res.json()) as unknown
  const vehicle = unwrapApiData<VehicleDto>(body)
  if (!vehicle) throw new Error('Phản hồi tạo xe không hợp lệ.')
  return vehicle
}

export async function updateVehicle(
  id: number,
  payload: VehicleWritePayload,
): Promise<VehicleDto> {
  const res = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const body = (await res.json()) as unknown
  const vehicle = unwrapApiData<VehicleDto>(body)
  if (!vehicle) throw new Error('Phản hồi cập nhật xe không hợp lệ.')
  return vehicle
}

export async function deleteVehicle(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
}

export async function fetchVehicleById(id: number): Promise<VehicleDto> {
  const res = await fetch(`${API_BASE}/vehicles/${id}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const body = (await res.json()) as unknown
  const vehicle = unwrapApiData<VehicleDto>(body)
  if (!vehicle) throw new Error('Phản hồi chi tiết xe không hợp lệ.')
  return vehicle
}

export function formatDailyPrice(v: VehicleDto): string {
  const d = parseNum(v.dailyRate)
  if (d == null || d <= 0) return 'Liên hệ'
  return new Intl.NumberFormat('vi-VN').format(d) + ' ₫'
}

export function formatHourlyPrice(v: VehicleDto): string {
  const h = parseNum(v.hourlyRate)
  if (h == null || h <= 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(h) + ' ₫/giờ'
}

export function formatDeposit(v: VehicleDto): string {
  const d = parseNum(v.depositAmount)
  if (d == null || d <= 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(d) + ' ₫'
}

export function vehicleDisplayName(v: VehicleDto): string {
  const b = (v.brand || '').trim()
  const n = (v.name || '').trim()
  if (b && n) return `${b} ${n}`
  return n || b || v.licensePlate || 'Xe'
}

export type VehicleCategory = 'Hatchback' | 'Minivan' | 'SUV' | 'Sedan' | 'MPV'

export function inferCategory(v: VehicleDto): VehicleCategory {
  const n = (v.name || '').toLowerCase()
  const cap = v.capacity ?? 0
  if (n.includes('suv') || n.includes('fortuner') || n.includes('cx-5') || n.includes('nx'))
    return 'SUV'
  if (n.includes('alphard') || n.includes('veloz') || n.includes('staria') || cap >= 7)
    return 'Minivan'
  if (n.includes('mpv') || n.includes('innova') || cap === 6) return 'MPV'
  if (
    n.includes('yaris') ||
    n.includes('i10') ||
    n.includes('fadil') ||
    n.includes('morning') ||
    (cap > 0 && cap <= 4)
  )
    return 'Hatchback'
  return 'Sedan'
}

export function fuelLabel(fuel: string | null | undefined): string {
  if (!fuel) return '—'
  if (fuel === 'GASOLINE') return 'Xăng'
  if (fuel === 'ELECTRICITY') return 'Điện'
  if (fuel === 'DIESEL') return 'Dầu'
  return fuel
}

export function vehiclePolicyLabel(policy: string | null | undefined): string {
  if (!policy) return '—'
  const key = policy.trim().toUpperCase()
  if (key === 'NO_SMOKING') return 'Không hút thuốc trong xe'
  if (key === 'LATE_RETURN_SURCHARGE') return 'Trả xe trễ sẽ bị tính phụ phí theo giờ/ngày'
  if (key === 'EXTENSION_REQUIRES_APPROVAL')
    return 'Muốn gia hạn phải thông báo trước và được bên cho thuê đồng ý'
  if (key === 'NO_SUBLEASING') return 'Không cho người khác thuê lại nếu chưa được phép'
  if (key === 'PET_POLICY') return 'Quy định về thú cưng'
  if (key === 'HOME_DELIVERY_SURCHARGE') return 'Phụ phí giao xe tận nơi'
  if (key === 'FREE_CANCELLATION_FEE') return 'Miễn phí phí hủy đặt xe'
  if (key === 'DEPOSIT_FORFEIT_CANCELLATION_FEE') return 'Mất cọc phí hủy đặt xe'
  if (key === 'ADDITIONAL_DRIVER_FEE') return 'Tính phí người lái phụ'
  return policy
}
