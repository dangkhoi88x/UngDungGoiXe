import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  badge?: number
}[] = [
  { id: 'home', label: 'Tổng quan', icon: '🏠' },
  { id: 'vehicles', label: 'Phương tiện', icon: '🚗', badge: 3 },
  { id: 'stations', label: 'Trạm & bãi', icon: '📍' },
  { id: 'bookings', label: 'Đặt xe', icon: '📋', badge: 5 },
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

const BAR_MONTHS = ['T5', 'T6', 'T7', 'T8', 'T9']
const BAR_HEIGHTS_BLUE = [45, 62, 55, 78, 70]
const BAR_HEIGHTS_LIME = [38, 50, 48, 65, 58]

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
        break
      default:
        break
    }
  }, [activeNav])

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
                  {item.badge != null && item.badge > 0 ? (
                    <span className="adm-nav__badge">{item.badge}</span>
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
                💰
              </div>
              <div>
                <p className="adm-mcard__label">Doanh thu tháng</p>
                <p className="adm-mcard__value">42.580.000 ₫</p>
                <p className="adm-mcard__sub">So với tháng trước</p>
              </div>
            </article>
            <article className="adm-mcard">
              <div className="adm-mcard__icon" aria-hidden>
                🎯
              </div>
              <div>
                <p className="adm-mcard__label">Mục tiêu doanh thu</p>
                <p className="adm-mcard__value">
                  78%
                  <span className="adm-mcard__badge">+5%</span>
                </p>
                <p className="adm-mcard__sub">62M / 80M ₫</p>
              </div>
            </article>
            <article className="adm-mcard">
              <div className="adm-mcard__icon" aria-hidden>
                🚙
              </div>
              <div>
                <p className="adm-mcard__label">Đặt xe mới</p>
                <p className="adm-mcard__value">
                  38
                  <span className="adm-mcard__badge">+6</span>
                </p>
                <p className="adm-mcard__sub">Trong tháng này</p>
              </div>
            </article>
            <article className="adm-mcard">
              <div className="adm-mcard__icon" aria-hidden>
                📈
              </div>
              <div>
                <p className="adm-mcard__label">Tổng lũy kế</p>
                <p className="adm-mcard__value">892.400.000 ₫</p>
                <p className="adm-mcard__sub">Toàn thời gian</p>
              </div>
            </article>
          </section>

          <div className="adm-grid2">
            <section className="adm-panel" aria-labelledby="adm-stat-title">
              <div className="adm-panel__head">
                <h2 className="adm-panel__title" id="adm-stat-title">
                  <span aria-hidden>📊</span> Thống kê
                </h2>
                <div className="adm-panel__tools">
                  <label htmlFor="adm-period" className="visually-hidden">
                    Chu kỳ
                  </label>
                  <select id="adm-period" className="adm-select">
                    <option>Theo tháng</option>
                    <option>Theo quý</option>
                  </select>
                  <button
                    type="button"
                    className="adm-icon-btn"
                    aria-label="Cài đặt biểu đồ"
                  >
                    ⚙
                  </button>
                </div>
              </div>
              <div className="adm-stat-row">
                <div className="adm-stat-box">
                  <label>Thu nhập</label>
                  <strong>150.090.000 ₫</strong>
                  <div>
                    <span className="up">+12,4%</span>
                  </div>
                </div>
                <div className="adm-stat-box">
                  <label>Chi phí vận hành</label>
                  <strong>90.230.000 ₫</strong>
                  <div>
                    <span className="up">−3,1%</span>
                  </div>
                </div>
              </div>
              <div
                className="adm-bars"
                role="img"
                aria-label="Biểu đồ cột theo tháng, hai loại: đặt xe và doanh thu"
              >
                {BAR_MONTHS.map((m, i) => (
                  <div key={m} className="adm-bar-group">
                    <div className="adm-bar-pair">
                      <div
                        className="adm-bar adm-bar--blue"
                        style={{ height: `${BAR_HEIGHTS_BLUE[i]}%` }}
                        title={`Đặt ${BAR_HEIGHTS_BLUE[i]}%`}
                      />
                      <div
                        className="adm-bar adm-bar--lime"
                        style={{ height: `${BAR_HEIGHTS_LIME[i]}%` }}
                        title={`Doanh thu ${BAR_HEIGHTS_LIME[i]}%`}
                      />
                    </div>
                    <span className="adm-bar-label">{m}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="adm-panel" aria-labelledby="adm-vis-title">
              <div className="adm-panel__head">
                <h2 className="adm-panel__title" id="adm-vis-title">
                  <span aria-hidden>👥</span> Người dùng &amp; kênh
                </h2>
                <div className="adm-panel__tools">
                  <label htmlFor="adm-vis-period" className="visually-hidden">
                    Khoảng thời gian
                  </label>
                  <select id="adm-vis-period" className="adm-select">
                    <option>Tháng này</option>
                    <option>Quý này</option>
                  </select>
                </div>
              </div>
              <div className="adm-visitors__body">
                <div
                  className="adm-bubbles"
                  role="img"
                  aria-label="Tỷ lệ người dùng: cá nhân 2,3k, doanh nghiệp 1,2k, tổ chức 982"
                >
                  <div className="adm-bubble adm-bubble--lg">
                    2,3k
                    <span>Cá nhân</span>
                  </div>
                  <div className="adm-bubble adm-bubble--md">
                    1,2k
                    <span>DN</span>
                  </div>
                  <div className="adm-bubble adm-bubble--sm">
                    982
                    <span>Tổ chức</span>
                  </div>
                </div>
                <div className="adm-targets">
                  <div className="adm-target">
                    <div className="adm-target__row">
                      <span>Mục tiêu cá nhân</span>
                      <span>92%</span>
                    </div>
                    <div className="adm-progress">
                      <div
                        className="adm-progress__fill adm-progress__fill--lime"
                        style={{ width: '92%' }}
                      />
                    </div>
                  </div>
                  <div className="adm-target">
                    <div className="adm-target__row">
                      <span>Mục tiêu doanh nghiệp</span>
                      <span>67%</span>
                    </div>
                    <div className="adm-progress">
                      <div
                        className="adm-progress__fill adm-progress__fill--blue"
                        style={{ width: '67%' }}
                      />
                    </div>
                  </div>
                  <div className="adm-target">
                    <div className="adm-target__row">
                      <span>Mục tiêu tổ chức</span>
                      <span>54%</span>
                    </div>
                    <div className="adm-progress">
                      <div
                        className="adm-progress__fill adm-progress__fill--gray"
                        style={{ width: '54%' }}
                      />
                    </div>
                  </div>
                </div>
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
