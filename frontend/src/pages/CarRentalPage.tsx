import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { checkVehicleAvailability, fromDateTimeLocalValue } from '../api/bookings'
import {
  type VehicleDto,
  fetchAvailableVehicles,
  formatDailyPrice,
  fuelLabel,
  vehicleDisplayName,
} from '../api/vehicles'
import { type StationDto, fetchStations, stationLabel } from '../api/stations'
import './CarRentalPage.css'

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80'
const FUEL_FILTER_OPTIONS = ['GASOLINE', 'ELECTRICITY', 'DIESEL'] as const
const PAGE_SIZE = 8

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

function parseRate(v: string | number | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function formatPriceCompact(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

function toDateTimeLocalMinValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

export default function CarRentalPage() {
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [stations, setStations] = useState<StationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [navQuery, setNavQuery] = useState('')
  const [driverMode, setDriverMode] = useState<'without' | 'with'>('without')
  const [pickupAt, setPickupAt] = useState('')
  const [returnAt, setReturnAt] = useState('')
  const [authUi, setAuthUi] = useState<{ loggedIn: boolean; displayName: string | null }>({
    loggedIn: false,
    displayName: null,
  })
  const [seatFilter, setSeatFilter] = useState('all')
  const [fuelFilter, setFuelFilter] = useState('all')
  const [stationFilter, setStationFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState<{ min: number; max: number } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [availabilityOnly, setAvailabilityOnly] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, boolean>>({})
  const [nowMinDateTime, setNowMinDateTime] = useState(() => toDateTimeLocalMinValue(new Date()))

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

  useEffect(() => {
    let mounted = true
    const loadStations = async () => {
      try {
        const list = await fetchStations()
        if (!mounted) return
        setStations(list)
      } catch {
        if (!mounted) return
        setStations([])
      }
    }
    void loadStations()
    return () => {
      mounted = false
    }
  }, [])

  const priceBounds = useMemo(() => {
    const rates = vehicles
      .map((v) => parseRate(v.dailyRate))
      .filter((n): n is number => n != null && n > 0)
    if (rates.length === 0) return null
    return {
      min: Math.floor(Math.min(...rates)),
      max: Math.ceil(Math.max(...rates)),
    }
  }, [vehicles])

  useEffect(() => {
    if (!priceBounds) {
      setPriceFilter(null)
      return
    }
    setPriceFilter((prev) => {
      if (!prev) return { min: priceBounds.min, max: priceBounds.max }
      const min = Math.max(priceBounds.min, Math.min(prev.min, priceBounds.max))
      const max = Math.min(priceBounds.max, Math.max(prev.max, priceBounds.min))
      return min <= max ? { min, max } : { min: priceBounds.min, max: priceBounds.max }
    })
  }, [priceBounds])

  const stationNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of stations) map.set(s.id, stationLabel(s))
    return map
  }, [stations])

  const seatOptions = useMemo(() => {
    const values = Array.from(
      new Set(vehicles.map((v) => v.capacity).filter((v): v is number => v != null && v > 0)),
    )
    values.sort((a, b) => a - b)
    return values
  }, [vehicles])

  const stationOptions = useMemo(() => {
    const ids = Array.from(
      new Set(vehicles.map((v) => v.stationId).filter((id): id is number => Number.isFinite(id))),
    )
    ids.sort((a, b) => a - b)
    return ids
  }, [vehicles])

  const hasValidAvailabilityWindow = useMemo(() => {
    if (!pickupAt || !returnAt) return false
    return new Date(returnAt).getTime() > new Date(pickupAt).getTime()
  }, [pickupAt, returnAt])

  const baseFiltered = useMemo(() => {
    let list = vehicles
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((v) => {
        const name = vehicleDisplayName(v).toLowerCase()
        const brand = (v.brand || '').toLowerCase()
        const plate = (v.licensePlate || '').toLowerCase()
        return name.includes(q) || brand.includes(q) || plate.includes(q)
      })
    }
    if (seatFilter !== 'all') {
      const wantedSeat = Number.parseInt(seatFilter, 10)
      if (Number.isFinite(wantedSeat)) {
        list = list.filter((v) => v.capacity === wantedSeat)
      }
    }
    if (fuelFilter !== 'all') {
      list = list.filter((v) => (v.fuelType || '').toUpperCase() === fuelFilter)
    }
    if (stationFilter !== 'all') {
      const wantedStationId = Number.parseInt(stationFilter, 10)
      if (Number.isFinite(wantedStationId)) {
        list = list.filter((v) => v.stationId === wantedStationId)
      }
    }
    if (priceFilter) {
      list = list.filter((v) => {
        const rate = parseRate(v.dailyRate)
        if (rate == null || rate <= 0) return false
        return rate >= priceFilter.min && rate <= priceFilter.max
      })
    }
    return list
  }, [vehicles, query, seatFilter, fuelFilter, stationFilter, priceFilter])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMinDateTime(toDateTimeLocalMinValue(new Date()))
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (pickupAt && pickupAt < nowMinDateTime) {
      setPickupAt(nowMinDateTime)
    }
  }, [pickupAt, nowMinDateTime])

  useEffect(() => {
    if (returnAt && returnAt < nowMinDateTime) {
      setReturnAt(nowMinDateTime)
    }
  }, [returnAt, nowMinDateTime])

  useEffect(() => {
    if (pickupAt && returnAt && returnAt < pickupAt) {
      setReturnAt(pickupAt)
    }
  }, [pickupAt, returnAt])

  useEffect(() => {
    setAvailabilityMap({})
    setAvailabilityError(null)
    if (!availabilityOnly || !hasValidAvailabilityWindow || baseFiltered.length === 0) {
      setAvailabilityLoading(false)
      return
    }

    let cancelled = false
    const run = async () => {
      setAvailabilityLoading(true)
      try {
        const start = fromDateTimeLocalValue(pickupAt)
        const end = fromDateTimeLocalValue(returnAt)
        const checks = await Promise.all(
          baseFiltered.map(async (v) => {
            const available = await checkVehicleAvailability({
              vehicleId: v.id,
              start,
              end,
            })
            return [v.id, available] as const
          }),
        )
        if (cancelled) return
        setAvailabilityMap(Object.fromEntries(checks))
        setAvailabilityError(null)
      } catch (e) {
        if (cancelled) return
        setAvailabilityMap({})
        setAvailabilityError(e instanceof Error ? e.message : 'Không kiểm tra được availability theo thời gian.')
      } finally {
        if (!cancelled) setAvailabilityLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [availabilityOnly, hasValidAvailabilityWindow, pickupAt, returnAt, baseFiltered])

  const filtered = useMemo(() => {
    if (!availabilityOnly || !hasValidAvailabilityWindow) return baseFiltered
    return baseFiltered.filter((v) => availabilityMap[v.id] === true)
  }, [availabilityOnly, hasValidAvailabilityWindow, baseFiltered, availabilityMap])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, seatFilter, fuelFilter, stationFilter, priceFilter, availabilityOnly, pickupAt, returnAt])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const pagedVehicles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setQuery(navQuery.trim())
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
              <a href="/blog">Blog</a>
            </li>
            <li>
              <a href="/rent" className="is-active">
                Car Rental
              </a>
            </li>
            <li>
              <a href="/mapstation">Trạm xe</a>
            </li>
            <li>
              <a href="/account/orders">Lịch sử</a>
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
                <label htmlFor="cr-pickup-dt">Pick Up Date &amp; Time</label>
                <div className="cr-field__input">
                  <span aria-hidden="true">📅</span>
                  <input
                    id="cr-pickup-dt"
                    name="pickup"
                    type="datetime-local"
                    min={nowMinDateTime}
                    value={pickupAt}
                    onChange={(e) => setPickupAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="cr-field">
                <label htmlFor="cr-return-dt">Return Date &amp; Time</label>
                <div className="cr-field__input">
                  <span aria-hidden="true">📅</span>
                  <input
                    id="cr-return-dt"
                    name="return"
                    type="datetime-local"
                    min={pickupAt || nowMinDateTime}
                    value={returnAt}
                    onChange={(e) => setReturnAt(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="cr-search-form__filters">
              <div className="cr-filter-panel cr-filter-panel--in-hero" aria-label="Bộ lọc nâng cao">
                <div className="cr-filter-panel__grid">
                  <label className="cr-filter-control">
                    <span>Số chỗ</span>
                    <select value={seatFilter} onChange={(e) => setSeatFilter(e.target.value)}>
                      <option value="all">Tất cả</option>
                      {seatOptions.map((seat) => (
                        <option key={seat} value={String(seat)}>
                          {seat} chỗ
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="cr-filter-control">
                    <span>Loại nhiên liệu</span>
                    <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
                      <option value="all">Tất cả</option>
                      {FUEL_FILTER_OPTIONS.map((fuel) => (
                        <option key={fuel} value={fuel}>
                          {fuelLabel(fuel)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="cr-filter-control">
                    <span>Trạm</span>
                    <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}>
                      <option value="all">Tất cả</option>
                      {stationOptions.map((stationId) => (
                        <option key={stationId} value={String(stationId)}>
                          {stationNameById.get(stationId) ?? `Trạm #${stationId}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="cr-filter-toggle">
                  <input
                    type="checkbox"
                    checked={availabilityOnly}
                    onChange={(e) => setAvailabilityOnly(e.target.checked)}
                  />
                  Chỉ hiển thị xe trống trong khung thời gian đã chọn (Pick up / Return)
                </label>

                {availabilityOnly && !hasValidAvailabilityWindow ? (
                  <div className="cr-filter-hint">Chọn thời gian nhận/trả xe hợp lệ để lọc availability.</div>
                ) : null}
                {availabilityOnly && availabilityLoading ? (
                  <div className="cr-filter-hint">Đang kiểm tra availability theo thời gian...</div>
                ) : null}
                {availabilityOnly && availabilityError ? (
                  <div className="cr-filter-hint cr-filter-hint--error">{availabilityError}</div>
                ) : null}

                {priceBounds && priceFilter ? (
                  <div className="cr-price-range" role="group" aria-label="Khoảng giá theo ngày">
                    <div className="cr-price-range__head">
                      <strong>Giá theo ngày</strong>
                      <span>
                        {formatPriceCompact(priceFilter.min)} - {formatPriceCompact(priceFilter.max)} ₫
                      </span>
                    </div>
                    <div className="cr-price-range__slider-wrap">
                      <div className="cr-price-range__track" aria-hidden="true" />
                      <div
                        className="cr-price-range__active"
                        aria-hidden="true"
                        style={{
                          left: `${((priceFilter.min - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                          right: `${100 - ((priceFilter.max - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                        }}
                      />
                      <input
                        className="cr-price-range__thumb cr-price-range__thumb--min"
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
                        className="cr-price-range__thumb cr-price-range__thumb--max"
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
                    <div className="cr-price-range__ends">
                      <span>Từ: {formatPriceCompact(priceBounds.min)} ₫</span>
                      <span>Đến: {formatPriceCompact(priceBounds.max)} ₫</span>
                    </div>
                  </div>
                ) : null}
              </div>

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
          <>
            <div className="cr-grid">
              {pagedVehicles.map((v) => (
                <a key={v.id} className="cr-card" href={`/rent/${v.id}`}>
                  <div className="cr-card__media">
                    <img src={cardImage(v)} alt={vehicleDisplayName(v)} loading="lazy" />
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
                    <div className="cr-card__plate">
                      {stationNameById.get(v.stationId) ?? `Bãi #${v.stationId}`} · {v.licensePlate}
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {filtered.length > PAGE_SIZE ? (
              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#5b6474', fontSize: 14 }}>
                  Trang {currentPage}/{totalPages} · {filtered.length} xe
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="cr-nav__logout-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="cr-nav__logout-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            ) : null}
          </>
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
