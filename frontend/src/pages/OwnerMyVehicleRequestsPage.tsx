import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  cancelOwnerVehicleRequest,
  fetchMyOwnerRevenueDashboard,
  fetchMyOwnerVehicleRequests,
  resubmitOwnerVehicleRequest,
  type OwnerRevenueDashboardDto,
  type OwnerVehicleRequestDto,
  type OwnerVehicleRequestStatus,
} from '../api/ownerVehicleRequests'
import { OwnerVehicleRatingSummary } from '../components/OwnerVehicleRatingSummary'
import VehiclePhotoUpload from '../components/VehiclePhotoUpload'
import { fetchVehicleById } from '../api/vehicles'
import { useOwnerRequestStatusWatcher } from '../hooks/useOwnerRequestStatusWatcher'
import TopNav from '../components/TopNav'
import './OwnerRegisterVehiclePage.css'
import './OwnerMyVehicleRequestsPage.css'

function statusLabel(s: OwnerVehicleRequestStatus): string {
  const map: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    NEED_MORE_INFO: 'Cần bổ sung',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    CANCELLED: 'Đã hủy',
  }
  return map[s] ?? s
}

function statusClass(s: OwnerVehicleRequestStatus): string {
  if (s === 'PENDING') return 'owmr-pill owmr-pill--pending'
  if (s === 'NEED_MORE_INFO') return 'owmr-pill owmr-pill--need-info'
  if (s === 'APPROVED') return 'owmr-pill owmr-pill--approved'
  if (s === 'REJECTED') return 'owmr-pill owmr-pill--rejected'
  return 'owmr-pill owmr-pill--cancelled'
}

function toDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return value
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}

function moneyToNumber(value?: string | number | null): number {
  if (value == null || value === '') return 0
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value?: string | number | null): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(moneyToNumber(value))
}

