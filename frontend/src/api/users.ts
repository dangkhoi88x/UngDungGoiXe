import { parseApiError } from './vehicles'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type UserDto = {
  id: number
  email: string
  firstName: string
  lastName: string
  roles?: string[] | null
  /** Có trong JSON khi admin/paged trả về đủ trường UserResponse */
  isLicenseVerified?: boolean | null
}

/** Trả về từ GET /users/my-info (và có thể từ các endpoint user khác). */
export type UserProfileDto = UserDto & {
  phone?: string | null
  identityNumber?: string | null
  licenseNumber?: string | null
  isLicenseVerified?: boolean | null
  licenseCardFrontImageUrl?: string | null
  licenseCardBackImageUrl?: string | null
  updatedAt?: string | null
  verifiedAt?: string | null
}

export type PagedUsersResponse = {
  content: UserDto[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export type UserCreatePayload = {
  email: string
  password: string
  firstName: string
  lastName: string
}

export type UserUpdatePayload = {
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  /** Để trống = không đổi mật khẩu */
  password?: string | null
  /** Admin: duyệt GPLX / sửa giấy tờ */
  identityNumber?: string | null
  licenseNumber?: string | null
  licenseCardFrontImageUrl?: string | null
  licenseCardBackImageUrl?: string | null
  isLicenseVerified?: boolean | null
}

export async function fetchUsersPage(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}): Promise<PagedUsersResponse> {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 10))
  q.set('sortBy', params.sortBy ?? 'id')
  q.set('sortDir', params.sortDir ?? 'desc')
  const res = await fetch(`${API_BASE}/users/paged?${q}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as PagedUsersResponse
}

export async function fetchUserById(id: number): Promise<UserDto> {
  const res = await fetch(`${API_BASE}/users/${id}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as UserDto
}

export async function createUser(
  payload: UserCreatePayload,
): Promise<UserDto> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as UserDto
}

export async function updateUser(
  id: number,
  payload: UserUpdatePayload,
): Promise<UserDto> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as UserDto
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
}

export type ApiErrorWithStatus = Error & { status: number }

/** Gửi CMND/CCCD, số GPLX và ảnh 2 mặt (FormData: identityNumber, licenseNumber, frontImage, backImage). */
export async function submitMyDocuments(formData: FormData): Promise<UserProfileDto> {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${API_BASE}/users/my-documents`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const message = await parseApiError(res)
    const err = new Error(message) as ApiErrorWithStatus
    err.status = res.status
    throw err
  }
  return (await res.json()) as UserProfileDto
}

export async function fetchMyInfo(): Promise<UserProfileDto> {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${API_BASE}/users/my-info`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const message = await parseApiError(res)
    const err = new Error(message) as ApiErrorWithStatus
    err.status = res.status
    throw err
  }
  return (await res.json()) as UserProfileDto
}

export function userDisplayName(u: UserDto): string {
  const f = (u.firstName || '').trim()
  const l = (u.lastName || '').trim()
  if (f && l) return `${f} ${l}`
  return f || l || u.email || `#${u.id}`
}
