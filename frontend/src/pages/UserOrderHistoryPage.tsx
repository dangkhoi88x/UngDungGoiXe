import { useEffect, useMemo, useState } from 'react'
import { fetchMyBookings, formatBookingMoney, type BookingDto } from '../api/bookings'
import { fetchPaymentsByBookingId, type PaymentDto } from '../api/payments'
import TopNav from '../components/TopNav'
import './studio-x-landing-page.css'
import './UserOrderHistoryPage.css'

type HistoryTab = 'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'

type RowWithPayments = {
  booking: BookingDto
  payments: PaymentDto[]
}

function rentalStatusVi(status: string | null | undefined): string {
  if (!status) return '—'
  const map: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    ONGOING: 'Đang thuê',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy',
  }
  return map[status] ?? status
}

function toTab(status: string | null | undefined): Exclude<HistoryTab, 'ALL'> {
  if (status === 'CANCELLED') return 'CANCELLED'
  if (status === 'COMPLETED') return 'COMPLETED'
  return 'PENDING'
}

function paymentMethodVi(payments: PaymentDto[]): string {
  const labels = new Set<string>()
  for (const p of payments) {
    const method = String(p.paymentMethod || '').toUpperCase()
    if (method === 'CASH') {
      labels.add('Tiền mặt')
      continue
    }
    if (method === 'MOMO') {
      const rt = String(p.momoRequestType || '').trim()
      if (rt === 'payWithATM') labels.add('MoMo ATM')
      else labels.add('MoMo Ví')
    }
  }
  if (!labels.size) return '—'
  return Array.from(labels).join(' + ')
}

