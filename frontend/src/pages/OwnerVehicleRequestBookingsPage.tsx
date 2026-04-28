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
          <div className="owmr-scroll">
            <table className="owmr-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Người thuê</th>
                  <th>Thời gian thuê</th>
                  <th>Trạng thái</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td className="owmr-mono">
                      #{b.id} · {b.bookingCode || '—'}
                    </td>
                    <td>{b.renterName || '—'}</td>
                    <td className="owmr-date">
                      {toDate(b.startTime)}
                      <br />
                      <span className="owmr-cell-sub">đến {toDate(b.expectedEndTime)}</span>
                    </td>
                    <td>{bookingStatusLabel(b.status)}</td>
                    <td>{formatBookingMoney(b.totalAmount)}</td>
                    <td>{b.paymentStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  )
}
