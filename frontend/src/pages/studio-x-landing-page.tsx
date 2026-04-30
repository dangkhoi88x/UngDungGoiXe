import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  BLOG_POSTS,
} from './studio-x-content'
import {
  type VehicleDto,
  fetchAvailableVehicles,
  formatDailyPrice,
  fuelLabel,
  inferCategory,
  vehicleDisplayName,
} from '../api/vehicles'
import TopNav from '../components/TopNav'
import './studio-x-landing-page.css'



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

type SolutionTabKey = 'booking' | 'station' | 'vehicle' | 'renter'

const SOLUTION_TABS: { key: SolutionTabKey; label: string }[] = [
  { key: 'booking', label: 'Đặt xe' },
  { key: 'station', label: 'Bãi xe' },
  { key: 'vehicle', label: 'Phương tiện' },
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
  booking: {
    image: '/studio-x/image-3f6a4c78-a451-4312-9842-714013e08e43.png',
    useCases: [
      {
        id: 'b1',
        icon: 'Đ',
        title: 'Tạo đơn thuê',
        description: 'Chọn xe, khung giờ, bãi nhận — hệ thống khóa lịch trùng.',
      },
      {
        id: 'b2',
        icon: '₫',
        title: 'Tính phí & phí nền tảng',
        description: 'Hiển thị tổng tiền, phần phí sàn và phần dành cho chủ xe.',
      },
      {
        id: 'b3',
        icon: 'TT',
        title: 'Thanh toán',
        description: 'Xác nhận thanh toán trước khi bàn giao (tích hợp trong đồ án).',
      },
      {
        id: 'b4',
        icon: 'TB',
        title: 'Thông báo trạng thái',
        description: 'Email / thông báo: đã đặt, chờ nhận xe, đang thuê, đã trả.',
      },
    ],
    industries: [
      { id: 'bi1', icon: 'CN', name: 'Thuê theo ngày' },
      { id: 'bi2', icon: 'TG', name: 'Thuê cuối tuần' },
      { id: 'bi3', icon: 'SB', name: 'Sân bay ↔ bãi' },
      { id: 'bi4', icon: 'CT', name: 'Công tác ngắn hạn' },
      { id: 'bi5', icon: 'GD', name: 'Gia đình đi chơi' },
      { id: 'bi6', icon: 'TX', name: 'Thay xe tạm thời' },
    ],
  },
  station: {
    image: '/studio-x/image-c6cdb887-89e5-4f60-912f-416dffc9349d.png',
    useCases: [
      {
        id: 's1',
        icon: 'B',
        title: 'Quản lý bãi',
        description: 'Danh sách điểm giao: địa chỉ, giờ mở cửa, sức chứa.',
      },
      {
        id: 's2',
        icon: 'BG',
        title: 'Bàn giao tại bãi',
        description: 'Checklist nhận / trả: ảnh, km, xăng — giảm tranh chấp.',
      },
      {
        id: 's3',
        icon: 'LK',
        title: 'Liên kết xe — bãi',
        description: 'Mỗi booking gắn station để renter biết chính xác nơi đến.',
      },
      {
        id: 's4',
        icon: 'BC',
        title: 'Báo cáo cho đồ án',
        description: 'Thống kê lượt giao nhận theo bãi, phục vụ slide & demo.',
      },
    ],
    industries: [
      { id: 'si1', icon: 'T1', name: 'Bãi nội thành' },
      { id: 'si2', icon: 'T2', name: 'Bãi gần cao tốc' },
      { id: 'si3', icon: 'T3', name: 'Khu công nghiệp' },
      { id: 'si4', icon: 'T4', name: 'Trung tâm thương mại' },
      { id: 'si5', icon: 'T5', name: 'Ký túc / khu nhà ở' },
      { id: 'si6', icon: 'T6', name: 'Điểm hợp tác đại lý' },
    ],
  },
  vehicle: {
    image: '/studio-x/image-70b64552-357c-4099-b9d0-0e9e60fac1bb.png',
    useCases: [
      {
        id: 'v1',
        icon: 'XE',
        title: 'Hồ sơ phương tiện',
        description: 'Biển số, loại xe, ảnh, trạng thái (available / rented).',
      },
      {
        id: 'v2',
        icon: 'CH',
        title: 'Chủ xe cho thuê',
        description: 'Owner đăng tin, đặt giá và khung giờ cho thuê.',
      },
      {
        id: 'v3',
        icon: 'BH',
        title: 'Chính sách & giấy tờ',
        description: 'Gợi ý: điều khoản thuê, yêu cầu GPLX khi nhận xe.',
      },
      {
        id: 'v4',
        icon: 'BD',
        title: 'Bảo dưỡng đơn giản',
        description: 'Ghi chú bảo dưỡng / hạn đăng kiểm (mở rộng đồ án).',
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
        icon: 'TK',
        title: 'Tìm xe theo nhu cầu',
        description: 'Lọc khu vực, giá, loại xe và bãi nhận gần bạn.',
      },
      {
        id: 'r2',
        icon: 'Q',
        title: 'Quyền người thuê',
        description: 'Chỉ renter đã xác thực mới đặt được — phù hợp mô hình đồ án.',
      },
      {
        id: 'r3',
        icon: 'NX',
        title: 'Nhận xe tại bãi',
        description: 'Đến đúng station, ký biên bản, kiểm tra xe trước khi chạy.',
      },
      {
        id: 'r4',
        icon: 'LS',
        title: 'Lịch sử booking',
        description: 'Theo dõi đơn đang chạy, đã hoàn tất và đánh giá sau thuê.',
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
  const [activeTab, setActiveTab] = useState<SolutionTabKey>('booking')
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

            <h3 className="sx-solutions__section-title sx-solutions__section-title--industries">
              Kịch bản &amp; đối tượng
            </h3>
            <div className="sx-solutions__industries">
              {activeData.industries.map((industry) => (
                <article key={industry.id} className="sx-solutions__industry">
                  <span className="sx-solutions__icon sx-solutions__icon--small" aria-hidden="true">
                    {industry.icon}
                  </span>
                  <span>{industry.name}</span>
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
      <p className="sx-section-label">(Hệ thống)</p>
      <h2 className="sx-projects__title">Các phân hệ chính của đồ án</h2>
      <p className="sx-projects__fleet-hint">
        Xe có trạng thái <strong>AVAILABLE</strong> từ API{' '}
        <code>/vehicles?status=AVAILABLE</code> — cùng giao diện thẻ như trang thuê xe.
      </p>
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
  return (
    <section id="insights" className="sx-blog">
      <h2 className="sx-blog__title">Bài viết &amp; gợi ý cho đồ án</h2>
      <div className="sx-blog__grid">
        {BLOG_POSTS.map((post) => (
          <article key={post.title} className="sx-blog-card">
            <time className="sx-blog-card__date">{post.date}</time>
            <h3 className="sx-blog-card__head">{post.title}</h3>
            <p className="sx-blog-card__excerpt">{post.excerpt}</p>
            <div className="sx-blog-card__media">
              <img src={post.image} alt={post.title} loading="lazy" />
            </div>
          </article>
        ))}
      </div>
      <div className="sx-blog__cta-wrap">
        <button type="button" className="sx-blog__cta">
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
        </button>
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
        <SolutionsSection />
        <ProjectsSection />
        <BlogSection />
      </main>
      <FooterSection />
      <FloatingDock />
    </div>
  )
}

export default StudioXLandingPage
