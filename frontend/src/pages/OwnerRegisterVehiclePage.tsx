import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStations, type StationDto } from '../api/stations'
import {
  createOwnerVehicleRequest,
  type CreateOwnerVehicleRequestPayload,
  type OwnerVehicleFuelType,
} from '../api/ownerVehicleRequests'
import {
  parseOptionalDouble,
  parseOptionalInt,
  parseRequiredMoney,
  splitLinesUrls,
  validateOwnerVehicleFormStrings,
} from '../lib/ownerVehicleRequestForm'
import './OwnerRegisterVehiclePage.css'

export default function OwnerRegisterVehiclePage() {
  const navigate = useNavigate()
  const [stations, setStations] = useState<StationDto[]>([])
  const [stationsErr, setStationsErr] = useState<string | null>(null)
  const [loadingStations, setLoadingStations] = useState(true)

  const [stationId, setStationId] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [fuelType, setFuelType] = useState<OwnerVehicleFuelType>('GASOLINE')
  const [capacity, setCapacity] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [registrationDocUrl, setRegistrationDocUrl] = useState('')
  const [insuranceDocUrl, setInsuranceDocUrl] = useState('')
  const [photosBlock, setPhotosBlock] = useState('')
  const [policiesBlock, setPoliciesBlock] = useState('')

  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successId, setSuccessId] = useState<number | null>(null)

  const photoUrls = useMemo(() => splitLinesUrls(photosBlock), [photosBlock])
  const policyLines = useMemo(() => splitLinesUrls(policiesBlock), [policiesBlock])

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  const loadStations = useCallback(async () => {
    setLoadingStations(true)
    setStationsErr(null)
    try {
      const list = await fetchStations()
      setStations(list.filter((s) => (s.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE'))
    } catch (e) {
      setStationsErr(e instanceof Error ? e.message : 'Không tải được danh sách trạm.')
      setStations([])
    } finally {
      setLoadingStations(false)
    }
  }, [])

  useEffect(() => {
    void loadStations()
  }, [loadStations])

  useEffect(() => {
    if (stations.length && !stationId) {
      setStationId(String(stations[0].id))
    }
  }, [stations, stationId])

  function validateClient(): string | null {
    return validateOwnerVehicleFormStrings(
      {
        stationId,
        licensePlate,
        name,
        brand,
        capacity,
        hourlyRate,
        dailyRate,
        depositAmount,
        latitude,
        longitude,
        registrationDocUrl,
        insuranceDocUrl,
      },
      photoUrls,
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitErr(null)
    setSuccessId(null)
    const clientErr = validateClient()
    if (clientErr) {
      setSubmitErr(clientErr)
      return
    }
    const sid = Number(stationId)
    const cap = parseOptionalInt(capacity)
    const lat = parseOptionalDouble(latitude)
    const lng = parseOptionalDouble(longitude)
    const h = parseRequiredMoney(hourlyRate, 'Giá theo giờ')
    const d = parseRequiredMoney(dailyRate, 'Giá theo ngày')
    const dep = parseRequiredMoney(depositAmount, 'Tiền cọc')
    if (!h.ok || !d.ok || !dep.ok) return

    const payload: CreateOwnerVehicleRequestPayload = {
      stationId: sid,
      licensePlate: licensePlate.trim(),
      name: name.trim(),
      brand: brand.trim(),
      fuelType,
      capacity: cap ?? undefined,
      hourlyRate: h.value,
      dailyRate: d.value,
      depositAmount: dep.value,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
      registrationDocUrl: registrationDocUrl.trim(),
      insuranceDocUrl: insuranceDocUrl.trim(),
      photos: photoUrls,
      policies: policyLines.length ? policyLines : undefined,
    }

    setSubmitting(true)
    try {
      const created = await createOwnerVehicleRequest(payload)
      setSuccessId(created.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="owreg">
      <header className="owreg__toolbar">
        <nav className="owreg__crumb" aria-label="Breadcrumb">
          <a className="owreg__crumb-link" href="/">
            Trang chủ
          </a>
          <span className="owreg__crumb-sep">/</span>
          <a className="owreg__crumb-link" href="/account">
            Tài khoản
          </a>
          <span className="owreg__crumb-sep">/</span>
          <span className="owreg__crumb-current">Đăng xe cho thuê</span>
        </nav>
      </header>

      <main className="owreg__main">
        <h1 className="owreg__title">Đăng xe cho thuê</h1>
        <p className="owreg__lead">
          Gửi thông tin xe và URL ảnh / giấy tờ. Admin sẽ duyệt trước khi xe hiện trên hệ thống cho
          thuê. Tối thiểu <strong>3 ảnh xe</strong> và đủ <strong>giấy đăng ký + bảo hiểm</strong>{' '}
          (URL).
        </p>

        {successId != null ? (
          <div className="owreg__banner owreg__banner--ok" role="status">
            <p className="owreg__banner-title">Đã gửi yêu cầu #{successId}</p>
            <p className="owreg__banner-text">
              Theo dõi trạng thái tại trang <strong>Yêu cầu xe của tôi</strong> hoặc trong mục Cho
              thuê xe ở tài khoản.
            </p>
            <div className="owreg__banner-actions">
              <a className="owreg__btn owreg__btn--primary" href="/owner/vehicle-requests">
                Xem yêu cầu của tôi
              </a>
              <a className="owreg__btn owreg__btn--ghost" href="/account">
                Về tài khoản
              </a>
              <button
                type="button"
                className="owreg__btn owreg__btn--ghost"
                onClick={() => {
                  setSuccessId(null)
                  setLicensePlate('')
                  setPhotosBlock('')
                  setRegistrationDocUrl('')
                  setInsuranceDocUrl('')
                }}
              >
                Gửi thêm xe khác
              </button>
            </div>
          </div>
        ) : null}

        {stationsErr ? (
          <p className="owreg__err" role="alert">
            {stationsErr}
          </p>
        ) : null}
        {submitErr ? (
          <p className="owreg__err" role="alert">
            {submitErr}
          </p>
        ) : null}

        {successId == null ? (
          <form className="owreg__form" onSubmit={onSubmit}>
            <section className="owreg__section">
              <h2 className="owreg__section-title">Trạm &amp; biển số</h2>
              <label className="owreg__field">
                <span className="owreg__label">Trạm</span>
                <select
                  className="owreg__input"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  disabled={loadingStations || stations.length === 0}
                  required
                >
                  {stations.length === 0 ? (
                    <option value="">— Không có trạm —</option>
                  ) : null}
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} — {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="owreg__field">
                <span className="owreg__label">Biển số</span>
                <input
                  className="owreg__input"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="Ví dụ: 51K-123.45"
                  autoComplete="off"
                  required
                />
              </label>
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Thông tin xe</h2>
              <div className="owreg__grid2">
                <label className="owreg__field">
                  <span className="owreg__label">Tên hiển thị</span>
                  <input
                    className="owreg__input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Toyota Vios 1.5G"
                    required
                  />
                </label>
                <label className="owreg__field">
                  <span className="owreg__label">Hãng</span>
                  <input
                    className="owreg__input"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Toyota"
                    required
                  />
                </label>
              </div>
              <div className="owreg__grid2">
                <label className="owreg__field">
                  <span className="owreg__label">Nhiên liệu</span>
                  <select
                    className="owreg__input"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as OwnerVehicleFuelType)}
                  >
                    <option value="GASOLINE">Xăng (GASOLINE)</option>
                    <option value="ELECTRICITY">Điện (ELECTRICITY)</option>
                  </select>
                </label>
                <label className="owreg__field">
                  <span className="owreg__label">Số chỗ (tùy chọn)</span>
                  <input
                    className="owreg__input"
                    inputMode="numeric"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="5"
                  />
                </label>
              </div>
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Giá &amp; cọc (VNĐ)</h2>
              <div className="owreg__grid3">
                <label className="owreg__field">
                  <span className="owreg__label">Theo giờ</span>
                  <input
                    className="owreg__input"
                    inputMode="decimal"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="150000"
                    required
                  />
                </label>
                <label className="owreg__field">
                  <span className="owreg__label">Theo ngày</span>
                  <input
                    className="owreg__input"
                    inputMode="decimal"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    placeholder="900000"
                    required
                  />
                </label>
                <label className="owreg__field">
                  <span className="owreg__label">Tiền cọc</span>
                  <input
                    className="owreg__input"
                    inputMode="decimal"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="5000000"
                    required
                  />
                </label>
              </div>
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Mô tả &amp; địa điểm</h2>
              <label className="owreg__field">
                <span className="owreg__label">Mô tả (tùy chọn)</span>
                <textarea
                  className="owreg__textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tình trạng xe, phụ kiện…"
                />
              </label>
              <label className="owreg__field">
                <span className="owreg__label">Địa chỉ giao xe (tùy chọn)</span>
                <input
                  className="owreg__input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quận / đường…"
                />
              </label>
              <div className="owreg__grid2">
                <label className="owreg__field">
                  <span className="owreg__label">Vĩ độ (tùy chọn)</span>
                  <input
                    className="owreg__input"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="10.7769"
                  />
                </label>
                <label className="owreg__field">
                  <span className="owreg__label">Kinh độ (tùy chọn)</span>
                  <input
                    className="owreg__input"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="106.7009"
                  />
                </label>
              </div>
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Giấy tờ (URL)</h2>
              <label className="owreg__field">
                <span className="owreg__label">Giấy đăng ký / đăng kiểm</span>
                <input
                  className="owreg__input"
                  type="url"
                  value={registrationDocUrl}
                  onChange={(e) => setRegistrationDocUrl(e.target.value)}
                  placeholder="https://…"
                  required
                />
              </label>
              <label className="owreg__field">
                <span className="owreg__label">Giấy bảo hiểm</span>
                <input
                  className="owreg__input"
                  type="url"
                  value={insuranceDocUrl}
                  onChange={(e) => setInsuranceDocUrl(e.target.value)}
                  placeholder="https://…"
                  required
                />
              </label>
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Ảnh xe</h2>
              <p className="owreg__hint">
                Dán <strong>tối thiểu 3</strong> URL ảnh, <strong>mỗi dòng một URL</strong>. Ảnh
                nên là JPG/PNG công khai (CDN, cloud…).
              </p>
              <p className="owreg__hint owreg__hint--count">
                Hiện có: <strong>{photoUrls.length}</strong> URL
                {photoUrls.length < 3
                  ? ` — cần thêm ít nhất ${3 - photoUrls.length} URL nữa.`
                  : ' — đủ điều kiện.'}
              </p>
              <label className="owreg__field">
                <span className="owreg__label">Danh sách URL ảnh</span>
                <textarea
                  className="owreg__textarea owreg__textarea--tall"
                  value={photosBlock}
                  onChange={(e) => setPhotosBlock(e.target.value)}
                  placeholder={'https://example.com/xe-1.jpg\nhttps://example.com/xe-2.jpg\nhttps://example.com/xe-3.jpg'}
                  spellCheck={false}
                />
              </label>
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Điều khoản (tùy chọn)</h2>
              <label className="owreg__field">
                <span className="owreg__label">Mỗi dòng một điều khoản</span>
                <textarea
                  className="owreg__textarea"
                  rows={3}
                  value={policiesBlock}
                  onChange={(e) => setPoliciesBlock(e.target.value)}
                  placeholder="Không hút thuốc trong xe…"
                />
              </label>
            </section>

            <div className="owreg__actions">
              <button
                type="submit"
                className="owreg__btn owreg__btn--primary"
                disabled={submitting || loadingStations || stations.length === 0}
              >
                {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
              </button>
              <a className="owreg__btn owreg__btn--ghost" href="/account">
                Hủy
              </a>
            </div>
          </form>
        ) : null}
      </main>
    </div>
  )
}
