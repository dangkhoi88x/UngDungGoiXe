import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatBookingMoney, type BookingDto } from '../api/bookings'
import { fetchMyOwnerRequestBookings } from '../api/ownerVehicleRequests'
import TopNav from '../components/TopNav'
import './OwnerRegisterVehiclePage.css'
import './OwnerMyVehicleRequestsPage.css'

function toDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return value
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}

function bookingStatusLabel(status?: string | null): string {
  const key = (status ?? '').toUpperCase()
  if (key === 'PENDING') return 'Chờ xác nhận'
  if (key === 'CONFIRMED') return 'Đã xác nhận'
  if (key === 'ONGOING') return 'Đang thuê'
  if (key === 'COMPLETED') return 'Đã hoàn tất'
  if (key === 'CANCELLED') return 'Đã hủy'
  return status || '—'
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

function cardDayMeta(value?: string | null): { month: string; weekday: string; day: string } {
  const d = parseIsoDate(value)
  if (!d) return { month: '—', weekday: '—', day: '—' }
  return {
    month: d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(d.getDate()),
  }
}

function cardTime(value?: string | null): string {
  const d = parseIsoDate(value)
  if (!d) return '--:--'
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function paymentBadge(status?: string | null): 'PAID' | 'UNPAID' {
  return String(status || '').toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID'
}

export default function OwnerVehicleRequestBookingsPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requestId = Number(idParam)
  const [items, setItems] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  const load = useCallback(async () => {
    if (!Number.isInteger(requestId) || requestId <= 0) {
      navigate('/owner/vehicle-requests', { replace: true })
      return
    }
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchMyOwnerRequestBookings(requestId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lịch sử booking.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [navigate, requestId])

  useEffect(() => {
    void load()
  }, [load])

  const title = useMemo(() => `Lịch sử booking - yêu cầu #${requestId}`, [requestId])

  return (
    <div className="owreg owreg--clean">
      <TopNav solid showSearch={false} />
      <main className="owreg__main owreg__main--clean owmr-main">
        <h1 className="owreg__title owmr-title">{title}</h1>
        <p className="owreg__lead owmr-lead">Danh sách booking của xe đã được duyệt từ yêu cầu này.</p>
        <div className="owmr-head-actions" style={{ marginBottom: 12 }}>
          <a className="owreg__btn owreg__btn--ghost" href="/owner/vehicle-requests">
            Danh sách yêu cầu
          </a>
        </div>

        {error ? (
          <p className="owreg__err" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="owmr-muted">Đang tải lịch sử booking…</p> : null}
        {!loading && items.length === 0 ? (
          <div className="owmr-empty">
            <p>Chưa có booking nào cho xe này.</p>
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <section className="owmr-bookhist-list" aria-label="Booking history list">
            {items.map((b) => {
              const dayMeta = cardDayMeta(b.startTime || b.createdAt)
              const pay = paymentBadge(b.paymentStatus)
              const extraCount = pay === 'PAID' ? 1 : 0
              return (
                <article key={b.id} className="owmr-booking-card owmr-bookhist-card">
                  <div className="owmr-booking-day">
                    <span className="owmr-booking-day__month">{dayMeta.month}</span>
                    <span className="owmr-booking-day__weekday">{dayMeta.weekday}</span>
                    <strong className="owmr-booking-day__num">{dayMeta.day}</strong>
                  </div>

                  <div className="owmr-booking-schedule">
                    <p className="owmr-booking-schedule__time">
                      🕒 {cardTime(b.startTime)} - {cardTime(b.expectedEndTime)}
                    </p>
                    <p className="owmr-booking-schedule__place">📍 {b.stationName || `Trạm #${b.stationId}`}</p>
                    <p className="owmr-booking-schedule__meta">Mã {b.bookingCode || `#${b.id}`}</p>
                  </div>

                  <div className="owmr-booking-detail">
                    <div className="owmr-booking-detail__head">
                      <h3>{b.renterName || 'Khách thuê'}</h3>
                      <span className={`owmr-pay-badge owmr-pay-badge--${pay.toLowerCase()}`}>{pay}</span>
                    </div>
                    <p className="owmr-booking-detail__confirmed">{bookingStatusLabel(b.status)}</p>
                    <p className="owmr-booking-detail__money">Tổng tiền: {formatBookingMoney(b.totalAmount)}</p>
                    <p className="owmr-booking-detail__sub">Tạo lúc: {toDate(b.createdAt)}</p>
                  </div>

                  <div className="owmr-booking-extra">+{extraCount}</div>

                  <div className="owmr-booking-actions">
                    <a
                      className="owmr-action-btn"
                      href={`/owner/vehicle-requests/${requestId}`}
                      aria-label="Xem yêu cầu gốc"
                    >
                      +
                    </a>
                    <a className="owmr-action-btn" href={`/rent/${b.vehicleId}`} aria-label="Xem xe thuê">
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