function shortDate(value: string): string {
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return value
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
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

function canEdit(s: OwnerVehicleRequestStatus): boolean {
  return s === 'PENDING' || s === 'NEED_MORE_INFO'
}

function canResubmit(s: OwnerVehicleRequestStatus): boolean {
  return s === 'REJECTED' || s === 'NEED_MORE_INFO'
}

function canCancel(s: OwnerVehicleRequestStatus): boolean {
  return s === 'PENDING' || s === 'NEED_MORE_INFO' || s === 'REJECTED'
}

export default function OwnerMyVehicleRequestsPage() {
  type ToastState = { message: string; href?: string; linkLabel?: string } | null
  const navigate = useNavigate()
  const [items, setItems] = useState<OwnerVehicleRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'requests' | 'revenue'>('requests')
  const [statusFilter, setStatusFilter] = useState<OwnerVehicleRequestStatus | 'ALL'>('ALL')
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST')
  const [revenue, setRevenue] = useState<OwnerRevenueDashboardDto | null>(null)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [revenueError, setRevenueError] = useState<string | null>(null)
  /** approvedVehicleId → điểm TB (batch sau khi load items). */
  const [ratingByVehicleId, setRatingByVehicleId] = useState<
    Record<number, number | null>
  >({})
  const [ratingsLoading, setRatingsLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  const load = useCallback(async (opts?: { silent?: boolean; detectStatusChange?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const list = await fetchMyOwnerVehicleRequests()
      setItems(list)
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : 'Không tải được danh sách yêu cầu.')
        setItems([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load({ detectStatusChange: false })
  }, [load])

  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true)
    setRevenueError(null)
    try {
      setRevenue(await fetchMyOwnerRevenueDashboard())
    } catch (e) {
      setRevenueError(e instanceof Error ? e.message : 'Không tải được thống kê doanh thu.')
      setRevenue(null)
    } finally {
      setRevenueLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'revenue' && !revenue && !revenueLoading) {
      void loadRevenue()
    }
  }, [activeTab, loadRevenue, revenue, revenueLoading])

  useEffect(() => {
    const ids = [
      ...new Set(
        items
          .filter((i) => i.status === 'APPROVED' && i.approvedVehicleId != null)
          .map((i) => i.approvedVehicleId as number),
      ),
    ]
    if (ids.length === 0) {
      setRatingByVehicleId({})
      setRatingsLoading(false)
      return
    }
    let cancelled = false
    setRatingsLoading(true)
    void Promise.all(
      ids.map(async (id) => {
        try {
          const v = await fetchVehicleById(id)
          const r = v.rating != null && v.rating > 0 ? v.rating : null
          return [id, r] as const
        } catch {
          return [id, null] as const
        }
      }),
    ).then((pairs) => {
      if (cancelled) return
      setRatingByVehicleId(Object.fromEntries(pairs))
      setRatingsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [items])

  useOwnerRequestStatusWatcher({
    intervalMs: 45_000,
    onData: setItems,
    onStatusChanged: (changes) => {
      const first = changes[0]
      const extra = changes.length > 1 ? ` (+${changes.length - 1} yêu cầu)` : ''
      setToast({
        message: `Trạng thái yêu cầu vừa cập nhật #${first.id}: ${statusLabel(first.status)}${extra}.`,
        href: `/owner/vehicle-requests/${first.id}`,
        linkLabel: 'Xem yêu cầu',
      })
    },
  })

  const filteredAndSortedItems = useMemo(() => {
    const filtered =
      statusFilter === 'ALL' ? items : items.filter((item) => item.status === statusFilter)

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
      const safeA = Number.isFinite(aTime) ? aTime : 0
      const safeB = Number.isFinite(bTime) ? bTime : 0
      return sortOrder === 'NEWEST' ? safeB - safeA : safeA - safeB
    })
  }, [items, sortOrder, statusFilter])

  const maxDailyRevenue = useMemo(() => {
    const values = revenue?.revenueLast7Days?.map((d) => moneyToNumber(d.revenue)) ?? []
    return Math.max(1, ...values)
  }, [revenue])

  async function onResubmit(id: number) {
    setToast(null)
    setBusyId(id)
    try {
      await resubmitOwnerVehicleRequest(id)
      setToast({ message: `Đã gửi lại yêu cầu #${id}. Trạng thái: chờ duyệt.` })
      await load()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Gửi lại thất bại.' })
    } finally {
      setBusyId(null)
    }
  }

  async function onCancel(id: number) {
    setToast(null)
    setBusyId(id)
    try {
      await cancelOwnerVehicleRequest(id)
      setToast({ message: `Đã hủy yêu cầu #${id}. Hệ thống đã dọn file upload local.` })
      await load()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Hủy yêu cầu thất bại.' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="owreg owreg--clean">
      <TopNav solid showSearch={false} />
      <main className="owreg__main owreg__main--clean owmr-main">
        <div className="owmr-head">
          <div>
            <h1 className="owreg__title owmr-title">Yêu cầu xe của tôi</h1>
            <p className="owreg__lead owmr-lead">
              Theo dõi trạng thái duyệt, chỉnh sửa khi đang chờ hoặc được yêu cầu bổ sung, hoặc gửi
              lại sau từ chối / bổ sung.
            </p>
          </div>
          <div className="owmr-head-actions">
            <button
              type="button"
              className={`owreg__btn ${activeTab === 'revenue' ? 'owreg__btn--primary' : 'owreg__btn--ghost'}`}
              onClick={() => setActiveTab((tab) => (tab === 'revenue' ? 'requests' : 'revenue'))}
            >
              {activeTab === 'revenue' ? 'Danh sách yêu cầu' : 'Thống kê'}
            </button>
            <a className="owreg__btn owreg__btn--ghost" href="/owner/register-vehicle">
              + Đăng xe mới
            </a>
            <button
              type="button"
              className="owreg__btn owreg__btn--ghost"
              onClick={() => void load({ detectStatusChange: false })}
              disabled={loading}
            >
              {loading ? 'Đang tải…' : 'Tải lại'}
            </button>
          </div>
        </div>

        <div className="owmr-tabs" role="tablist" aria-label="Owner vehicle tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'requests'}
            className={`owmr-tab${activeTab === 'requests' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Yêu cầu xe
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'revenue'}
            className={`owmr-tab${activeTab === 'revenue' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            Owner revenue dashboard
          </button>
        </div>

        {activeTab === 'revenue' ? (
          <section className="owmr-revenue" aria-label="Owner revenue dashboard">
            <div className="owmr-revenue__head">
              <div>
                <h2>Thống kê doanh thu xe cho thuê</h2>
                <p>Doanh thu net từ các payment đã thanh toán của những xe đã được duyệt thuộc tài khoản owner này.</p>
              </div>
              <button
                type="button"
                className="owreg__btn owreg__btn--ghost"
                onClick={() => void loadRevenue()}
                disabled={revenueLoading}
              >
                {revenueLoading ? 'Đang tải…' : 'Tải lại thống kê'}
              </button>
            </div>

            {revenueError ? (
              <p className="owreg__err" role="alert">
                {revenueError}
              </p>
            ) : null}
            {revenueLoading && !revenue ? <p className="owmr-muted">Đang tải thống kê doanh thu…</p> : null}

            {revenue ? (
              <>
                <div className="owmr-revenue-cards">
                  <article className="owmr-revenue-card">
                    <span>Tổng doanh thu</span>
                    <strong>{formatMoney(revenue.totalRevenue)}</strong>
                  </article>
                  <article className="owmr-revenue-card">
                    <span>Tháng này</span>
                    <strong>{formatMoney(revenue.revenueThisMonth)}</strong>
                  </article>
                  <article className="owmr-revenue-card">
                    <span>Booking hoàn tất</span>
                    <strong>{revenue.completedBookings ?? 0}</strong>
                  </article>
                  <article className="owmr-revenue-card">
                    <span>Xe đang cho thuê</span>
                    <strong>{revenue.activeVehicles ?? 0}</strong>
                  </article>
                </div>

                <div className="owmr-revenue-grid">
                  <section className="owmr-revenue-panel">
                    <h3>Doanh thu 7 ngày gần đây</h3>
                    <div className="owmr-revenue-bars">
                      {(revenue.revenueLast7Days ?? []).map((day) => {
                        const value = moneyToNumber(day.revenue)
                        const height = Math.max(8, Math.round((value / maxDailyRevenue) * 100))
                        return (
                          <div className="owmr-revenue-bar" key={day.date}>
                            <div className="owmr-revenue-bar__track">
                              <span style={{ height: `${height}%` }} />
                            </div>
                            <strong>{shortDate(day.date)}</strong>
                            <small>{formatMoney(value)}</small>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <section className="owmr-revenue-panel">
                    <h3>Doanh thu theo xe</h3>
                    {(revenue.vehicles ?? []).length === 0 ? (
                      <p className="owmr-muted">Chưa có doanh thu từ xe đã duyệt.</p>
                    ) : (
                      <div className="owmr-revenue-table">
                        {(revenue.vehicles ?? []).map((row) => (
                          <article className="owmr-revenue-row" key={row.vehicleId ?? row.licensePlate ?? row.vehicleName}>
                            <div>
                              <strong>{row.vehicleName || `Xe #${row.vehicleId ?? '—'}`}</strong>
                              <span>{row.licensePlate || 'Chưa có biển số'}</span>
                            </div>
                            <div>
                              <strong>{formatMoney(row.revenue)}</strong>
                              <span>{row.completedBookings ?? 0} booking hoàn tất</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {activeTab === 'requests' ? <div className="owmr-toolbar">
          <label className="owmr-filter">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(ev) => setStatusFilter(ev.target.value as OwnerVehicleRequestStatus | 'ALL')}
            >
              <option value="ALL">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="NEED_MORE_INFO">Cần bổ sung</option>
              <option value="REJECTED">Từ chối</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </label>

          <label className="owmr-filter">
            <span>Sắp xếp</span>
            <select
              value={sortOrder}
              onChange={(ev) => setSortOrder(ev.target.value as 'NEWEST' | 'OLDEST')}
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
            </select>
          </label>

          <span className="owmr-count">Hiển thị {filteredAndSortedItems.length} yêu cầu</span>
        </div> : null}

        {activeTab === 'requests' && toast ? (
          <p className="owmr-toast" role="status">
            {toast.message}{' '}
            {toast.href ? (
              <a href={toast.href} className="owmr-toast__link">
                {toast.linkLabel ?? 'Xem chi tiết'}
              </a>
            ) : null}
          </p>
        ) : null}
        {activeTab === 'requests' && error ? (
          <p className="owreg__err" role="alert">
            {error}
          </p>
        ) : null}

        {activeTab === 'requests' && loading && items.length === 0 ? (
          <p className="owmr-muted">Đang tải danh sách…</p>
        ) : null}

        {activeTab === 'requests' && !loading && filteredAndSortedItems.length === 0 ? (
          <div className="owmr-empty">
            <p>
              {items.length === 0
                ? 'Bạn chưa có yêu cầu nào.'
                : 'Không có yêu cầu nào khớp với bộ lọc hiện tại.'}
            </p>
            <a className="owreg__btn owreg__btn--primary" href="/owner/register-vehicle">
              Đăng xe cho thuê
            </a>
          </div>
        ) : null}

        {activeTab === 'requests' && filteredAndSortedItems.length > 0 ? (
          <section className="owmr-booking-list" aria-label="Owner vehicle requests">
            {filteredAndSortedItems.map((r) => {
              const dayMeta = cardDayMeta(r.createdAt)
              const actionCount =
                Number(canEdit(r.status)) +
                Number(canResubmit(r.status)) +
                Number(canCancel(r.status)) +
                Number(r.status === 'APPROVED' && r.approvedVehicleId != null)
              return (
                <article key={r.id} className="owmr-booking-card">
                  <div className="owmr-booking-day">
                    <span className="owmr-booking-day__month">{dayMeta.month}</span>
                    <span className="owmr-booking-day__weekday">{dayMeta.weekday}</span>
                    <strong className="owmr-booking-day__num">{dayMeta.day}</strong>
                  </div>

                  <div className="owmr-booking-schedule">
                    <p className="owmr-booking-schedule__time">
                      🕒 {toDate(r.createdAt)}
                    </p>
                    <p className="owmr-booking-schedule__place">📍 Biển số: {r.licensePlate || '—'}</p>
                    <p className="owmr-booking-schedule__meta">Mã yêu cầu #{r.id}</p>
                  </div>

                  <div className="owmr-booking-detail">
                    <div className="owmr-booking-detail__head">
                      <h3>{r.name || 'Yêu cầu đăng xe'}</h3>
                      <span className={statusClass(r.status)}>{statusLabel(r.status)}</span>
                    </div>
                    <p className="owmr-booking-detail__confirmed">Hãng xe: {r.brand || '—'}</p>
                    <p className="owmr-booking-detail__money">Tạo: {toDate(r.createdAt)}</p>
                    <p className="owmr-booking-detail__sub">
                      {r.adminNote?.trim() ? r.adminNote : '— Không có ghi chú admin'}
                    </p>
                  </div>

                  <div className="owmr-booking-extra">+{actionCount}</div>

                  <div className="owmr-booking-actions">
                    <a className="owmr-action-btn" href={`/owner/vehicle-requests/${r.id}`} title="Chi tiết">
                      +
                    </a>
                    {canEdit(r.status) ? (
                      <a className="owmr-action-btn" href={`/owner/vehicle-requests/${r.id}/edit`} title="Sửa">
                        ✎
                      </a>
                    ) : (
                      <span className="owmr-action-btn owmr-action-btn--muted" aria-hidden="true">
                        ✎
                      </span>
                    )}
                  </div>

                  <div className="owmr-booking-links">
                    {r.status === 'APPROVED' && r.approvedVehicleId != null ? (
                      <>
                        <OwnerVehicleRatingSummary
                          vehicleId={r.approvedVehicleId}
                          loading={
                            ratingsLoading && ratingByVehicleId[r.approvedVehicleId] === undefined
                          }
                          rating={ratingByVehicleId[r.approvedVehicleId] ?? null}
                        />
                        <a className="owmr-link" href={`/owner/vehicle-requests/${r.id}/bookings`}>
                          Lịch sử booking
                        </a>
                        <a className="owmr-link" href={`/rent/${r.approvedVehicleId}`}>
                          Xem xe #{r.approvedVehicleId}
                        </a>
                      </>
                    ) : null}
                    {canResubmit(r.status) ? (
                      <button
                        type="button"
                        className="owmr-link owmr-link--btn"
                        disabled={busyId === r.id}
                        onClick={() => void onResubmit(r.id)}
                      >
                        {busyId === r.id ? 'Đang gửi…' : 'Gửi lại'}
                      </button>
                    ) : null}
                    {canCancel(r.status) ? (
                      <button
                        type="button"
                        className="owmr-link owmr-link--btn"
                        disabled={busyId === r.id}
                        onClick={() => void onCancel(r.id)}
                      >
                        {busyId === r.id ? 'Đang hủy…' : 'Hủy yêu cầu'}
                      </button>
                    ) : null}
                    {r.status === 'APPROVED' && r.approvedVehicleId != null ? (
                      <div className="owmr-vehicle-photo-slot">
                        <VehiclePhotoUpload
                          key={`veh-up-${r.id}-${r.approvedVehicleId}`}
                          vehicleId={r.approvedVehicleId}
                          onUploadedUrl={() =>
                            setToast({
                              message:
                                'Đã tải ảnh lên xe. Mở link “Xem xe” để xem trên trang thuê.',
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
            <p className="owmr-footnote">
              <strong>Từ chối:</strong> dùng <strong>Gửi lại</strong> để chuyển về chờ duyệt, rồi
              dùng <strong>Sửa</strong> nếu cần đổi thông tin. <strong>Cần bổ sung:</strong> có thể{' '}
              <strong>Sửa</strong> trước hoặc <strong>Gửi lại</strong> sau khi đã cập nhật đủ theo ghi
              chú admin.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  )
}
