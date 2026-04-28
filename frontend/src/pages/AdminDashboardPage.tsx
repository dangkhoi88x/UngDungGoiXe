import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  fetchAdminDashboardCharts,
  fetchAdminOverviewStats,
  type AdminDashboardChartsDto,
  type AdminOverviewStatsDto,
  type DailyMetricDto,
  type StatusMetricDto,
  type TopVehicleMetricDto,
} from '../api/adminDashboard'
import { fetchAdminOwnerVehicleRequests } from '../api/ownerVehicleRequests'
import './AdminDashboardPage.css'

const AdminVehiclesSection = lazy(() => import('./AdminVehiclesSection'))
const AdminStationsSection = lazy(() => import('./AdminStationsSection'))
const AdminUsersSection = lazy(() => import('./AdminUsersSection'))
const AdminBookingsSection = lazy(() => import('./AdminBookingsSection'))
const AdminOwnerVehicleRequestsSection = lazy(
  () => import('./AdminOwnerVehicleRequestsSection'),
)

function AdminSectionFallback() {
  return (
    <div className="adm-section-fallback" role="status" aria-live="polite">
      <span className="adm-section-fallback__spinner" aria-hidden />
      Đang tải màn quản trị…
    </div>
  )
}

type NavId =
  | 'home'
  | 'vehicles'
  | 'stations'
  | 'bookings'
  | 'ownerRequests'
  | 'users'
  | 'stats'

const NAV_ITEMS: {
  id: NavId
  label: string
  icon: string
}[] = [
  { id: 'home', label: 'Tổng quan', icon: '🏠' },
  { id: 'vehicles', label: 'Phương tiện', icon: '🚗' },
  { id: 'stations', label: 'Trạm & bãi', icon: '📍' },
  { id: 'bookings', label: 'Đặt xe', icon: '📋' },
  { id: 'ownerRequests', label: 'Yêu cầu owner', icon: '📝' },
  { id: 'users', label: 'Người dùng', icon: '👤' },
  { id: 'stats', label: 'Thống kê', icon: '📊' },
]

const PAGE_COPY: Record<
  NavId,
  { title: string; subtitle: string; pill: string }
> = {
  home: {
    title: 'Tổng quan',
    subtitle: 'Theo dõi hoạt động thuê xe và trạm trong hệ thống.',
    pill: '3 mới',
  },
  vehicles: {
    title: 'Phương tiện',
    subtitle: 'Quản lý danh sách xe, trạng thái và giá.',
    pill: '3 mới',
  },
  stations: {
    title: 'Trạm & bãi',
    subtitle: 'Vị trí đỗ xe và công suất từng trạm.',
    pill: 'Cập nhật',
  },
  bookings: {
    title: 'Đặt xe',
    subtitle: 'Đơn đặt chờ xác nhận và lịch sử giao nhận.',
    pill: '5 mới',
  },
  ownerRequests: {
    title: 'Yêu cầu xe owner',
    subtitle: 'Duyệt xe người dùng gửi lên hệ thống cho thuê.',
    pill: 'PENDING',
  },
  users: {
    title: 'Người dùng',
    subtitle: 'Tài khoản khách hàng và tài xế.',
    pill: '2 mới',
  },
  stats: {
    title: 'Thống kê',
    subtitle: 'Doanh thu, tỷ lệ lấp đầy và xu hướng theo tháng.',
    pill: 'Báo cáo',
  },
}

const NAV_TO_ROUTE: Record<NavId, string> = {
  home: '/admin/overview',
  vehicles: '/admin/vehicles',
  stations: '/admin/stations',
  bookings: '/admin/bookings',
  ownerRequests: '/admin/owner-vehicle-requests',
  users: '/admin/users',
  stats: '/admin/stats',
}

