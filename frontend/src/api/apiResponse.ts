export type ApiEnvelope<T> = {
  status?: string
  message?: string
  data?: T
  code?: number
  timestamp?: string
}

export async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { message: text }
  }
}

export function unwrapApiData<T>(payload: unknown): T | null {
  if (payload == null || typeof payload !== 'object') return null
  const obj = payload as ApiEnvelope<T>
  if ('data' in obj) return (obj.data ?? null) as T | null
  return payload as T
}

export function getApiMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const maybeMessage = (payload as { message?: unknown }).message
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage
    const maybeData = (payload as { data?: unknown }).data
    if (typeof maybeData === 'string' && maybeData.trim()) return maybeData
  }
  return fallback
}

export async function parseApiErrorFromResponse(res: Response): Promise<string> {
  const payload = await parseJsonSafe(res)
  return getApiMessage(payload, `Lỗi ${res.status}`)
}
