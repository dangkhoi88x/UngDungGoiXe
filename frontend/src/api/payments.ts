import { authFetch } from './authFetch'
import { parseApiErrorFromResponse, unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type PaymentPurpose = 'TOPUP' | 'REFUND'

export type PaymentDto = {
  id: number
  bookingId: number
  bookingCode: string
  amount: string | number
  paymentMethod: string | null
  paymentPurpose: string | null
  momoRequestType: string | null
  status: string
  processedById: number | null
  transactionId: string | null
  paidAt: string | null
  createdAt: string | null
}

export async function fetchPaymentsByBookingId(bookingId: number): Promise<PaymentDto[]> {
  const q = new URLSearchParams({ bookingId: String(bookingId) })
  const res = await authFetch(`${API_BASE}/payments?${q.toString()}`)
  if (!res.ok) {
    throw new Error(await parseApiErrorFromResponse(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<PaymentDto[]>(payload)
  if (!Array.isArray(data)) {
    throw new Error('Phan hoi danh sach thanh toan theo booking khong hop le.')
  }
  return data
}

export async function fetchPendingAdjustments(
  purpose: PaymentPurpose,
): Promise<PaymentDto[]> {
  const q = new URLSearchParams({ purpose })
  const res = await authFetch(`${API_BASE}/payments/pending-adjustments?${q.toString()}`)
  if (!res.ok) {
    throw new Error(await parseApiErrorFromResponse(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<PaymentDto[]>(payload)
  if (!Array.isArray(data)) {
    throw new Error('Phan hoi danh sach dieu chinh thanh toan khong hop le.')
  }
  return data
}

export async function confirmTopupPayment(id: number): Promise<PaymentDto> {
  const res = await authFetch(`${API_BASE}/payments/${id}/confirm-topup`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiErrorFromResponse(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<PaymentDto>(payload)
  if (!data || typeof data !== 'object') {
    throw new Error('Phan hoi xac nhan TOPUP khong hop le.')
  }
  return data
}

export async function confirmRefundPayment(id: number): Promise<PaymentDto> {
  const res = await authFetch(`${API_BASE}/payments/${id}/confirm-refund`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(await parseApiErrorFromResponse(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<PaymentDto>(payload)
  if (!data || typeof data !== 'object') {
    throw new Error('Phan hoi xac nhan REFUND khong hop le.')
  }
  return data
}
