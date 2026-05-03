import { getApiMessage, parseJsonSafe, unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/** Cache: null = chua fetch, "" = da fetch nhung server tra rong. */
let googleOAuthClientIdCache: string | null | undefined

/**
 * Web Client ID cho nut Google: uu tien VITE_OAUTH_GOOGLE_ID; neu khong co thi goi backend
 * GET /auth/google-oauth-client-id (OAUTH_GOOGLE_ID / oauth2.google.client-id) — chi can cau hinh IntelliJ cho Spring.
 */
export async function resolveGoogleOAuthClientId(): Promise<string | null> {
  const fromEnv = import.meta.env.VITE_OAUTH_GOOGLE_ID?.trim()
  if (fromEnv) return fromEnv

  if (googleOAuthClientIdCache !== undefined) {
    return googleOAuthClientIdCache === '' ? null : googleOAuthClientIdCache
  }

  try {
    const res = await fetch(`${API_BASE}/auth/google-oauth-client-id`, {
      method: 'GET',
      credentials: 'omit',
    })
    const data = await parseJsonSafe(res)
    if (!res.ok) {
      googleOAuthClientIdCache = ''
      return null
    }
    const o = unwrapApiData<Record<string, unknown>>(data)
    const id = typeof o?.clientId === 'string' ? o.clientId.trim() : ''
    googleOAuthClientIdCache = id
    return id === '' ? null : id
  } catch {
    googleOAuthClientIdCache = ''
    return null
  }
}

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

/** Đường dẫn sau khi đăng nhập thành công (admin → /admin, còn lại → /). */
export function getPostLoginPath(accessToken: string): string {
  const roles = rolesFromJwt(accessToken)
  const normalizedRoles = roles.map((r) => r.trim().toUpperCase())
  const isAdmin = normalizedRoles.some(
    (r) =>
      r === 'ROLE_ADMIN' ||
      r === 'ADMIN' ||
      r === 'ROLE_SUPER_ADMIN' ||
      r === 'SUPER_ADMIN' ||
      r.startsWith('ROLE_ADMIN'),
  )
  return isAdmin ? '/admin' : '/'
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

export async function logoutRequest(accessToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await parseJsonSafe(res)
    throw new Error(getApiMessage(data, 'Đăng xuất thất bại.'))
  }
}

/** Lưu tên hiển thị sau đăng nhập (đọc ở landing header, v.v.). */
export function persistUserDisplayName(firstName: string, lastName: string): void {
  const name = [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(' ')
  if (name) localStorage.setItem('userDisplayName', name)
  else localStorage.removeItem('userDisplayName')
}

export async function googleOAuthLoginRequest(body: {
  code: string
  redirectUri: string
}): Promise<AuthLoginResult> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(getApiMessage(data, 'Đăng nhập Google thất bại.'))
  }
  const o = unwrapApiData<Record<string, unknown>>(data) ?? {}
  return {
    userId: Number(o.userId),
    firstName: typeof o.firstName === 'string' ? o.firstName : '',
    lastName: typeof o.lastName === 'string' ? o.lastName : '',
    accessToken: String(o.accessToken ?? ''),
  }
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
