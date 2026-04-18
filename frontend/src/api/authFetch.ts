import { refreshAccessToken } from './auth'

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('accessToken')
  const headers = new Headers(init.headers ?? {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let res = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (res.status !== 401) return res

  try {
    const refreshed = await refreshAccessToken()
    localStorage.setItem('accessToken', refreshed.accessToken)

    const retryHeaders = new Headers(init.headers ?? {})
    retryHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`)

    res = await fetch(input, {
      ...init,
      headers: retryHeaders,
      credentials: 'include',
    })
    return res
  } catch {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userDisplayName')
    window.location.replace('/auth')
    throw new Error('Phiên đăng nhập đã hết hạn.')
  }
}
