import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LicenseRequiredModal from '../components/LicenseRequiredModal'
import {
  fetchMyInfo,
  isLicenseApprovedForRent,
  type LicenseVerificationStatus,
} from '../api/users'
import {
  type VehicleDto,
  fetchAvailableVehicles,
  fetchVehicleById,
  formatDailyPrice,
  formatDeposit,
  formatHourlyPrice,
  fuelLabel,
  inferCategory,
  vehiclePolicyLabel,
  vehicleDisplayName,
} from '../api/vehicles'
import './VehicleDetailPage.css'

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'

function resolvePhotoUrl(p: string): string {
  const t = p.trim()
  if (!t) return PLACEHOLDER_IMG
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return t
}

function suggestThumb(v: VehicleDto): string {
  const p = v.photos?.[0]
  if (!p?.trim()) return PLACEHOLDER_IMG
  return resolvePhotoUrl(p)
}

function suggestRating(v: VehicleDto): string {
  const r = v.rating
  if (r == null || r <= 0) return '—'
  return r.toFixed(1)
}

type Props = { vehicleId: number }

export default function VehicleDetailPage({ vehicleId }: Props) {
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<VehicleDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [suggestions, setSuggestions] = useState<VehicleDto[]>([])
  const [authUi, setAuthUi] = useState<{ loggedIn: boolean; displayName: string | null }>({
    loggedIn: false,
    displayName: null,
  })
  const [licenseModalOpen, setLicenseModalOpen] = useState(false)
  const [licenseModalStatus, setLicenseModalStatus] = useState<LicenseVerificationStatus | null>(null)
  const [licenseCheckLoading, setLicenseCheckLoading] = useState(false)

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
    setPhotoIndex(0)
    try {
      const v = await fetchVehicleById(vehicleId)
      setVehicle(v)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thông tin xe.')
      setVehicle(null)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!vehicle) {
      setSuggestions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const all = await fetchAvailableVehicles()
        if (cancelled) return
        const others = all.filter((x) => x.id !== vehicleId)
        const cat = inferCategory(vehicle)
        const sameCat = others.filter((x) => inferCategory(x) === cat)
        const otherCat = others.filter((x) => inferCategory(x) !== cat)
        setSuggestions([...sameCat, ...otherCat].slice(0, 8))
      } catch {
        if (!cancelled) setSuggestions([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [vehicle, vehicleId])

  const images = useMemo(() => {
    if (!vehicle?.photos?.length) return [PLACEHOLDER_IMG]
    const urls = vehicle.photos.map(resolvePhotoUrl).filter(Boolean)
    return urls.length ? urls : [PLACEHOLDER_IMG]
  }, [vehicle])

  const mainSrc = images[Math.min(photoIndex, images.length - 1)] ?? PLACEHOLDER_IMG
  const hasManyImages = images.length > 1

  const doorsGuess = (cap: number | null | undefined) => {
    if (cap == null || cap <= 0) return 4
    return cap <= 4 ? 4 : 5
  }

  const goPrevPhoto = useCallback(() => {
    setPhotoIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  const goNextPhoto = useCallback(() => {
    setPhotoIndex((i) => (i + 1) % images.length)
  }, [images.length])

  const authNav = authUi.loggedIn ? (
    <div className="vd-topbar__auth">
      <a className="vd-auth vd-auth--account" href="/account" title={authUi.displayName ?? 'Tài khoản'}>
        {authUi.displayName ? `Hi, ${authUi.displayName}` : 'Tài khoản'}
      </a>
      <a className="vd-auth vd-auth--logout" href="/logout">
        Log Out
      </a>
    </div>
  ) : (
    <div className="vd-topbar__auth">
      <a className="vd-auth" href="/auth">
        Đăng nhập
      </a>
    </div>
  )

  if (loading) {
    return (
      <div className="vd-page">
        <div className="vd-topbar">
          <a className="vd-back" href="/rent">
            ← Quay lại
          </a>
          <a className="vd-logo" href="/rent">
            <span className="vd-logo-mark">H</span>
            Horizon
          </a>
          {authNav}
        </div>
        <p className="vd-loading">Đang tải chi tiết xe…</p>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="vd-page">
        <div className="vd-topbar">
          <a className="vd-back" href="/rent">
            ← Quay lại
          </a>
          <a className="vd-logo" href="/rent">
            <span className="vd-logo-mark">H</span>
            Horizon
          </a>
          {authNav}
        </div>
        <div className="vd-error">
          <p>{error ?? 'Không tìm thấy xe.'}</p>
          <p>
            <a href="/rent">Về danh sách xe</a>
          </p>
        </div>
      </div>
    )
  }

  const title = vehicleDisplayName(vehicle)
  const category = inferCategory(vehicle)
  const isAvailable = vehicle.status === 'AVAILABLE'

  async function handleBookClick() {
    setLicenseCheckLoading(true)
    try {
      const me = await fetchMyInfo()
      if (!isLicenseApprovedForRent(me.licenseVerificationStatus)) {
        setLicenseModalStatus(me.licenseVerificationStatus ?? 'NOT_SUBMITTED')
        setLicenseModalOpen(true)
        return
      }
      navigate(`/booking/${vehicleId}`)
    } catch {
      // fetchMyInfo: lỗi mạng / 401 (authFetch có thể redirect); không mở modal GPLX
    } finally {
      setLicenseCheckLoading(false)
    }
  }

  return (
    <>
    <div className="vd-page">
      <header className="vd-topbar">
        <a className="vd-back" href="/rent">
          ← Quay lại danh sách
        </a>
        <a className="vd-logo" href="/rent">
          <span className="vd-logo-mark">H</span>
          Horizon
        </a>
        {authNav}
      </header>

      <main className="vd-main">
        <div className="vd-grid">
          <div className="vd-gallery">
            <div className="vd-gallery__main">
              <img src={mainSrc} alt={title} />
              <span className="vd-gallery__tag">{category}</span>
              {hasManyImages ? (
                <>
                  <button
                    type="button"
                    className="vd-gallery__nav vd-gallery__nav--prev"
                    onClick={goPrevPhoto}
                    aria-label="Ảnh trước"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="vd-gallery__nav vd-gallery__nav--next"
                    onClick={goNextPhoto}
                    aria-label="Ảnh kế tiếp"
                  >
                    ›
                  </button>
                  <span className="vd-gallery__count">
                    {photoIndex + 1} / {images.length}
                  </span>
                </>
              ) : null}
            </div>
            {hasManyImages ? (
              <div className="vd-thumbs-wrap">
                <button
                  type="button"
                  className="vd-thumbs-nav"
                  onClick={goPrevPhoto}
                  aria-label="Thumbnail trước"
                >
                  ‹
                </button>
                <div className="vd-thumbs" role="tablist" aria-label="Ảnh xe">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      className={`vd-thumb ${i === photoIndex ? 'is-active' : ''}`}
                      onClick={() => setPhotoIndex(i)}
                      aria-label={`Ảnh ${i + 1}`}
                      aria-selected={i === photoIndex}
                    >
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="vd-thumbs-nav"
                  onClick={goNextPhoto}
                  aria-label="Thumbnail kế tiếp"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>

          <div className="vd-panel">
            <h1 className="vd-title">{title}</h1>
            <p className="vd-sub">
              Biển số <strong>{vehicle.licensePlate}</strong> · Bãi (station) #{vehicle.stationId} · Trạng
              thái: <strong>{vehicle.status}</strong>
            </p>

            {!isAvailable ? (
              <div className="vd-banner vd-banner--warn" role="status">
                Xe hiện không ở trạng thái AVAILABLE — có thể không đặt được cho đến khi chủ xe / hệ thống
                cập nhật.
              </div>
            ) : null}

            <div className="vd-price-box">
              <div className="vd-price-row">
                <div>
                  <div className="vd-price-label">Giá theo ngày</div>
                  <div className="vd-price-value">{formatDailyPrice(vehicle)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="vd-price-label">Theo giờ</div>
                  <div className="vd-price-secondary">{formatHourlyPrice(vehicle)}</div>
                </div>
              </div>
              <div className="vd-price-row">
                <div>
                  <div className="vd-price-label">Đặt cọc (demo)</div>
                  <div className="vd-price-secondary">{formatDeposit(vehicle)}</div>
                </div>
                {vehicle.rentCount != null && vehicle.rentCount > 0 ? (
                  <div style={{ textAlign: 'right' }}>
                    <div className="vd-price-label">Đã thuê</div>
                    <div className="vd-price-secondary">{vehicle.rentCount} lượt</div>
                  </div>
                ) : null}
              </div>
            </div>

            {isAvailable ? (
              authUi.loggedIn ? (
                <button
                  type="button"
                  className="vd-cta"
                  disabled={licenseCheckLoading}
                  onClick={() => void handleBookClick()}
                >
                  {licenseCheckLoading ? 'Đang kiểm tra…' : 'Đặt xe'}
                </button>
              ) : (
                <a className="vd-cta" href="/auth">
                  Đặt xe — đăng nhập để tiếp tục
                </a>
              )
            ) : (
              <span className="vd-cta vd-cta--disabled" role="status">
                Không thể đặt xe
              </span>
            )}
            <a className="vd-cta-secondary" href="/rent">
              Xem thêm xe khác
            </a>

            <dl className="vd-specs">
              <div className="vd-spec">
                <dt>Chỗ ngồi</dt>
                <dd>{vehicle.capacity ?? '—'}</dd>
              </div>
              <div className="vd-spec">
                <dt>Cửa (ước lượng)</dt>
                <dd>{doorsGuess(vehicle.capacity)}</dd>
              </div>
              <div className="vd-spec">
                <dt>Nhiên liệu</dt>
                <dd>{fuelLabel(vehicle.fuelType)}</dd>
              </div>
              <div className="vd-spec">
                <dt>Đánh giá</dt>
                <dd>
                  {vehicle.rating != null && vehicle.rating > 0
                    ? `${vehicle.rating.toFixed(1)} / 5`
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {vehicle.policies && vehicle.policies.length > 0 ? (
          <section className="vd-section" aria-labelledby="vd-policies-title">
            <h2 id="vd-policies-title">Chính sách &amp; điều khoản</h2>
            <ul className="vd-policies">
              {vehicle.policies.map((p, i) => (
                <li key={i}>{vehiclePolicyLabel(p)}</li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="vd-section" aria-labelledby="vd-note-title">
            <h2 id="vd-note-title">Ghi chú</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
              Chưa có danh sách chính sách trên hệ thống. Bạn có thể bổ sung trường policies khi tạo / cập
              nhật xe trong backend.
            </p>
          </section>
        )}

        {suggestions.length > 0 ? (
          <section className="vd-suggest" aria-labelledby="vd-suggest-title">
            <h2 id="vd-suggest-title">Xe bạn có thể quan tâm</h2>
            <p className="vd-suggest__sub">
              Gợi ý từ các xe <strong>AVAILABLE</strong> trên hệ thống — ưu tiên cùng phân loại (
              {category}), sau đó là các xe khác.
            </p>
            <div className="vd-suggest-grid">
              {suggestions.map((v) => (
                <a key={v.id} className="vd-suggest-card" href={`/rent/${v.id}`}>
                  <div className="vd-suggest-card__media">
                    <img src={suggestThumb(v)} alt={vehicleDisplayName(v)} loading="lazy" />
                    <span className="vd-suggest-card__tag">{inferCategory(v)}</span>
                  </div>
                  <div className="vd-suggest-card__body">
                    <h3 className="vd-suggest-card__title">{vehicleDisplayName(v)}</h3>
                    <div className="vd-suggest-card__meta">
                      <span>⚙ {fuelLabel(v.fuelType)}</span>
                      <span>👥 {v.capacity ?? '—'}</span>
                      <span>⭐ {suggestRating(v)}</span>
                    </div>
                    <div className="vd-suggest-card__price">
                      <span className="vd-suggest-card__price-label">Start from</span>
                      <div>
                        <strong>{formatDailyPrice(v)}</strong>
                        <span> / day</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            <p className="vd-suggest__footer">
              <a href="/rent">Xem toàn bộ danh sách xe →</a>
            </p>
          </section>
        ) : null}
      </main>
    </div>
    <LicenseRequiredModal
      open={licenseModalOpen}
      onDismiss={() => {
        setLicenseModalOpen(false)
        setLicenseModalStatus(null)
      }}
      currentStatus={licenseModalStatus}
    />
    </>
  )
}
