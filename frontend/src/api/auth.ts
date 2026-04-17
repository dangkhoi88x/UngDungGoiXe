import { getApiMessage, parseJsonSafe, unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

type LoginBody = { email: string; password: string }
type RegisterBody = {
  email: string
  password: string
  firstName: string
  lastName: string
}

export type AuthLoginResult = {
  userId: number
  firstName: string
  lastName: string
  accessToken: string
  refreshToken?: string
}

/** Giải mã payload JWT (không verify chữ ký — chỉ dùng cho điều hướng UI sau đăng nhập). */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const seg = token.split('.')[1]
    if (!seg) return null
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Claim `roles` trong access token (chuỗi Spring: ROLE_ADMIN, ROLE_USER, …). */
export function rolesFromJwt(token: string | undefined | null): string[] {
  if (!token) return []
  const payload = parseJwtPayload(token)
  const raw = payload?.roles
  if (!Array.isArray(raw)) return []
  return raw.map(String)
}

export async function loginRequest(body: LoginBody): Promise<AuthLoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(getApiMessage(data, res.status === 401 ? 'Email hoặc mật khẩu không đúng.' : 'Đăng nhập thất bại.'))
  }
  const o = unwrapApiData<Record<string, unknown>>(data) ?? {}
  return {
    userId: Number(o.userId),
    firstName: typeof o.firstName === 'string' ? o.firstName : '',
    lastName: typeof o.lastName === 'string' ? o.lastName : '',
    accessToken: String(o.accessToken ?? ''),
    refreshToken: o.refreshToken != null ? String(o.refreshToken) : undefined,
  }
}

export async function refreshAccessToken(): Promise<AuthLoginResult> {
  const res = await fetch(`${API_BASE}/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  })

  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(getApiMessage(data, 'Refresh token không hợp lệ.'))
  }

  const o = unwrapApiData<Record<string, unknown>>(data) ?? {}
  return {
    userId: Number(o.userId),
    firstName: typeof o.firstName === 'string' ? o.firstName : '',
    lastName: typeof o.lastName === 'string' ? o.lastName : '',
    accessToken: String(o.accessToken ?? ''),
  }
}

/** Lưu tên hiển thị sau đăng nhập (đọc ở landing header, v.v.). */
export function persistUserDisplayName(firstName: string, lastName: string): void {
  const name = [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(' ')
  if (name) localStorage.setItem('userDisplayName', name)
  else localStorage.removeItem('userDisplayName')
}

export async function registerRequest(body: RegisterBody): Promise<void> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(getApiMessage(data, 'Đăng ký thất bại.'))
  }
}
