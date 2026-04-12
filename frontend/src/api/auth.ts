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
  accessToken: string
  refreshToken?: string
}

export type ApiErrorShape = { code?: number; message?: string }

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { message: text }
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as ApiErrorShape).message
    if (typeof m === 'string' && m.length > 0) return m
  }
  return fallback
}

export async function loginRequest(body: LoginBody): Promise<AuthLoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(getErrorMessage(data, res.status === 401 ? 'Email hoặc mật khẩu không đúng.' : 'Đăng nhập thất bại.'))
  }
  const o = data as Record<string, unknown>
  return {
    userId: Number(o.userId),
    accessToken: String(o.accessToken ?? ''),
    refreshToken: o.refreshToken != null ? String(o.refreshToken) : undefined,
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
    throw new Error(getErrorMessage(data, 'Đăng ký thất bại.'))
  }
}
