import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  type VehicleDto,
  fetchAvailableVehicles,
  formatDailyPrice,
  fuelLabel,
  inferCategory,
  vehicleDisplayName,
} from '../api/vehicles'
import TopNav from '../components/TopNav'
import { Link } from 'react-router-dom'
import {
  fetchPublishedBlogPostsPage,
  type BlogPostPublicDto,
} from '../api/blogPosts'
import './studio-x-landing-page.css'

const SX_BLOG_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'

function formatSxBlogMonthYear(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`
}

function sxBlogCardExcerpt(p: BlogPostPublicDto): string {
  const raw = p.excerpt?.trim()
  if (raw) return raw.length > 200 ? `${raw.slice(0, 197)}…` : raw
  const plain = p.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!plain) return ''
  return plain.length > 200 ? `${plain.slice(0, 197)}…` : plain
}



function VexHeroHeading() {
  const line1 = 'Thuê xe'
  const line2 = 'phù hợp cho mọi chuyến đi'
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [])

  let charIndex = 0
  const renderLine = (text: string) =>
    text.split('').map((ch, i) => {
      const idx = charIndex++
      return (
        <span
          key={`${text}-${i}`}
          className={`vex-hero__char ${animate ? 'vex-hero__char--on' : ''}`}
          style={{ transitionDelay: `${200 + idx * 30}ms` }}
        >
          {ch === ' ' ? '\u00a0' : ch}
        </span>
      )
    })

  return (
    <h1 className="vex-hero__title">
      <span className="vex-hero__title-line">{renderLine(line1)}</span>
      <br />
      <span className="vex-hero__title-line">{renderLine(line2)}</span>
    </h1>
  )
}

function HeroSection() {
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="vex-hero">
      <video
        className="vex-hero__video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      >
        <source src="public/videos/cars-hero.mp4" type="video/mp4" />
      </video>
      <div className="vex-hero__scrim" aria-hidden="true" />

      <div className="vex-hero__content">
        <div className="vex-hero__grid">
          <div className="vex-hero__col vex-hero__col--left">
            <VexHeroHeading />
            <p className="vex-hero__sub">
            Hàng trăm lựa chọn với một mục tiêu là làm bạn có trải nghiệm hài lòng
            </p>
            <div className="vex-hero__actions">
              <a className="vex-hero__btn vex-hero__btn--primary" href="/auth">
                Start a Chat
              </a>
              <button
                type="button"
                className="vex-hero__btn vex-hero__btn--glass liquid-glass"
                onClick={() => go('solutions')}
              >
                Explore Now
              </button>
            </div>
          </div>
          <div className="vex-hero__col vex-hero__col--right">
            <p className="vex-hero__tag liquid-glass">
              Tự Do.An Toàn.Tiện Lợi.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

const LANDING_FUEL_OPTIONS = ['GASOLINE', 'DIESEL', 'ELECTRICITY'] as const
const LANDING_SEAT_OPTIONS = [4, 5, 7, 9, 16] as const

function formatCompactPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))
}

function datetimeLocalNowMin(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}

function QuickSearchSection() {
  const [pickupAt, setPickupAt] = useState('')
  const [returnAt, setReturnAt] = useState('')
  const [seatFilter, setSeatFilter] = useState('all')
  const [fuelFilter, setFuelFilter] = useState('all')
  const [stationFilter, setStationFilter] = useState('all')
  const [availabilityOnly, setAvailabilityOnly] = useState(false)
  const [driverMode, setDriverMode] = useState<'without' | 'with'>('without')
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [priceFilter, setPriceFilter] = useState<{ min: number; max: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nowMinDateTime = useMemo(() => datetimeLocalNowMin(), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchAvailableVehicles()
        if (!cancelled) setVehicles(list)
      } catch {
        if (!cancelled) setVehicles([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const stationOptions = useMemo(() => {
    const ids = new Set<number>()
    for (const v of vehicles) {
      if (typeof v.stationId === 'number' && Number.isFinite(v.stationId)) {
        ids.add(v.stationId)
      }
    }
    return Array.from(ids).sort((a, b) => a - b)
  }, [vehicles])

  const priceBounds = useMemo(() => {
    const prices = vehicles
      .map((v) => Number(v.dailyRate))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (prices.length === 0) return null
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }, [vehicles])

  useEffect(() => {
    if (!priceBounds) {
      setPriceFilter(null)
      return
    }
    setPriceFilter((prev) => {
      if (!prev) return { ...priceBounds }
      return {
        min: Math.max(priceBounds.min, Math.min(prev.min, priceBounds.max)),
        max: Math.min(priceBounds.max, Math.max(prev.max, priceBounds.min)),
      }
    })
  }, [priceBounds])

  const hasValidAvailabilityWindow = useMemo(() => {
    if (!pickupAt || !returnAt) return false
    return new Date(returnAt).getTime() > new Date(pickupAt).getTime()
  }, [pickupAt, returnAt])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (availabilityOnly && !hasValidAvailabilityWindow) {
      setError('Vui lòng chọn mốc nhận/trả hợp lệ để tìm xe trống theo thời gian.')
      return
    }
    setError(null)
    const params = new URLSearchParams()
    if (pickupAt) params.set('pickupAt', pickupAt)
    if (returnAt) params.set('returnAt', returnAt)
    if (seatFilter !== 'all') params.set('seat', seatFilter)
    if (fuelFilter !== 'all') params.set('fuel', fuelFilter)
    if (stationFilter !== 'all') params.set('stationId', stationFilter)
    if (availabilityOnly) params.set('availabilityOnly', '1')
    params.set('driverMode', driverMode)
    if (
      priceBounds &&
      priceFilter &&
      (priceFilter.min !== priceBounds.min || priceFilter.max !== priceBounds.max)
    ) {
      params.set('minDailyRate', String(priceFilter.min))
      params.set('maxDailyRate', String(priceFilter.max))
    }
    const query = params.toString()
    window.location.href = query ? `/rent?${query}` : '/rent'
  }

  return (
    <section id="quick-search" className="sx-quick-search" aria-label="Tìm xe nhanh">
      <div className="sx-quick-search__shell">
        <form className="sx-quick-search__form" onSubmit={onSubmit}>
          <div className="sx-quick-search__row sx-quick-search__row--date">
            <label className="sx-quick-search__field">
              <span className="sx-quick-search__label">Pick Up Date &amp; Time</span>
              <div className="sx-quick-search__input">
                <span aria-hidden="true">📅</span>
                <input
                  type="datetime-local"
                  min={nowMinDateTime}
                  value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                />
              </div>
            </label>
            <label className="sx-quick-search__field">
              <span className="sx-quick-search__label">Return Date &amp; Time</span>
              <div className="sx-quick-search__input">
                <span aria-hidden="true">📅</span>
                <input
                  type="datetime-local"
                  min={pickupAt || nowMinDateTime}
                  value={returnAt}
                  onChange={(e) => setReturnAt(e.target.value)}
                />
              </div>
            </label>
          </div>

          <div className="sx-quick-search__row sx-quick-search__row--filters">
            <label className="sx-quick-search__select">
              <span>Số chỗ</span>
              <select value={seatFilter} onChange={(e) => setSeatFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                {LANDING_SEAT_OPTIONS.map((seat) => (
                  <option key={seat} value={String(seat)}>
                    {seat} chỗ
                  </option>
                ))}
              </select>
            </label>
            <label className="sx-quick-search__select">
              <span>Loại nhiên liệu</span>
              <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                {LANDING_FUEL_OPTIONS.map((fuel) => (
                  <option key={fuel} value={fuel}>
                    {fuelLabel(fuel)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sx-quick-search__select">
              <span>Trạm</span>
              <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                {stationOptions.map((stationId) => (
                  <option key={stationId} value={String(stationId)}>
                    Trạm #{stationId}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="sx-quick-search__toggle">
            <input
              type="checkbox"
              checked={availabilityOnly}
              onChange={(e) => setAvailabilityOnly(e.target.checked)}
            />
            Chỉ hiển thị xe trống trong khung thời gian đã chọn (Pick up / Return)
          </label>

          {priceBounds && priceFilter ? (
            <div className="sx-quick-search__price" role="group" aria-label="Giá theo ngày">
              <div className="sx-quick-search__price-head">
                <strong>Giá theo ngày</strong>
                <span>
                  {formatCompactPrice(priceFilter.min)} - {formatCompactPrice(priceFilter.max)} ₫
                </span>
              </div>
              <div className="sx-quick-search__price-sliders">
                <div className="sx-quick-search__price-slider-wrap">
                  <div className="sx-quick-search__price-track" aria-hidden="true" />
                  <div
                    className="sx-quick-search__price-active"
                    aria-hidden="true"
                    style={{
                      left: `${((priceFilter.min - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                      right: `${100 - ((priceFilter.max - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                    }}
                  />
                  <input
                    className="sx-quick-search__price-thumb sx-quick-search__price-thumb--min"
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={50000}
                    value={priceFilter.min}
                    aria-label="Giá thấp nhất"
                    onChange={(e) => {
                      const nextMin = Number(e.target.value)
                      setPriceFilter((prev) => {
                        if (!prev) return prev
                        return { min: Math.min(nextMin, prev.max), max: prev.max }
                      })
                    }}
                  />
                  <input
                    className="sx-quick-search__price-thumb sx-quick-search__price-thumb--max"
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={50000}
                    value={priceFilter.max}
                    aria-label="Giá cao nhất"
                    onChange={(e) => {
                      const nextMax = Number(e.target.value)
                      setPriceFilter((prev) => {
                        if (!prev) return prev
                        return { min: prev.min, max: Math.max(nextMax, prev.min) }
                      })
                    }}
                  />
                </div>
              </div>
              <div className="sx-quick-search__price-ends">
                <span>Từ: {formatCompactPrice(priceBounds.min)} ₫</span>
                <span>Đến: {formatCompactPrice(priceBounds.max)} ₫</span>
              </div>
            </div>
          ) : null}

          {error ? <p className="sx-quick-search__error">{error}</p> : null}

          <div className="sx-quick-search__actions">
            <div className="sx-quick-search__driver" role="group" aria-label="Driver option">
              <button
                type="button"
                className={driverMode === 'without' ? 'is-active' : ''}
                onClick={() => setDriverMode('without')}
              >
                Without Driver
              </button>
              <button
                type="button"
                className={driverMode === 'with' ? 'is-active' : ''}
                onClick={() => setDriverMode('with')}
              >
                With Driver
              </button>
            </div>
            <button type="submit" className="sx-quick-search__submit">
              Search →
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function FloatingDock() {
  return (
    <nav className="sx-dock" aria-label="Quick actions">
      <div className="sx-dock__inner sx-dock__inner--vex">
        <span className="sx-dock__logo sx-dock__logo--vex" aria-hidden="true">
          VEX
        </span>
        <button
          type="button"
          className="sx-dock__menu sx-dock__menu--vex"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="sx-dock__menu-icon sx-dock__menu-icon--vex" />
          TOP
        </button>
        <a className="sx-dock__contact sx-dock__contact--vex sx-dock__contact--link" href="/auth">
          Start a Chat
        </a>
      </div>
    </nav>
  )
}

type SolutionTabKey = 'vehicle' | 'renter'

const SOLUTION_TABS: { key: SolutionTabKey; label: string }[] = [
  { key: 'vehicle', label: 'Người cho thuê' },
  { key: 'renter', label: 'Người thuê' },
]

const SOLUTIONS_DATA: Record<
  SolutionTabKey,
  {
    image: string
    useCases: { id: string; icon: string; title: string; description: string }[]
    industries: { id: string; icon: string; name: string }[]
  }
> = {
  vehicle: {
    image: '/studio-x/image-70b64552-357c-4099-b9d0-0e9e60fac1bb.png',
    useCases: [
      {
        id: 'v1',
        icon: 'B1',
        title: 'Đăng ký hồ sơ xe',
        description: 'Chủ xe khai thông tin cơ bản, giấy tờ xe, ảnh thực tế và chọn bãi bàn giao.',
      },
      {
        id: 'v2',
        icon: 'B2',
        title: 'Thiết lập giá và lịch cho thuê',
        description: 'Đặt giá theo ngày, tiền cọc và khung giờ mở lịch để nhận booking phù hợp.',
      },
      {
        id: 'v3',
        icon: 'B3',
        title: 'Xác nhận và bàn giao tại bãi',
        description: 'Duyệt booking, kiểm tra checklist nhận xe, ghi nhận ảnh và tình trạng ban đầu.',
      },
      {
        id: 'v4',
        icon: 'B4',
        title: 'Đối soát doanh thu',
        description: 'Theo dõi trạng thái đơn, doanh thu nhận về và lịch sử đánh giá từ người thuê.',
      },
    ],
    industries: [
      { id: 'vi1', icon: '4C', name: 'Xe 4 chỗ' },
      { id: 'vi2', icon: '7C', name: 'Xe 7 chỗ' },
      { id: 'vi3', icon: 'ST', name: 'Xe số tự động' },
      { id: 'vi4', icon: 'SS', name: 'Xe số sàn' },
      { id: 'vi5', icon: 'XD', name: 'Xe dịch vụ' },
      { id: 'vi6', icon: 'TX', name: 'Xe tiết kiệm nhiên liệu' },
    ],
  },
  renter: {
    image: '/studio-x/image-36fd5371-0f7b-4722-85c1-5909858347b5.png',
    useCases: [
      {
        id: 'r1',
        icon: 'B1',
        title: 'Đăng ký và xác minh tài khoản',
        description: 'Người thuê tạo tài khoản, xác thực thông tin cơ bản để đủ điều kiện đặt xe.',
      },
      {
        id: 'r2',
        icon: 'B2',
        title: 'Chọn xe phù hợp nhu cầu',
        description: 'Lọc theo loại xe, số chỗ, giá và bãi nhận để chọn đúng chuyến đi mong muốn.',
      },
      {
        id: 'r3',
        icon: 'B3',
        title: 'Thanh toán và xác nhận đơn',
        description: 'Kiểm tra tổng phí, cọc và trạng thái đơn trước khi đến nhận xe tại bãi.',
      },
      {
        id: 'r4',
        icon: 'B4',
        title: 'Nhận xe và tận hưởng chuyến đi',
        description: 'Nhận xe đúng trạm, kiểm tra bàn giao nhanh và theo dõi lịch sử thuê sau chuyến đi.',
      },
    ],
    industries: [
      { id: 'ri1', icon: 'SV', name: 'Sinh viên' },
      { id: 'ri2', icon: 'NV', name: 'Nhân viên văn phòng' },
      { id: 'ri3', icon: 'HK', name: 'Khách du lịch' },
      { id: 'ri4', icon: 'DN', name: 'Doanh nghiệp nhỏ' },
      { id: 'ri5', icon: 'TC', name: 'Tài xế công nghệ' },
      { id: 'ri6', icon: 'GD', name: 'Gia đình' },
    ],
  },
}

function SolutionsSection() {
  const [activeTab, setActiveTab] = useState<SolutionTabKey>('vehicle')
  const activeTabIndex = SOLUTION_TABS.findIndex((t) => t.key === activeTab)
  const activeData = useMemo(() => SOLUTIONS_DATA[activeTab], [activeTab])

  const onTabsKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    event.preventDefault()
    let nextIndex = activeTabIndex
    if (event.key === 'ArrowRight') {
      nextIndex = (activeTabIndex + 1) % SOLUTION_TABS.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (activeTabIndex - 1 + SOLUTION_TABS.length) % SOLUTION_TABS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = SOLUTION_TABS.length - 1
    }
    setActiveTab(SOLUTION_TABS[nextIndex].key)
  }

  return (
    <section id="solutions" className="sx-solutions">
      <div className="sx-solutions__inner">
        <aside className="sx-solutions__media" aria-hidden="true">
          <img src={activeData.image} alt="" loading="lazy" />
        </aside>

        <div className="sx-solutions__content">
          <h3 className="sx-solutions__section-title">Tình huống sử dụng</h3>
          <div
            className="sx-solutions__tabs"
            role="tablist"
            aria-label="Các nhóm tính năng"
            onKeyDown={onTabsKeyDown}
          >
            {SOLUTION_TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  id={`solution-tab-${tab.key}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`solution-panel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`sx-solutions__tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div
            key={activeTab}
            id={`solution-panel-${activeTab}`}
            className="sx-solutions__panel"
            role="tabpanel"
            aria-labelledby={`solution-tab-${activeTab}`}
          >
            <div className="sx-solutions__use-cases">
              {activeData.useCases.map((item) => (
                <article key={item.id} className="sx-solutions__use-case">
                  <span className="sx-solutions__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const VFLEET_PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80'

const VFLEET_PREVIEW_MAX = 7

function vfleetCardImage(v: VehicleDto): string {
  const p = v.photos?.[0]
  if (!p || !p.trim()) return VFLEET_PLACEHOLDER_IMG
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return p
}

function vfleetRatingDisplay(v: VehicleDto): string {
  const r = v.rating
  if (r == null || r <= 0) return '—'
  return r.toFixed(1)
}

function vfleetDoorsGuess(cap: number | null | undefined): number {
  if (cap == null || cap <= 0) return 4
  return cap <= 4 ? 4 : 5
}

function ProjectsSection() {
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fuelFilter, setFuelFilter] = useState<'ALL' | 'GASOLINE' | 'ELECTRICITY' | 'DIESEL'>('ALL')
  const [seatFilter, setSeatFilter] = useState<'ALL' | 5 | 7 | 9 | 16>('ALL')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchAvailableVehicles()
        if (!cancelled) setVehicles(list)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Không tải được danh sách xe.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const fuelOk =
        fuelFilter === 'ALL' || (v.fuelType ?? '').toUpperCase() === fuelFilter
      const seatOk = seatFilter === 'ALL' || v.capacity === seatFilter
      return fuelOk && seatOk
    })
  }, [fuelFilter, seatFilter, vehicles])

  const preview = filteredVehicles.slice(0, VFLEET_PREVIEW_MAX)

  return (
    <section id="projects" className="sx-projects sx-projects--fleet">
      <h2 className="sx-projects__title">Khám phá xe phù hợp cho bạn</h2>

      <div className="sx-projects__fleet-filters" role="group" aria-label="Lọc theo nhiên liệu">
        <button
          type="button"
          className={`sx-projects__fleet-filter ${fuelFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setFuelFilter('ALL')}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`sx-projects__fleet-filter ${fuelFilter === 'GASOLINE' ? 'is-active' : ''}`}
          onClick={() => setFuelFilter('GASOLINE')}
        >
          Xăng
        </button>
        <button
          type="button"
          className={`sx-projects__fleet-filter ${fuelFilter === 'ELECTRICITY' ? 'is-active' : ''}`}
          onClick={() => setFuelFilter('ELECTRICITY')}
        >
          Điện
        </button>
        <button
          type="button"
          className={`sx-projects__fleet-filter ${fuelFilter === 'DIESEL' ? 'is-active' : ''}`}
          onClick={() => setFuelFilter('DIESEL')}
        >
          Dầu
        </button>
      </div>
      <div className="sx-projects__fleet-filters" role="group" aria-label="Lọc theo số chỗ">
        <button
          type="button"
          className={`sx-projects__fleet-filter ${seatFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setSeatFilter('ALL')}
        >
          Tất cả chỗ
        </button>
        <button
          type="button"
          className={`sx-projects__fleet-filter ${seatFilter === 5 ? 'is-active' : ''}`}
          onClick={() => setSeatFilter(5)}
        >
          5 chỗ
        </button>
        <button
          type="button"
          className={`sx-projects__fleet-filter ${seatFilter === 7 ? 'is-active' : ''}`}
          onClick={() => setSeatFilter(7)}
        >
          7 chỗ
        </button>
        <button
          type="button"
          className={`sx-projects__fleet-filter ${seatFilter === 9 ? 'is-active' : ''}`}
          onClick={() => setSeatFilter(9)}
        >
          9 chỗ
        </button>
        <button
          type="button"
          className={`sx-projects__fleet-filter ${seatFilter === 16 ? 'is-active' : ''}`}
          onClick={() => setSeatFilter(16)}
        >
          16 chỗ
        </button>
      </div>
      {loading ? (
        <p className="sx-projects__fleet-status" role="status">
          Đang tải danh sách xe…
        </p>
      ) : null}
      {error ? (
        <p className="sx-projects__fleet-status sx-projects__fleet-status--error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && preview.length === 0 ? (
        <p className="sx-projects__fleet-status" role="status">
          Không có xe phù hợp với bộ lọc nhiên liệu đã chọn.
        </p>
      ) : null}
      <div className="sx-vfleet-grid">
        {preview.map((v) => (
          <a key={v.id} className="sx-vfleet-card" href={`/rent/${v.id}`}>
            <div className="sx-vfleet-card__media">
              <img src={vfleetCardImage(v)} alt={vehicleDisplayName(v)} loading="lazy" />
              <span className="sx-vfleet-card__tag">{inferCategory(v)}</span>
            </div>
            <div className="sx-vfleet-card__body">
              <h3 className="sx-vfleet-card__title">{vehicleDisplayName(v)}</h3>
              <div className="sx-vfleet-card__meta">
                <span title="Nhiên liệu">⚙ {fuelLabel(v.fuelType)}</span>
                <span title="Số chỗ">👥 {v.capacity ?? '—'}</span>
                <span title="Cửa (ước lượng)">🚪 {vfleetDoorsGuess(v.capacity)}</span>
                <span title="Đánh giá">⭐ {vfleetRatingDisplay(v)}</span>
                {v.rentCount != null && v.rentCount > 0 ? (
                  <span title="Số lượt thuê">📋 {v.rentCount}</span>
                ) : null}
              </div>
            </div>
            <div className="sx-vfleet-card__price">
              <span className="sx-vfleet-card__price-label">Start from</span>
              <div>
                <strong>{formatDailyPrice(v)}</strong>
                <span> / day</span>
              </div>
              <div className="sx-vfleet-card__plate">
                Bãi #{v.stationId} · {v.licensePlate}
              </div>
            </div>
          </a>
        ))}
        <a className="sx-vfleet-card sx-vfleet-card--more" href="/rent">
          <div className="sx-vfleet-card__media sx-vfleet-card__media--more">
            <span className="sx-vfleet-card__more-icon" aria-hidden="true">
              +
            </span>
          </div>
          <div className="sx-vfleet-card__body sx-vfleet-card__body--more">
            <span className="sx-vfleet-card__more-label">Xem thêm</span>
            <span className="sx-vfleet-card__more-sub">Toàn bộ xe trên trang thuê</span>
          </div>
        </a>
      </div>
    </section>
  )
}

function BlogSection() {
  const [posts, setPosts] = useState<BlogPostPublicDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchPublishedBlogPostsPage({
          page: 0,
          size: 3,
          sortBy: 'publishedAt',
          sortDir: 'desc',
        })
        if (!cancelled) setPosts(res.content ?? [])
      } catch (e) {
        if (!cancelled) {
          setPosts([])
          setError(e instanceof Error ? e.message : 'Không tải được bài viết.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const preview = posts.slice(0, 3)

  return (
    <section id="insights" className="sx-blog">
      <h2 className="sx-blog__title">Bài viết &amp; gợi ý cho đồ án</h2>

      {loading ? (
        <p className="sx-blog__status" role="status">
          Đang tải bài viết…
        </p>
      ) : null}
      {error ? (
        <p className="sx-blog__status sx-blog__status--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && preview.length === 0 ? (
        <p className="sx-blog__status" role="status">
          Chưa có bài xuất bản. Thêm bài trong admin hoặc xem trang blog khi có nội dung.
        </p>
      ) : null}

      {!loading && preview.length > 0 ? (
        <div className="sx-blog__grid">
          {preview.map((post) => (
            <Link
              key={post.id}
              className="sx-blog-card"
              to={`/blog/${encodeURIComponent(post.slug)}`}
            >
              <time className="sx-blog-card__date" dateTime={post.publishedAt ?? undefined}>
                {formatSxBlogMonthYear(post.publishedAt) || '—'}
              </time>
              <h3 className="sx-blog-card__head">{post.title}</h3>
              <p className="sx-blog-card__excerpt">{sxBlogCardExcerpt(post)}</p>
              <div className="sx-blog-card__media">
                <img
                  src={(post.coverImageUrl && post.coverImageUrl.trim()) || SX_BLOG_FALLBACK_IMAGE}
                  alt=""
                  loading="lazy"
                />
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="sx-blog__cta-wrap">
        <Link to="/blog" className="sx-blog__cta">
          Xem thêm
          <svg
            className="sx-blog__cta-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 10h10M12 7l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </section>
  )
}

function ImpactStatsSection() {
  return (
    <section className="sx-impact" aria-label="Thống kê nền tảng">
      <div className="sx-impact__grid">
        <article className="sx-impact__item">
          <strong className="sx-impact__value">100+</strong>
          <span className="sx-impact__label">Hãng xe / Chủ xe tham gia</span>
        </article>
        <article className="sx-impact__item">
          <strong className="sx-impact__value">500k+</strong>
          <span className="sx-impact__label">Phiên đặt xe toàn hệ thống</span>
        </article>
        <article className="sx-impact__item">
          <strong className="sx-impact__value">4.9+</strong>
          <span className="sx-impact__label">Điểm đánh giá trung bình từ khách thuê</span>
        </article>
      </div>
    </section>
  )
}

function ValueShowcaseSection() {
  return (
    <section className="sx-value-showcase" aria-label="Giới thiệu giá trị nền tảng">
      <div className="sx-value-showcase__grid">
        <article className="sx-value-showcase__intro">
          <p className="sx-value-showcase__eyebrow">Nền tảng cho thuê xe thông minh</p>
          <h2 className="sx-value-showcase__title">
            Khám phá giá trị thật từ mô hình kết nối chủ xe và người thuê
          </h2>
          <p className="sx-value-showcase__desc">
            Chúng tôi xây dựng quy trình đặt xe rõ ràng, tập trung vào tính minh bạch khi
            nhận/trả tại bãi, giúp người thuê chọn xe phù hợp và giúp chủ xe tối ưu hiệu suất khai
            thác.
          </p>
          <a className="sx-value-showcase__cta" href="/rent">
            Tìm xe phù hợp ngay →
          </a>
        </article>

        <div className="sx-value-showcase__visual">
          <article className="sx-value-card">
            <h3>Gợi ý thông minh</h3>
            <p>Hệ thống lọc theo thời gian, loại xe, trạm và khoảng giá để rút ngắn thời gian tìm kiếm.</p>
          </article>
          <article className="sx-value-card">
            <h3>Đối soát rõ ràng</h3>
            <p>Phân tách phí nền tảng, doanh thu chủ xe và lịch sử booking minh bạch theo từng đơn.</p>
          </article>
          <article className="sx-value-card sx-value-card--image">
            <img
              src="/studio-x/image-c6cdb887-89e5-4f60-912f-416dffc9349d.png"
              alt="Bãi giao nhận xe"
              loading="lazy"
            />
            <div>
              <h3>Nhận xe đúng điểm</h3>
              <p>Bàn giao tại trạm giúp giảm tranh chấp và tăng trải nghiệm an toàn cho cả hai phía.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

function FooterSection() {
  return (
    <footer id="footer" className="sx-footer">
      <div className="sx-footer__top">
        <div className="sx-footer__brand">
          <span className="sx-footer__logo">GX</span>
          <p>
            Ứng dụng gọi / cho thuê xe — kết nối chủ xe và người thuê, nhận trả xe
            tại bãi, nền tảng thu phí dịch vụ.
          </p>
          <a className="sx-footer__primary-cta sx-footer__primary-cta--link" href="/auth">
            Đăng ký / Đăng nhập
          </a>
        </div>
        <div className="sx-footer__cols">
          <div>
            <h3 className="sx-footer__col-title">Trang</h3>
            <ul>
              <li>
                <a href="#solutions">Vai trò</a>
              </li>
              <li>
                <a href="#projects">Tính năng</a>
              </li>
              <li>
                <a href="/rent">Xe sẵn sàng cho thuê</a>
              </li>
              <li>
                <a href="/admin">Quản trị (demo UI)</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="sx-footer__col-title">Thêm</h3>
            <ul>
              <li>
                <a href="#insights">Bài viết</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="sx-footer__col-title">Liên hệ (demo)</h3>
            <ul>
              <li>support@ungdunggoixe.local</li>
              <li>+84 (demo)</li>
              <li>Việt Nam</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="sx-footer__bottom">
        <span>© {new Date().getFullYear()} Đồ án — Ứng dụng gọi xe / cho thuê xe</span>
        <span>Chính sách · Điều khoản</span>
      </div>
    </footer>
  )
}

/**
 * Landing đồ án: cho thuê xe P2P, nhận xe tại bãi, phí nền tảng — layout Studio-style.
 */
function StudioXLandingPage() {
  const [navSolid, setNavSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * 0.75
      setNavSolid(window.scrollY > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="sx-page">
      <TopNav solid={navSolid} showSearch={false} />
      <HeroSection />
      <main>
        <QuickSearchSection />
        <ProjectsSection />
        <SolutionsSection />
        <ImpactStatsSection />
        <ValueShowcaseSection />
        <BlogSection />
      </main>
      <FooterSection />
      <FloatingDock />
    </div>
  )
}

export default StudioXLandingPage
