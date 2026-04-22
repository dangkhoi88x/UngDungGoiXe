import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchStations, type StationDto } from '../api/stations'
import {
  fetchMyOwnerVehicleRequestById,
  updateOwnerVehicleRequest,
  type OwnerVehicleRequestStatus,
  type OwnerVehicleFuelType,
  type UpdateOwnerVehicleRequestPayload,
} from '../api/ownerVehicleRequests'
import {
  intToFormString,
  joinLines,
  moneyToFormString,
  parseOptionalDouble,
  parseOptionalInt,
  parseRequiredMoney,
  splitLinesUrls,
  validateOwnerVehicleFormStrings,
} from '../lib/ownerVehicleRequestForm'
import './OwnerRegisterVehiclePage.css'

function fuelFromDto(raw: string | null | undefined): OwnerVehicleFuelType {
  return raw === 'ELECTRICITY' ? 'ELECTRICITY' : 'GASOLINE'
}

function statusLabelVi(s: OwnerVehicleRequestStatus): string {
  const map: Record<string, string> = {
    PENDING: 'chờ duyệt',
    NEED_MORE_INFO: 'cần bổ sung',
    APPROVED: 'đã duyệt',
    REJECTED: 'từ chối',
    CANCELLED: 'đã hủy',
  }
  return map[s] ?? s
}

export default function OwnerEditVehicleRequestPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requestId = Number(idParam)

  const [stations, setStations] = useState<StationDto[]>([])
  const [stationsErr, setStationsErr] = useState<string | null>(null)
  const [loadingStations, setLoadingStations] = useState(true)

  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loadingRequest, setLoadingRequest] = useState(true)
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null)

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

  const photoUrls = useMemo(() => splitLinesUrls(photosBlock), [photosBlock])
  const policyLines = useMemo(() => splitLinesUrls(policiesBlock), [policiesBlock])

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!Number.isInteger(requestId) || requestId <= 0) {
      navigate('/owner/vehicle-requests', { replace: true })
    }
  }, [navigate, requestId])

  const loadStations = useCallback(async () => {
    setLoadingStations(true)
    setStationsErr(null)
    try {
      const list = await fetchStations()
      setStations(list)
    } catch (e) {
      setStationsErr(e instanceof Error ? e.message : 'Không tải được danh sách trạm.')
      setStations([])
    } finally {
      setLoadingStations(false)
    }
  }, [])

  const loadRequest = useCallback(async () => {
    if (!Number.isInteger(requestId) || requestId <= 0) return
    setLoadingRequest(true)
    setLoadErr(null)
    setReadOnlyReason(null)
    try {
      const dto = await fetchMyOwnerVehicleRequestById(requestId)
      if (dto.status !== 'PENDING' && dto.status !== 'NEED_MORE_INFO') {
        setReadOnlyReason(
          `Yêu cầu đang ở trạng thái “${statusLabelVi(dto.status)}” — không thể chỉnh sửa trên form này.`,
        )
        return
      }
      setStationId(String(dto.stationId))
      setLicensePlate(dto.licensePlate ?? '')
      setName(dto.name?.trim() ?? '')
      setBrand(dto.brand?.trim() ?? '')
      setFuelType(fuelFromDto(dto.fuelType))
      setCapacity(intToFormString(dto.capacity ?? null))
      setHourlyRate(moneyToFormString(dto.hourlyRate))
      setDailyRate(moneyToFormString(dto.dailyRate))
      setDepositAmount(moneyToFormString(dto.depositAmount))
      setDescription(dto.description?.trim() ?? '')
      setAddress(dto.address?.trim() ?? '')
      setLatitude(dto.latitude != null ? String(dto.latitude) : '')
      setLongitude(dto.longitude != null ? String(dto.longitude) : '')
      setRegistrationDocUrl(dto.registrationDocUrl?.trim() ?? '')
      setInsuranceDocUrl(dto.insuranceDocUrl?.trim() ?? '')
      setPhotosBlock(joinLines(dto.photos))
      setPoliciesBlock(joinLines(dto.policies))
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Không tải được yêu cầu.')
    } finally {
      setLoadingRequest(false)
    }
  }, [requestId])

  useEffect(() => {
    void loadStations()
  }, [loadStations])

  useEffect(() => {
    void loadRequest()
  }, [loadRequest])

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

    const payload: UpdateOwnerVehicleRequestPayload = {
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
      await updateOwnerVehicleRequest(requestId, payload)
      navigate('/owner/vehicle-requests', { replace: false })
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'Lưu thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const badId = !Number.isInteger(requestId) || requestId <= 0

  return (
    <div className="owreg">
      <header className="owreg__toolbar">
        <nav className="owreg__crumb" aria-label="Breadcrumb">
          <a className="owreg__crumb-link" href="/">
            Trang chủ
          </a>
          <span className="owreg__crumb-sep">/</span>
          <a className="owreg__crumb-link" href="/owner/vehicle-requests">
            Yêu cầu xe của tôi
          </a>
          <span className="owreg__crumb-sep">/</span>
          <span className="owreg__crumb-current">Sửa #{requestId}</span>
        </nav>
      </header>

      <main className="owreg__main">
        <h1 className="owreg__title">Sửa yêu cầu #{requestId}</h1>
        <p className="owreg__lead">
          Chỉnh thông tin khi yêu cầu đang <strong>chờ duyệt</strong> hoặc{' '}
          <strong>cần bổ sung</strong>. Sau khi lưu, bạn có thể quay lại danh sách để gửi lại nếu
          cần.
        </p>

        {badId ? null : loadingRequest ? (
          <p className="owreg__lead">Đang tải yêu cầu…</p>
        ) : null}
        {loadErr ? (
          <p className="owreg__err" role="alert">
            {loadErr}{' '}
            <a className="owreg__crumb-link" href="/owner/vehicle-requests">
              Về danh sách
            </a>
          </p>
        ) : null}
        {readOnlyReason ? (
          <div className="owreg__banner" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            <p className="owreg__banner-text">{readOnlyReason}</p>
            <div className="owreg__banner-actions">
              <a className="owreg__btn owreg__btn--primary" href="/owner/vehicle-requests">
                Về danh sách
              </a>
            </div>
          </div>
        ) : null}

        {!badId && !loadingRequest && !loadErr && !readOnlyReason ? (
          <>
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
                      required
                    />
                  </label>
                  <label className="owreg__field">
                    <span className="owreg__label">Hãng</span>
                    <input
                      className="owreg__input"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
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
                  />
                </label>
                <label className="owreg__field">
                  <span className="owreg__label">Địa chỉ giao xe (tùy chọn)</span>
                  <input
                    className="owreg__input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                <div className="owreg__grid2">
                  <label className="owreg__field">
                    <span className="owreg__label">Vĩ độ (tùy chọn)</span>
                    <input
                      className="owreg__input"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </label>
                  <label className="owreg__field">
                    <span className="owreg__label">Kinh độ (tùy chọn)</span>
                    <input
                      className="owreg__input"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
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
                    required
                  />
                </label>
              </section>

              <section className="owreg__section">
                <h2 className="owreg__section-title">Ảnh xe</h2>
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
                  />
                </label>
              </section>

              <div className="owreg__actions">
                <button
                  type="submit"
                  className="owreg__btn owreg__btn--primary"
                  disabled={submitting || loadingStations || stations.length === 0}
                >
                  {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
                <a className="owreg__btn owreg__btn--ghost" href="/owner/vehicle-requests">
                  Hủy
                </a>
              </div>
            </form>
          </>
        ) : null}
      </main>
    </div>
  )
}
