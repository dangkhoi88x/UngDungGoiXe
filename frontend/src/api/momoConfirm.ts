import { getApiMessage, parseJsonSafe } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/** Các field MoMo dùng cho HMAC IPN / redirect (camelCase như query returnUrl). */
export type MomoIpnLikePayload = {
  partnerCode?: string
  orderId: string
  requestId?: string
  amount?: number
  orderInfo?: string
  orderType?: string
  extraData?: string
  transId?: number
  resultCode?: number
  message?: string
  payType?: string
  responseTime?: number
  requestType?: string
  signature: string
}

function parseNum(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** Lấy payload từ query string returnUrl (và gộp thêm object trong `data` base64 nếu có). */
export function momoIpnPayloadFromSearch(search: string): MomoIpnLikePayload | null {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const signature = q.get('signature')
  const orderId = q.get('orderId')
  if (!signature || !orderId) return null

  const merged: Record<string, string> = {}
  const dataParam = q.get('data')
  if (dataParam) {
    try {
      const b64 = dataParam.trim().replace(/-/g, '+').replace(/_/g, '/')
      const padLen = (4 - (b64.length % 4)) % 4
      const decoded = atob(b64 + '='.repeat(padLen))
      const obj = JSON.parse(decoded) as Record<string, unknown>
      for (const [k, v] of Object.entries(obj)) {
        if (v == null) continue
        merged[k] = String(v)
      }
    } catch {
      // bỏ qua data lỗi
    }
  }
  q.forEach((value, key) => {
    merged[key] = value
  })

  const amount = parseNum(merged.amount)
  const transId = parseNum(merged.transId)
  const resultCode = parseNum(merged.resultCode)
  const responseTime = parseNum(merged.responseTime)

  return {
    partnerCode: merged.partnerCode,
    orderId: merged.orderId,
    requestId: merged.requestId,
    amount,
    orderInfo: merged.orderInfo,
    orderType: merged.orderType,
    extraData: merged.extraData ?? '',
    transId,
    resultCode,
    message: merged.message,
    payType: merged.payType,
    responseTime,
    requestType: merged.requestType,
    signature: merged.signature,
  }
}

/**
 * Gửi kết quả redirect MoMo lên backend (verify HMAC + cập nhật payment/booking).
 * Không cần JWT — an toàn nhờ chữ ký MoMo.
 */
export async function confirmMomoReturnFromSearch(search: string): Promise<void> {
  const payload = momoIpnPayloadFromSearch(search)
  if (!payload) return

  const res = await fetch(`${API_BASE}/momo/confirm-return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(getApiMessage(body, `Lỗi ${res.status}`))
  }
  if (body && typeof body === 'object' && (body as { status?: string }).status === 'error') {
    throw new Error(getApiMessage(body, 'Đồng bộ MoMo thất bại.'))
  }
}
