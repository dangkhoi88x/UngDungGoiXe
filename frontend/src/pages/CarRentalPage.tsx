import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  type VehicleCategory,
  type VehicleDto,
  fetchAvailableVehicles,
  formatDailyPrice,
  fuelLabel,
  inferCategory,
  vehicleDisplayName,
} from '../api/vehicles'
import './CarRentalPage.css'

const CATEGORIES: Array<'All' | VehicleCategory> = [
  'All',
  'Hatchback',
  'Minivan',
  'SUV',
  'Sedan',
  'MPV',
]

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80'

function cardImage(v: VehicleDto): string {
  const p = v.photos?.[0]
  if (!p || !p.trim()) return PLACEHOLDER_IMG
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return p
}

function ratingDisplay(v: VehicleDto): string {
  const r = v.rating
  if (r == null || r <= 0) return '—'
  return r.toFixed(1)
}

function doorsGuess(cap: number | null | undefined): number {
  if (cap == null || cap <= 0) return 4
  return cap <= 4 ? 4 : 5
}

export default function CarRentalPage() {
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [query, setQuery] = useState('')
  const [navQuery, setNavQuery] = useState('')
  const [roundTrip, setRoundTrip] = useState(true)
  const [driverMode, setDriverMode] = useState<'without' | 'with'>('without')
  const [authUi, setAuthUi] = useState<{ loggedIn: boolean; displayName: string | null }>({
    loggedIn: false,
    displayName: null,
  })

  useEffect(() => {
    const sync = () => {
      const token = localStorage.getItem('accessToken')
      const displayName = localStorage.getItem('userDisplayName')?.trim() || null
      setAuthUi({ loggedIn: Boolean(token), displayName })
    }
    sync()
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchAvailableVehicles()
      setVehicles(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách xe.')
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    let list = vehicles
    if (activeCategory !== 'All') {
      list = list.filter((v) => inferCategory(v) === activeCategory)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((v) => {
        const name = vehicleDisplayName(v).toLowerCase()
        const brand = (v.brand || '').toLowerCase()
        const plate = (v.licensePlate || '').toLowerCase()
        return name.includes(q) || brand.includes(q) || plate.includes(q)
      })
    }
    return list
  }, [vehicles, activeCategory, query])

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const dep = String(fd.get('departure') ?? '').trim()
    setQuery(dep || navQuery.trim())
  }

  function handleNavSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setQuery(navQuery.trim())
  }

  return (
    <div className="cr-page">
      <header className="cr-nav">
        <div className="cr-nav__left">
          <a className="cr-nav__logo" href="/">
            <span className="cr-nav__logo-mark" aria-hidden="true">
              H
            </span>
            Horizon
          </a>
          <ul className="cr-nav__links">
            <li>
              <a href="#">Hotel</a>
            </li>
            <li>
              <a href="#">Flight</a>
            </li>
            <li>
              <a href="#">Train</a>
            </li>
            <li>
              <a href="#">Travel</a>
            </li>
            <li>
              <a href="/rent" className="is-active">
                Car Rental
              </a>
            </li>
          </ul>
        </div>
        <div className="cr-nav__search-wrap">
          <form className="cr-nav__search" onSubmit={handleNavSearchSubmit} role="search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              name="navSearch"
              placeholder="Search destination..."
              aria-label="Search destination"
              value={navQuery}
              onChange={(ev) => setNavQuery(ev.target.value)}
            />
          </form>
        </div>
        <div className="cr-nav__right">
          <button type="button" className="cr-nav__lang" aria-label="Language English">
            🌐 EN
          </button>
          {authUi.loggedIn ? (
            <>
              <a
                className="cr-nav__account-btn"
                href="/account"
                title={authUi.displayName ?? 'Tài khoản'}
              >
                {authUi.displayName ? `Hi, ${authUi.displayName}` : 'My Account'}
              </a>
              <a className="cr-nav__logout-btn" href="/logout">
                Log Out
              </a>
            </>
          ) : (
            <>
              <a className="cr-nav__login" href="/auth">
                Log In
              </a>
              <a className="cr-nav__signup" href="/auth">
                Sign Up
              </a>
            </>
          )}
        </div>
      </header>

      <section className="cr-hero" aria-labelledby="cr-hero-title">
        <div className="cr-hero__bg" aria-hidden="true" />
        <h1 id="cr-hero-title" className="cr-hero__title">
          Rent a Car for Every Journey
        </h1>
        <div className="cr-hero__form-wrap">
          <form className="cr-search-form" onSubmit={handleSearchSubmit} aria-label="Tìm xe thuê">
            <div className="cr-search-form__row">
              <div className="cr-field">
                <label htmlFor="cr-departure">Departure</label>
                <div className="cr-field__input">
                  <span aria-hidden="true">📍</span>
                  <input
                    id="cr-departure"
                    name="departure"
                    placeholder="City, airport or station"
                    autoComplete="off"
                  />
                </div>
              </div>
              <label className="cr-toggle">
                <input
                  type="checkbox"
                  checked={roundTrip}
                  onChange={(e) => setRoundTrip(e.target.checked)}
                  aria-label="Round trip"
                />
                Round-trip?
              </label>
              {roundTrip ? (
                <div className="cr-field">
                  <label htmlFor="cr-return-loc">Return Location</label>
                  <div className="cr-field__input">
                    <span aria-hidden="true">📍</span>
                    <input
                      id="cr-return-loc"
                      name="returnLocation"
                      placeholder="City, airport or station"
                      autoComplete="off"
                    />
                  </div>
                </div>
              ) : null}
              <div className="cr-field">
                <label htmlFor="cr-pickup-dt">Pick Up Date &amp; Time</label>
                <div className="cr-field__input">
                  <span aria-hidden="true">📅</span>
                  <input id="cr-pickup-dt" name="pickup" type="datetime-local" />
                </div>
              </div>
              <div className="cr-field">
                <label htmlFor="cr-return-dt">Return Date &amp; Time</label>
                <div className="cr-field__input">
                  <span aria-hidden="true">📅</span>
                  <input id="cr-return-dt" name="return" type="datetime-local" />
                </div>
              </div>
            </div>
            <div className="cr-search-form__filters">
              <div className="cr-driver-toggle" role="group" aria-label="Driver option">
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
              <button type="submit" className="cr-search-form__submit">
                Search →
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="cr-listing" aria-labelledby="cr-listing-title">
        <div className="cr-listing__head">
          <h2 id="cr-listing-title">Top picks vehicle this month</h2>
          <p>Experience the epitome of amazing journey with our top picks.</p>
        </div>

        <p className="cr-listing__head" style={{ marginBottom: 0, fontSize: '0.8125rem', color: '#666' }}>
          Hiển thị xe có trạng thái <strong>AVAILABLE</strong> từ API <code>/vehicles?status=AVAILABLE</code>
          {query ? (
            <>
              {' '}
              — lọc theo từ khóa: <strong>{query}</strong>
            </>
          ) : null}
        </p>

        <div className="cr-categories" role="tablist" aria-label="Vehicle category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              className={`cr-cat-btn ${activeCategory === cat ? 'is-active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {error ? (
          <div className="cr-alert cr-alert--error" role="alert">
            {error}{' '}
            <button type="button" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="cr-loading">Đang tải danh sách xe…</div>
        ) : !error && filtered.length === 0 ? (
          <div className="cr-alert cr-alert--empty">
            Chưa có xe sẵn sàng cho thuê hoặc không khớp bộ lọc. Thêm xe (trạng thái AVAILABLE) trong
            database hoặc đổi danh mục / từ khóa.
          </div>
        ) : (
          <div className="cr-grid">
            {filtered.map((v) => (
              <a key={v.id} className="cr-card" href={`/rent/${v.id}`}>
                <div className="cr-card__media">
                  <img src={cardImage(v)} alt={vehicleDisplayName(v)} loading="lazy" />
                  <span className="cr-card__tag">{inferCategory(v)}</span>
                </div>
                <div className="cr-card__body">
                  <h3 className="cr-card__title">{vehicleDisplayName(v)}</h3>
                  <div className="cr-card__meta">
                    <span title="Nhiên liệu / hộp số (demo)">⚙ {fuelLabel(v.fuelType)}</span>
                    <span title="Số chỗ">👥 {v.capacity ?? '—'}</span>
                    <span title="Cửa (ước lượng)">🚪 {doorsGuess(v.capacity)}</span>
                    <span title="Đánh giá">⭐ {ratingDisplay(v)}</span>
                    {v.rentCount != null && v.rentCount > 0 ? (
                      <span title="Số lượt thuê">📋 {v.rentCount}</span>
                    ) : null}
                  </div>
                </div>
                <div className="cr-card__price">
                  <span className="cr-card__price-label">Start from</span>
                  <div>
                    <strong>{formatDailyPrice(v)}</strong>
                    <span> / day</span>
                  </div>
                  <div className="cr-card__plate">Bãi #{v.stationId} · {v.licensePlate}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer className="cr-footer">
        <div className="cr-footer__inner">
          <div>
            <strong style={{ color: '#fff' }}>Horizon</strong> — Car rental listing (đồ án Ứng dụng gọi
            xe).
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/">Trang chủ</a>
            <a href="/auth">Đăng nhập</a>
            <a href="/rent">Car Rental</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