function adjustmentStatus(payments: PaymentDto[]): string {
  const adj = payments.filter((p) => {
    const purpose = String(p.paymentPurpose || '').toUpperCase()
    return purpose === 'TOPUP' || purpose === 'REFUND'
  })
  if (!adj.length) return 'Không phát sinh'
  return adj
    .map((p) => {
      const purpose = String(p.paymentPurpose || '').toUpperCase()
      const st = String(p.status || '').toUpperCase()
      const label = purpose === 'TOPUP' ? 'TOPUP' : 'REFUND'
      const status = st === 'PAID' ? 'đã xử lý' : st === 'PENDING' ? 'chờ xử lý' : st.toLowerCase()
      return `${label}: ${status}`
    })
    .join(' | ')
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

function moneyToNumber(v: string | number | null | undefined): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function bookingAnchorDate(booking: BookingDto): Date | null {
  const base = booking.startTime || booking.createdAt || booking.expectedEndTime
  if (!base) return null
  const d = new Date(base)
  return Number.isNaN(d.getTime()) ? null : d
}

function bookingDayMeta(booking: BookingDto): { month: string; weekday: string; day: string } {
  const d = bookingAnchorDate(booking)
  if (!d) return { month: '—', weekday: '—', day: '—' }
  const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const day = String(d.getDate())
  return { month, weekday, day }
}

function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

function bookingDateTimeRange(booking: BookingDto): string {
  return `${dateTimeLabel(booking.startTime)} - ${dateTimeLabel(booking.expectedEndTime)}`
}

function paidBadge(payments: PaymentDto[]): 'PAID' | 'UNPAID' {
  const hasPaid = payments.some((p) => String(p.status || '').toUpperCase() === 'PAID')
  return hasPaid ? 'PAID' : 'UNPAID'
}

export default function UserOrderHistoryPage() {
  const [rows, setRows] = useState<RowWithPayments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<HistoryTab>('ALL')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const bookings = await fetchMyBookings()
        const paymentsList = await Promise.all(
          bookings.map(async (b) => {
            try {
              return await fetchPaymentsByBookingId(b.id)
            } catch {
              return [] as PaymentDto[]
            }
          }),
        )
        if (!cancelled) {
          setRows(bookings.map((booking, i) => ({ booking, payments: paymentsList[i] || [] })))
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được lịch sử đơn.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const counters = useMemo(() => {
    let pending = 0
    let completed = 0
    let cancelled = 0
    for (const r of rows) {
      const tab = toTab(r.booking.status)
      if (tab === 'PENDING') pending += 1
      if (tab === 'COMPLETED') completed += 1
      if (tab === 'CANCELLED') cancelled += 1
    }
    return {
      ALL: rows.length,
      PENDING: pending,
      COMPLETED: completed,
      CANCELLED: cancelled,
    }
  }, [rows])

  const visible = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const ta = a.booking.createdAt ? new Date(a.booking.createdAt).getTime() : 0
      const tb = b.booking.createdAt ? new Date(b.booking.createdAt).getTime() : 0
      return tb - ta
    })
    if (activeTab === 'ALL') return sorted
    return sorted.filter((r) => toTab(r.booking.status) === activeTab)
  }, [rows, activeTab])

  return (
    <div className="sx-page uoh-page">
      <TopNav solid showSearch={false} />
      <main className="uoh-main">
        <header className="uoh-head">
          <div>
            <h1>Order History</h1>
            <p>Lịch sử các đơn đặt xe bạn đã giao dịch.</p>
          </div>
          <div className="uoh-actions">
            <a className="uoh-btn uoh-btn--ghost" href="/owner/vehicle-requests">
              Lịch sử cho thuê xe
            </a>
            <a className="uoh-btn uoh-btn--primary" href="/rent">
              View Order
            </a>
          </div>
        </header>

        <nav className="uoh-tabs" aria-label="Order status tabs">
          {([
            ['ALL', 'All Order'],
            ['PENDING', 'Pending'],
            ['COMPLETED', 'Completed'],
            ['CANCELLED', 'Cancelled'],
          ] as Array<[HistoryTab, string]>).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`uoh-tab${activeTab === tab ? ' is-active' : ''}`}
            >
              {label}({counters[tab]})
            </button>
          ))}
        </nav>

        {loading ? <p className="uoh-note">Đang tải lịch sử đơn…</p> : null}
        {error ? <p className="uoh-note uoh-note--error">{error}</p> : null}
        {!loading && !error && visible.length === 0 ? <p className="uoh-note">Không có đơn nào trong tab này.</p> : null}

        {!loading && !error && visible.length > 0 ? (
          <section className="uoh-booking-list" aria-label="My booking history">
            {visible.map(({ booking, payments }) => {
              const total = moneyToNumber(booking.totalAmount)
              const paid = moneyToNumber(booking.partiallyPaid)
              const remaining = Math.max(0, total - paid)
              const dayMeta = bookingDayMeta(booking)
              const badge = paidBadge(payments)
              const confirmed = payments.filter((p) => String(p.status || '').toUpperCase() === 'PAID').length
              const totalPayments = payments.length
              const extraCount = payments.filter((p) => {
                const purpose = String(p.paymentPurpose || '').toUpperCase()
                return purpose === 'TOPUP' || purpose === 'REFUND'
              }).length
              return (
                <article key={booking.id} className="uoh-booking-card">
                  <div className="uoh-booking-day">
                    <span className="uoh-booking-day__month">{dayMeta.month}</span>
                    <span className="uoh-booking-day__weekday">{dayMeta.weekday}</span>
                    <strong className="uoh-booking-day__num">{dayMeta.day}</strong>
                  </div>

                  <div className="uoh-booking-schedule">
                    <p className="uoh-booking-schedule__time">🕒 {bookingDateTimeRange(booking)}</p>
                    <p className="uoh-booking-schedule__place">
                      📍 {booking.stationName || `Trạm #${booking.stationId}`}
                    </p>
                    <p className="uoh-booking-schedule__meta">
                      Mã: {booking.bookingCode} · Tạo lúc {fmtDate(booking.createdAt)}
                    </p>
                  </div>

                  <div className="uoh-booking-detail">
                    <div className="uoh-booking-detail__head">
                      <h3>{booking.vehicleName || `Xe #${booking.vehicleId}`}</h3>
                      <span className={`uoh-pay-badge uoh-pay-badge--${badge.toLowerCase()}`}>{badge}</span>
                    </div>
                    <p className="uoh-booking-detail__confirmed">
                      {confirmed}/{totalPayments} confirmed · {rentalStatusVi(booking.status)}
                    </p>
                    <p className="uoh-booking-detail__money">
                      Đã trả {formatBookingMoney(booking.partiallyPaid)} · Còn lại {formatBookingMoney(remaining)}
                    </p>
                    <p className="uoh-booking-detail__sub">
                      {paymentMethodVi(payments)} · {adjustmentStatus(payments)}
                    </p>
                  </div>

                  <div className="uoh-booking-extra">+{extraCount}</div>

                  <div className="uoh-booking-actions">
                    <a className="uoh-action-btn" href={`/rent/${booking.vehicleId}`} aria-label="Thêm chi tiết">
                      +
                    </a>
                    <a className="uoh-action-btn" href={`/rent/${booking.vehicleId}`} aria-label="Chỉnh sửa đơn">
                      ✎
                    </a>
                  </div>
                </article>
              )
            })}
          </section>
        ) : null}
      </main>
    </div>
  )
}