function navFromPath(pathname: string): NavId {
  if (pathname === '/admin' || pathname === '/admin/') return 'home'
  if (pathname.startsWith('/admin/vehicles')) return 'vehicles'
  if (pathname.startsWith('/admin/stations')) return 'stations'
  if (pathname.startsWith('/admin/bookings')) return 'bookings'
  if (pathname.startsWith('/admin/owner-vehicle-requests')) return 'ownerRequests'
  if (pathname.startsWith('/admin/users')) return 'users'
  if (pathname.startsWith('/admin/stats')) return 'stats'
  if (pathname.startsWith('/admin/overview')) return 'home'
  return 'home'
}

const BOOKING_STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: '#f59e0b' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb' },
  ONGOING: { label: 'Đang thuê', color: '#7c3aed' },
  COMPLETED: { label: 'Hoàn thành', color: '#16a34a' },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444' },
}

const VEHICLE_STATUS_META: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Sẵn sàng', color: '#22c55e' },
  RENTED: { label: 'Đang thuê', color: '#3b82f6' },
  MAINTENANCE: { label: 'Bảo trì', color: '#f97316' },
}

function fmtShortDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (!Number.isFinite(d.getTime())) return isoDate
  return d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })
}

function toNum(v: number | string | null | undefined): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function DashboardLineChart({
  data,
  stroke,
}: {
  data: DailyMetricDto[]
  stroke: string
}) {
  const values = data.map((x) => toNum(x.value))
  const max = Math.max(...values, 1)
  const points = values
    .map((value, idx) => {
      const x = (idx / Math.max(1, values.length - 1)) * 100
      const y = 100 - (value / max) * 100
      return `${x},${y}`
    })
    .join(' ')
  return (
    <div className="adm-chart-box">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="adm-line-chart">
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
      <div className="adm-line-labels">
        {data.map((x) => (
          <span key={x.date}>{fmtShortDate(x.date)}</span>
        ))}
      </div>
    </div>
  )
}

