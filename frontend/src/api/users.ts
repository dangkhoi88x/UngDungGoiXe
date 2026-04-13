import { parseApiError } from './vehicles'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

function bearerHeaders(json = false): HeadersInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

/** Khớp `LicenseVerificationStatus` từ backend (JSON dạng chuỗi). */
export type LicenseVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'

export function licenseVerificationLabel(s: LicenseVerificationStatus | null | undefined): string {
  switch (s) {
    case 'APPROVED':
      return 'Đã xác minh'
    case 'PENDING':
      return 'Đã gửi — chờ admin duyệt'
    case 'REJECTED':
      return 'Từ chối — cập nhật và gửi lại'
    case 'NOT_SUBMITTED':
    default:
      return 'Chưa gửi hồ sơ'
  }
}

export type UserDto = {
  id: number
  email: string
  firstName: string
  lastName: string
  roles?: string[] | null
  /** Có trong JSON khi admin/paged trả về đủ trường UserResponse */
  licenseVerificationStatus?: LicenseVerificationStatus | null
}

/** Trả về từ GET /users/my-info (và có thể từ các endpoint user khác). */
export type UserProfileDto = UserDto & {
  phone?: string | null
  identityNumber?: string | null
  licenseNumber?: string | null
  licenseVerificationStatus?: LicenseVerificationStatus | null
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

/** PUT /users/my-profile — null = không gửi trường đó (giữ nguyên trên server). */
export type UpdateMyProfilePayload = {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
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
  licenseVerificationStatus?: LicenseVerificationStatus | null
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
  const res = await fetch(`${API_BASE}/users/paged?${q}`, {
    headers: bearerHeaders(),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as PagedUsersResponse
}

export async function fetchUserById(id: number): Promise<UserProfileDto> {
  const res = await fetch(`${API_BASE}/users/${id}`, { headers: bearerHeaders() })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as UserProfileDto
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
    headers: bearerHeaders(true),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  return (await res.json()) as UserDto
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
    headers: bearerHeaders(),
  })
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

export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<UserProfileDto> {
  const body: Record<string, string> = {}
  if (payload.firstName !== undefined && payload.firstName !== null) {
    body.firstName = payload.firstName
  }
  if (payload.lastName !== undefined && payload.lastName !== null) {
    body.lastName = payload.lastName
  }
  if (payload.phone !== undefined && payload.phone !== null) {
    body.phone = payload.phone
  }
  const res = await fetch(`${API_BASE}/users/my-profile`, {
    method: 'PUT',
    headers: bearerHeaders(true),
    body: JSON.stringify(body),
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
