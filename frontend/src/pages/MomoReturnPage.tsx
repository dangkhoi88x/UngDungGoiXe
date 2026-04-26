import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { confirmMomoReturnFromSearch } from '../api/momoConfirm'
import TopNav from '../components/TopNav'
import './UserAccountPage.css'
import './MomoReturnPage.css'

type ParsedMomoReturn = {
  resultCode: string | null
  orderId: string | null
  message: string | null
  requestId: string | null
  transId: string | null
  amount: string | null
  payType: string | null
}

function parseMomoReturnSearch(search: string): ParsedMomoReturn {
  const q = new URLSearchParams(search)
  const fromQuery = (k: string) => q.get(k)
  const flat: ParsedMomoReturn = {
    resultCode: fromQuery('resultCode'),
    orderId: fromQuery('orderId'),
    message: fromQuery('message'),
    requestId: fromQuery('requestId'),
    transId: fromQuery('transId'),
    amount: fromQuery('amount'),
    payType: fromQuery('payType'),
  }

  const data = fromQuery('data')
  if (!data) return flat
  try {
    const b64 = data.trim().replace(/-/g, '+').replace(/_/g, '/')
    const padLen = (4 - (b64.length % 4)) % 4
    const raw = atob(b64 + '='.repeat(padLen))
    const json = JSON.parse(raw) as Record<string, unknown>
    const str = (v: unknown) => (v == null ? null : String(v))
    return {
      resultCode: str(json.resultCode) ?? flat.resultCode,
      orderId: str(json.orderId) ?? flat.orderId,
      message: str(json.message) ?? flat.message,
      requestId: str(json.requestId) ?? flat.requestId,
      transId: str(json.transId) ?? flat.transId,
      amount: str(json.amount) ?? flat.amount,
      payType: str(json.payType) ?? flat.payType,
    }
  } catch {
    return flat
  }
}

function formatVnd(raw: string | null): string {
  if (!raw) return '—'
  const n = Number(raw)
  if (!Number.isFinite(n)) return `${raw} ₫`
  return `${new Intl.NumberFormat('vi-VN').format(n)} ₫`
}

export default function MomoReturnPage() {
  const { search } = useLocation()
  const p = parseMomoReturnSearch(search)
  const ok = p.resultCode === '0'
  const syncOnceRef = useRef(false)

  useEffect(() => {
    if (!ok || syncOnceRef.current) return
    syncOnceRef.current = true
    void confirmMomoReturnFromSearch(search).catch(() => {
      syncOnceRef.current = false
    })
  }, [ok, search])
  const payTypeLabel =
    p.payType === 'napas'
      ? 'Thẻ ATM / Napas'
      : p.payType === 'qr'
        ? 'QR'
        : p.payType === 'webApp'
          ? 'Ví MoMo'
          : p.payType || '—'

  return (
    <div className="momo-return-shell uacc">
      <TopNav solid />
      <main className="momo-return">
        <section className={`momo-return__card${ok ? '' : ' is-error'}`}>
          <div className={`momo-return__badge${ok ? '' : ' is-error'}`} aria-hidden>
            {ok ? '✓' : '!'}
          </div>

          <h1 className="momo-return__title">
            {ok ? 'Thanh toán MoMo thành công' : 'Thanh toán MoMo chưa thành công'}
          </h1>
          <p className="momo-return__desc">
            {p.message ||
              (ok
                ? 'Giao dịch của bạn đã được ghi nhận. Hệ thống sẽ cập nhật booking tự động.'
                : 'Bạn có thể thử lại thanh toán hoặc kiểm tra trạng thái tại lịch sử đơn.')}
          </p>

          <div className="momo-return__amount">{formatVnd(p.amount)}</div>

          <dl className="momo-return__meta">
            <div>
              <dt>Mã đơn</dt>
              <dd>{p.orderId || '—'}</dd>
            </div>
            <div>
              <dt>Request ID</dt>
              <dd>{p.requestId || '—'}</dd>
            </div>
            <div>
              <dt>Result code</dt>
              <dd>{p.resultCode || '—'}</dd>
            </div>
            <div>
              <dt>Loại thanh toán</dt>
              <dd>{payTypeLabel}</dd>
            </div>
            <div>
              <dt>Mã giao dịch MoMo</dt>
              <dd>{p.transId || '—'}</dd>
            </div>
          </dl>

          <div className="momo-return__actions">
            <Link to="/account/orders" className="momo-return__btn momo-return__btn--primary">
              Xem Order History
            </Link>
            <Link to="/rent" className="momo-return__btn momo-return__btn--ghost">
              Thuê xe tiếp
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