function DashboardBarChart({
  data,
  color,
}: {
  data: DailyMetricDto[]
  color: string
}) {
  const values = data.map((x) => toNum(x.value))
  const max = Math.max(...values, 1)
  return (
    <div className="adm-chart-box">
      <div className="adm-mini-bars">
        {data.map((item) => (
          <div key={item.date} className="adm-mini-bars__item">
            <div
              className="adm-mini-bars__bar"
              style={{ height: `${Math.max(6, (toNum(item.value) / max) * 100)}%`, background: color }}
              title={`${fmtShortDate(item.date)}: ${toNum(item.value).toLocaleString('vi-VN')}`}
            />
            <span>{fmtShortDate(item.date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardDonut({
  title,
  metrics,
  meta,
}: {
  title: string
  metrics: StatusMetricDto[]
  meta: Record<string, { label: string; color: string }>
}) {
  const total = metrics.reduce((acc, x) => acc + toNum(x.count), 0)
  let start = 0
  const slices = metrics
    .map((item) => {
      const count = toNum(item.count)
      const pct = total > 0 ? (count / total) * 100 : 0
      const end = start + pct
      const color = meta[item.status]?.color ?? '#94a3b8'
      const segment = `${color} ${start}% ${end}%`
      start = end
      return segment
    })
    .join(', ')

  return (
    <section className="adm-panel" aria-label={title}>
      <div className="adm-panel__head">
        <h2 className="adm-panel__title">{title}</h2>
      </div>
      <div className="adm-donut-wrap">
        <div
          className="adm-donut"
          style={{ background: `conic-gradient(${slices || '#e2e8f0 0% 100%'})` }}
        >
          <div className="adm-donut__center">
            <strong>{total}</strong>
            <span>Tổng</span>
          </div>
        </div>
        <div className="adm-donut-legend">
          {metrics.map((item) => (
            <div key={item.status} className="adm-donut-legend__item">
              <span
                className="adm-donut-legend__dot"
                style={{ background: meta[item.status]?.color ?? '#94a3b8' }}
              />
              <span>{meta[item.status]?.label ?? item.status}</span>
              <strong>{toNum(item.count)}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeNav = navFromPath(location.pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [vehicleRefreshKey, setVehicleRefreshKey] = useState(0)
  const [stationRefreshKey, setStationRefreshKey] = useState(0)
  const [userRefreshKey, setUserRefreshKey] = useState(0)
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0)
  const [ownerRequestRefreshKey, setOwnerRequestRefreshKey] = useState(0)
  const [pendingOwnerRequestsCount, setPendingOwnerRequestsCount] = useState(0)
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStatsDto | null>(null)
  const [chartData, setChartData] = useState<AdminDashboardChartsDto | null>(null)

  const showDashboard =
    activeNav !== 'vehicles' &&
    activeNav !== 'stations' &&
    activeNav !== 'users' &&
    activeNav !== 'bookings' &&
    activeNav !== 'ownerRequests'

  const page = useMemo(() => PAGE_COPY[activeNav], [activeNav])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), [])

  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/overview', { replace: true })
    }
  }, [location.pathname, navigate])

  const loadPendingOwnerRequestsCount = useCallback(async () => {
    try {
      const pending = await fetchAdminOwnerVehicleRequests({ status: 'PENDING' })
      setPendingOwnerRequestsCount(pending.length)
    } catch {
      setPendingOwnerRequestsCount(0)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [stats, charts] = await Promise.all([
          fetchAdminOverviewStats(),
          fetchAdminDashboardCharts(),
        ])
        if (!cancelled) {
          setOverviewStats(stats)
          setChartData(charts)
        }
      } catch {
        if (!cancelled) {
          setOverviewStats(null)
          setChartData(null)
        }
      }
    }
    void run()
    const timer = window.setInterval(() => void run(), 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const fmtMoney = (v: number | string | null | undefined): string => {
    if (v == null || v === '') return '0 ₫'
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) return '0 ₫'
    return `${new Intl.NumberFormat('vi-VN').format(n)} ₫`
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const pending = await fetchAdminOwnerVehicleRequests({ status: 'PENDING' })
        if (!cancelled) setPendingOwnerRequestsCount(pending.length)
      } catch {
        if (!cancelled) setPendingOwnerRequestsCount(0)
      }
    }
    void run()
    const timer = window.setInterval(() => void run(), 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const onNav = useCallback((id: NavId) => {
    navigate(NAV_TO_ROUTE[id])
    setSidebarOpen(false)
  }, [navigate])

  const bumpActiveSectionRefresh = useCallback(() => {
    switch (activeNav) {
      case 'vehicles':
        setVehicleRefreshKey((k) => k + 1)
        break
      case 'stations':
        setStationRefreshKey((k) => k + 1)
        break
      case 'users':
        setUserRefreshKey((k) => k + 1)
        break
      case 'bookings':
        setBookingRefreshKey((k) => k + 1)
        break
      case 'ownerRequests':
        setOwnerRequestRefreshKey((k) => k + 1)
        void loadPendingOwnerRequestsCount()
        break
      default:
        break
    }
  }, [activeNav, loadPendingOwnerRequestsCount])

  return (
    <div className="adm">
      <div
        className={`adm-backdrop${sidebarOpen ? ' is-open' : ''}`}
        aria-hidden={!sidebarOpen}
        onClick={closeSidebar}
        onKeyDown={(e) => e.key === 'Escape' && closeSidebar()}
        role="presentation"
      />

      <aside
        className={`adm-sidebar${sidebarOpen ? ' is-open' : ''}`}
        aria-label="Menu quản trị"
      >
        <a className="adm-sidebar__brand" href="/admin/overview">
          <span className="adm-sidebar__logo" aria-hidden>
            GX
          </span>
          <span className="adm-sidebar__name">GỌI XE ADMIN</span>
        </a>

        <nav aria-label="Điều hướng chính">
          <ul className="adm-nav" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === activeNav ? 'is-active' : ''}
                  onClick={() => onNav(item.id)}
                  role="menuitem"
                  aria-current={item.id === activeNav ? 'page' : undefined}
                >
                  <span className="adm-nav__icon" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                  {item.id === 'ownerRequests' && pendingOwnerRequestsCount > 0 ? (
                    <span className="adm-nav__badge">{pendingOwnerRequestsCount}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="adm-upgrade">
          <div className="adm-upgrade__icon" aria-hidden>
            👑
          </div>
          <h3>Nâng cấp Pro</h3>
          <p>Báo cáo nâng cao, xuất Excel và quản lý đội xe theo nhóm.</p>
          <button type="button">Nâng cấp — liên hệ</button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-header">
          <div className="adm-header__left">
            <button
              type="button"
              className="adm-menu-toggle"
              aria-label="Mở menu"
              aria-expanded={sidebarOpen}
              onClick={toggleSidebar}
            >
              ☰
            </button>
            <div>
              <h1 className="adm-header__title">{page.title}</h1>
              <p className="adm-header__sub">{page.subtitle}</p>
            </div>
            <button type="button" className="adm-pill">
              {page.pill}
            </button>
          </div>
          <div className="adm-header__right">
            <button
              type="button"
              className="adm-icon-btn"
              aria-label="Tìm kiếm"
            >
              🔍
            </button>
            <button
              type="button"
              className="adm-icon-btn"
              aria-label="Làm mới dữ liệu"
              onClick={bumpActiveSectionRefresh}
            >
              ↻
            </button>
            <button type="button" className="adm-profile">
              <span className="adm-profile__avatar" aria-hidden>
                QTV
              </span>
              <span className="adm-profile__text">
                <small>Xin chào</small>
                <strong>Quản trị viên</strong>
              </span>
              <span aria-hidden>▾</span>
            </button>
          </div>
        </header>

        <main
          className={`adm-content${activeNav === 'users' ? ' adm-content--users' : ''}${activeNav === 'bookings' ? ' adm-content--bookings' : ''}`}
          id="admin-main"
        >
          {activeNav === 'vehicles' ? (
            <Suspense fallback={<AdminSectionFallback />}>
              <AdminVehiclesSection refreshKey={vehicleRefreshKey} />
            </Suspense>
          ) : null}

          {activeNav === 'stations' ? (
            <Suspense fallback={<AdminSectionFallback />}>
              <AdminStationsSection refreshKey={stationRefreshKey} />
            </Suspense>
          ) : null}

          {activeNav === 'users' ? (
            <Suspense fallback={<AdminSectionFallback />}>
              <AdminUsersSection refreshKey={userRefreshKey} />
            </Suspense>
          ) : null}

          {activeNav === 'bookings' ? (
            <Suspense fallback={<AdminSectionFallback />}>
              <AdminBookingsSection refreshKey={bookingRefreshKey} />
            </Suspense>
          ) : null}

          {activeNav === 'ownerRequests' ? (
            <Suspense fallback={<AdminSectionFallback />}>
              <AdminOwnerVehicleRequestsSection refreshKey={ownerRequestRefreshKey} />
            </Suspense>
          ) : null}

          {showDashboard ? (
            <>
          <section aria-label="Chỉ số nhanh" className="adm-metrics">
            <article className="adm-mcard adm-mcard--lime">
              <div className="adm-mcard__icon" aria-hidden>
                📅
              </div>
              <div>
                <p className="adm-mcard__label">Đơn đặt hôm nay</p>
                <p className="adm-mcard__value">{overviewStats?.bookingsToday ?? 0}</p>
                <p className="adm-mcard__sub">Tổng booking tạo trong ngày</p>
              </div>
            </article>
            <article className="adm-mcard">
              <div className="adm-mcard__icon" aria-hidden>
                🚙
              </div>
              <div>
                <p className="adm-mcard__label">Xe đang cho thuê</p>
                <p className="adm-mcard__value">{overviewStats?.ongoingBookings ?? 0}</p>
                <p className="adm-mcard__sub">Số booking ONGOING</p>
              </div>
            </article>
            <article className="adm-mcard">
              <div className="adm-mcard__icon" aria-hidden>
                ✅
              </div>
              <div>
                <p className="adm-mcard__label">Xe sẵn sàng</p>
                <p className="adm-mcard__value">{overviewStats?.availableVehicles ?? 0}</p>
                <p className="adm-mcard__sub">Số xe AVAILABLE</p>
              </div>
            </article>
            <article className="adm-mcard">
              <div className="adm-mcard__icon" aria-hidden>
                💰
              </div>
              <div>
                <p className="adm-mcard__label">Doanh thu tháng này</p>
                <p className="adm-mcard__value">{fmtMoney(overviewStats?.revenueThisMonth ?? 0)}</p>
                <p className="adm-mcard__sub">Tổng tiền booking hoàn tất</p>
              </div>
            </article>
            <article className="adm-mcard">
              <div className="adm-mcard__icon" aria-hidden>
                👤
              </div>
              <div>
                <p className="adm-mcard__label">Người dùng mới</p>
                <p className="adm-mcard__value">{overviewStats?.newUsersLast7Days ?? 0}</p>
                <p className="adm-mcard__sub">Đăng ký trong 7 ngày gần nhất</p>
              </div>
            </article>
          </section>

          <div className="adm-grid2">
            <section className="adm-panel" aria-label="Booking 7 ngày gần đây">
              <div className="adm-panel__head">
                <h2 className="adm-panel__title">Booking 7 ngày gần đây</h2>
              </div>
              <DashboardLineChart
                data={chartData?.bookingsLast7Days ?? []}
                stroke="#2563eb"
              />
            </section>

            <section className="adm-panel" aria-label="Doanh thu 7 ngày">
              <div className="adm-panel__head">
                <h2 className="adm-panel__title">Doanh thu 7 ngày</h2>
              </div>
              <DashboardBarChart
                data={chartData?.revenueLast7Days ?? []}
                color="#16a34a"
              />
            </section>

            <DashboardDonut
              title="Trạng thái booking"
              metrics={chartData?.bookingStatusBreakdown ?? []}
              meta={BOOKING_STATUS_META}
            />

            <DashboardDonut
              title="Trạng thái xe"
              metrics={chartData?.vehicleStatusBreakdown ?? []}
              meta={VEHICLE_STATUS_META}
            />
          </div>

          <div className="adm-grid2" style={{ marginTop: 20 }}>
            <section className="adm-panel" aria-label="Top xe theo lượt thuê">
              <div className="adm-panel__head">
                <h2 className="adm-panel__title">Top xe theo lượt thuê</h2>
              </div>
              <div className="adm-top-list">
                {(chartData?.topVehiclesByRentCount ?? []).map((v: TopVehicleMetricDto) => (
                  <div className="adm-top-item" key={`rent-${v.vehicleId ?? v.licensePlate}`}>
                    <div>
                      <strong>{v.vehicleName?.trim() || 'Xe chưa đặt tên'}</strong>
                      <p>{v.licensePlate || '—'}</p>
                    </div>
                    <span>{toNum(v.rentCount)} lượt</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="adm-panel" aria-label="Top xe theo doanh thu">
              <div className="adm-panel__head">
                <h2 className="adm-panel__title">Top xe theo doanh thu</h2>
              </div>
              <div className="adm-top-list">
                {(chartData?.topVehiclesByRevenue ?? []).map((v: TopVehicleMetricDto) => (
                  <div className="adm-top-item" key={`rev-${v.vehicleId ?? v.licensePlate}`}>
                    <div>
                      <strong>{v.vehicleName?.trim() || 'Xe chưa đặt tên'}</strong>
                      <p>{v.licensePlate || '—'}</p>
                    </div>
                    <span>{fmtMoney(v.revenue)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
            </>
          ) : null}
        </main>
      </div>

      <style>{`
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  )
}
