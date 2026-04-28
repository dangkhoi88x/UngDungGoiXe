import { parseApiError } from './vehicles'
import { authFetch } from './authFetch'
import { unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

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

/** Cho phép đặt xe khi GPLX đã duyệt (APPROVED) hoặc đã gửi chờ admin (PENDING). */
export function isLicenseApprovedForRent(s: LicenseVerificationStatus | null | undefined): boolean {
  return s === 'APPROVED' || s === 'PENDING'
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

export type UserLicenseReviewHistoryDto = {
  id: number
  userId: number | null
  userEmail: string | null
  fromStatus: LicenseVerificationStatus | null
  toStatus: LicenseVerificationStatus | null
  adminId: number | null
  adminEmail: string | null
  note: string | null
  createdAt: string | null
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
  const res = await authFetch(`${API_BASE}/users/paged?${q}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const paged = unwrapApiData<PagedUsersResponse>(payload)
  if (!paged) throw new Error('Phản hồi danh sách người dùng không hợp lệ.')
  return paged
}

export async function fetchUserById(id: number): Promise<UserProfileDto> {
  const res = await authFetch(`${API_BASE}/users/${id}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const user = unwrapApiData<UserProfileDto>(payload)
  if (!user) throw new Error('Phản hồi người dùng không hợp lệ.')
  return user
}

export async function fetchUserLicenseReviewHistory(): Promise<UserLicenseReviewHistoryDto[]> {
  const res = await authFetch(`${API_BASE}/users/license-review-history`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const list = unwrapApiData<unknown>(payload)
  if (!Array.isArray(list)) return []
  return list as UserLicenseReviewHistoryDto[]
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
  const responsePayload = (await res.json()) as unknown
  const user = unwrapApiData<UserDto>(responsePayload)
  if (!user) throw new Error('Phản hồi tạo người dùng không hợp lệ.')
  return user
}

export async function updateUser(
  id: number,
  payload: UserUpdatePayload,
): Promise<UserDto> {
  const res = await authFetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const responsePayload = (await res.json()) as unknown
  const user = unwrapApiData<UserDto>(responsePayload)
  if (!user) throw new Error('Phản hồi cập nhật người dùng không hợp lệ.')
  return user
}

export async function deleteUser(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
}

export type ApiErrorWithStatus = Error & { status: number }

/** Gửi CMND/CCCD, số GPLX và ảnh 2 mặt (FormData: identityNumber, licenseNumber, frontImage, backImage). */
export async function submitMyDocuments(formData: FormData): Promise<UserProfileDto> {
  const res = await authFetch(`${API_BASE}/users/my-documents`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const message = await parseApiError(res)
    const err = new Error(message) as ApiErrorWithStatus
    err.status = res.status
    throw err
  }
  const payload = (await res.json()) as unknown
  const user = unwrapApiData<UserProfileDto>(payload)
  if (!user) throw new Error('Phản hồi gửi giấy tờ không hợp lệ.')
  return user
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
  const res = await authFetch(`${API_BASE}/users/my-profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const message = await parseApiError(res)
    const err = new Error(message) as ApiErrorWithStatus
    err.status = res.status
    throw err
  }
  const payloadData = (await res.json()) as unknown
  const user = unwrapApiData<UserProfileDto>(payloadData)
  if (!user) throw new Error('Phản hồi cập nhật hồ sơ không hợp lệ.')
  return user
}

export async function fetchMyInfo(): Promise<UserProfileDto> {
  const res = await authFetch(`${API_BASE}/users/my-info`)
  if (!res.ok) {
    const message = await parseApiError(res)
    const err = new Error(message) as ApiErrorWithStatus
    err.status = res.status
    throw err
  }
  const payload = (await res.json()) as unknown
  const user = unwrapApiData<UserProfileDto>(payload)
  if (!user) throw new Error('Phản hồi thông tin tài khoản không hợp lệ.')
  return user
}

export function userDisplayName(u: UserDto): string {
  const f = (u.firstName || '').trim()
  const l = (u.lastName || '').trim()
  if (f && l) return `${f} ${l}`
  return f || l || u.email || `#${u.id}`
}
