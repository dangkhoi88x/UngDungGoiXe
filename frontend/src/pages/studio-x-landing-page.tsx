import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  BLOG_POSTS,
  PROCESS_STEPS,
  TESTIMONIALS,
  type ProcessStep,
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

const VEX_HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4'

function VexHeroHeading() {
  const line1 = 'Shaping tomorrow'
  const line2 = 'with vision and action.'
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
        <source src={VEX_HERO_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="vex-hero__scrim" aria-hidden="true" />

      <div className="vex-hero__content">
        <div className="vex-hero__grid">
          <div className="vex-hero__col vex-hero__col--left">
            <VexHeroHeading />
            <p className="vex-hero__sub">
              We back visionaries and craft ventures that define what comes next.
            </p>
            <div className="vex-hero__actions">
              <a className="vex-hero__btn vex-hero__btn--primary" href="/auth">
                Start a Chat
              </a>
              <button
                type="button"
                className="vex-hero__btn vex-hero__btn--glass liquid-glass"
                onClick={() => go('about')}
              >
                Explore Now
              </button>
            </div>
          </div>
          <div className="vex-hero__col vex-hero__col--right">
            <p className="vex-hero__tag liquid-glass">
              Investing. Building. Advisory.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FloatingDock() {
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="sx-dock" aria-label="Quick actions">
      <div className="sx-dock__inner sx-dock__inner--vex">
        <span className="sx-dock__logo sx-dock__logo--vex" aria-hidden="true">
          VEX
        </span>
        <button type="button" className="sx-dock__menu sx-dock__menu--vex" onClick={() => go('about')}>
          <span className="sx-dock__menu-icon sx-dock__menu-icon--vex" />
          Menu
        </button>
        <a className="sx-dock__contact sx-dock__contact--vex sx-dock__contact--link" href="/auth">
          Start a Chat
        </a>
      </div>
    </nav>
  )
}

function AboutSection() {
  return (
    <section id="about" className="sx-about">
      <p className="sx-section-label">(Đồ án)</p>
      <h2 className="sx-about__title">
        Website cho thuê xe kết nối chủ xe và người thuê: đặt xe trực tuyến, nhận
        và trả xe tại bãi (station), nền tảng thu phí dịch vụ ở giữa.
      </h2>
      <div className="sx-about__grid">
        <div className="sx-about__visual">
          <img
            src="/studio-x/image-c6cdb887-89e5-4f60-912f-416dffc9349d.png"
            alt=""
            loading="lazy"
            width={560}
            height={720}
          />
        </div>
        <div className="sx-about__copy">
          <p className="sx-about__body">
            Hệ thống hỗ trợ nhiều vai trò: người thuê (renter) có quyền tìm xe và
            đặt lịch; chủ xe (owner) có thể đăng phương tiện cho thuê; bãi xe là
            điểm bàn giao minh bạch thay vì giao nhận tùy tiện.
          </p>
          <p className="sx-about__body">
            Chủ trang web / nền tảng đóng vai trò trung gian: cung cấp công nghệ,
            quy trình booking và mô hình thu phí — phù hợp báo cáo đồ án và triển
            khai mở rộng (thanh toán, kiểm duyệt, báo cáo doanh thu).
          </p>
          <a className="sx-text-link" href="/auth">
            Đăng ký / đăng nhập ↗
          </a>
        </div>
      </div>
    </section>
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

  const preview = vehicles.slice(0, VFLEET_PREVIEW_MAX)

  return (
    <section id="projects" className="sx-projects sx-projects--fleet">
      <p className="sx-section-label">(Hệ thống)</p>
      <h2 className="sx-projects__title">Các phân hệ chính của đồ án</h2>
      <p className="sx-projects__fleet-hint">
        Xe có trạng thái <strong>AVAILABLE</strong> từ API{' '}
        <code>/vehicles?status=AVAILABLE</code> — cùng giao diện thẻ như trang thuê xe.
      </p>
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

function ProcessModal({
  step,
  onClose,
}: {
  step: ProcessStep | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!step) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, onClose])

  if (!step) return null

  const n = String(step.id).padStart(2, '0')

  return (
    <div
      className="sx-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sx-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sx-modal">
        <button
          type="button"
          className="sx-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <span className="sx-modal__num">{n}</span>
        <h2 id="sx-modal-title" className="sx-modal__title">
          {step.title}
        </h2>
        <p className="sx-modal__short">{step.short}</p>
        <p className="sx-modal__detail">{step.detail}</p>
      </div>
    </div>
  )
}

function ProcessSection() {
  const [open, setOpen] = useState<ProcessStep | null>(null)

  return (
    <section id="process" className="sx-process">
      <p className="sx-section-label">(Quy trình)</p>
      <h2 className="sx-process__intro">
        Từ đăng ký đến trả xe: quy trình rõ ràng cho mô hình cho thuê ngang hàng,
        nhận xe tại bãi và phí dịch vụ do nền tảng thu.
      </h2>

      <div className="sx-process__scroll">
        <div className="sx-process__track">
          {PROCESS_STEPS.map((s, i) => (
            <div key={s.id} className="sx-process__col">
              {i > 0 ? <div className="sx-process__divider" aria-hidden /> : null}
              <button
                type="button"
                className="sx-process__step"
                onClick={() => setOpen(s)}
              >
                <span className="sx-process__num">
                  {String(s.id).padStart(2, '0')}
                </span>
                <h3 className="sx-process__name">{s.title}</h3>
                <p className="sx-process__short">{s.short}</p>
                <span className="sx-process__more">Chi tiết ↗</span>
                <div className="sx-process__image-wrap">
                  <img
                    className="sx-process__image"
                    src={s.image}
                    alt={s.title}
                    loading="lazy"
                  />
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="sx-process__drag-fab" aria-hidden="true">
        <span className="sx-process__drag-arrow">‹</span>
        <span className="sx-process__drag-pill">Drag</span>
        <span className="sx-process__drag-arrow">›</span>
      </div>

      <ProcessModal step={open} onClose={() => setOpen(null)} />
    </section>
  )
}

function TestimonialsSection() {
  const [i, setI] = useState(0)
  const next = useCallback(
    () => setI((v) => (v + 1) % TESTIMONIALS.length),
    []
  )
  const prev = useCallback(
    () => setI((v) => (v - 1 + TESTIMONIALS.length) % TESTIMONIALS.length),
    []
  )

  const t = TESTIMONIALS[i]

  return (
    <section id="testimonials" className="sx-testimonials">
      <p className="sx-section-label">(Phản hồi)</p>
      <h2 className="sx-testimonials__title">Người dùng &amp; đánh giá mô hình</h2>
      <div className="sx-testimonials__frame">
        <blockquote
          key={i}
          className="sx-testimonials__quote"
        >
          <p>&ldquo;{t.quote}&rdquo;</p>
          <footer>
            <cite className="sx-testimonials__author">{t.author}</cite>
            <span className="sx-testimonials__role">{t.role}</span>
          </footer>
        </blockquote>
        <div className="sx-testimonials__nav">
          <button type="button" onClick={prev} aria-label="Previous testimonial">
            ‹
          </button>
          <button type="button" onClick={next} aria-label="Next testimonial">
            ›
          </button>
        </div>
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
                <a href="#about">Giới thiệu</a>
              </li>
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
                <a href="#process">Quy trình</a>
              </li>
              <li>
                <a href="#insights">Bài viết</a>
              </li>
              <li>
                <a href="#testimonials">Phản hồi</a>
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
      <TopNav solid={navSolid} />
      <HeroSection />
      <main>
        <AboutSection />
        <SolutionsSection />
        <ProjectsSection />
        <ProcessSection />
        <TestimonialsSection />
        <BlogSection />
      </main>
      <FooterSection />
      <FloatingDock />
    </div>
  )
}

export default StudioXLandingPage
