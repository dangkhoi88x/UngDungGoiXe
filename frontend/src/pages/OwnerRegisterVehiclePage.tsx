import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStations, type StationDto } from '../api/stations'
import {
  createOwnerVehicleRequest,
  type CreateOwnerVehicleRequestPayload,
  type OwnerVehicleFuelType,
} from '../api/ownerVehicleRequests'
import {
  uploadOwnerVehicleDocument,
  uploadOwnerVehiclePhotoWithProgress,
} from '../api/uploads'
import {
  parseOptionalDouble,
  parseOptionalInt,
  parseRequiredMoney,
  splitLinesUrls,
  validateOwnerVehicleFormStrings,
} from '../lib/ownerVehicleRequestForm'
import TopNav from '../components/TopNav'
import './OwnerRegisterVehiclePage.css'

type PhotoUploadItem = {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'done' | 'error'
}

type FormStep = 1 | 2 | 3

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
  const [photoUrlsState, setPhotoUrlsState] = useState<string[]>([])
  const [policiesBlock, setPoliciesBlock] = useState('')

  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successId, setSuccessId] = useState<number | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState<'registration' | 'insurance' | null>(null)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [photoUploads, setPhotoUploads] = useState<PhotoUploadItem[]>([])
  const [registrationPreviewUrl, setRegistrationPreviewUrl] = useState<string | null>(null)
  const [insurancePreviewUrl, setInsurancePreviewUrl] = useState<string | null>(null)
  const [step, setStep] = useState<FormStep>(1)

  const photoUrls = useMemo(() => photoUrlsState.filter(Boolean), [photoUrlsState])
  const policyLines = useMemo(() => splitLinesUrls(policiesBlock), [policiesBlock])
  const stationAddressOptions = useMemo(
    () =>
      stations
        .map((s) => (s.address ?? '').trim())
        .filter(Boolean)
        .filter((addr, idx, arr) => arr.indexOf(addr) === idx),
    [stations],
  )
  const selectedStationName = useMemo(() => {
    const id = Number(stationId)
    if (!Number.isFinite(id) || id <= 0) return '—'
    return stations.find((s) => s.id === id)?.name ?? `#${stationId}`
  }, [stationId, stations])
  const coverPhotoUrl = photoUrls[0] ?? null
  const hasDocsMissing = !registrationDocUrl || !insuranceDocUrl
  const hasPhotosMissing = photoUrls.length < 3
  const hasConfirmWarning = hasDocsMissing || hasPhotosMissing

  const fmtMoney = (v: string) => {
    const n = Number(v.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return '—'
    return `${new Intl.NumberFormat('vi-VN').format(n)} đ`
  }

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

  function validateStep(targetStep: FormStep): string | null {
    if (targetStep === 1) return null
    if (targetStep === 2) {
      if (!stationId || Number(stationId) <= 0) return 'Vui lòng chọn trạm.'
      if (!licensePlate.trim()) return 'Vui lòng nhập biển số xe.'
      if (!name.trim()) return 'Vui lòng nhập tên hiển thị xe.'
      if (!brand.trim()) return 'Vui lòng nhập hãng xe.'
      const h = parseRequiredMoney(hourlyRate, 'Giá theo giờ')
      if (h.ok === false) return h.error
      const d = parseRequiredMoney(dailyRate, 'Giá theo ngày')
      if (d.ok === false) return d.error
      const dep = parseRequiredMoney(depositAmount, 'Tiền cọc')
      if (dep.ok === false) return dep.error
      return null
    }
    return validateClient()
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

  function goNext() {
    const next = step === 1 ? 2 : 3
    const err = validateStep(next)
    if (err) {
      setSubmitErr(err)
      return
    }
    setSubmitErr(null)
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (step === 1) return
    setStep(step === 3 ? 2 : 1)
    setSubmitErr(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onUploadDocument(
    type: 'registration' | 'insurance',
    file: File | null,
  ) {
    if (!file) return
    setUploadErr(null)
    setUploadingDoc(type)
    try {
      const url = await uploadOwnerVehicleDocument(file)
      if (type === 'registration') {
        setRegistrationDocUrl(url)
        setRegistrationPreviewUrl(URL.createObjectURL(file))
      } else {
        setInsuranceDocUrl(url)
        setInsurancePreviewUrl(URL.createObjectURL(file))
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload file thất bại.')
    } finally {
      setUploadingDoc(null)
    }
  }

  async function onUploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadErr(null)
    setPhotoUploads([])
    setUploadingPhotos(true)
    try {
      for (const file of Array.from(files)) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        setPhotoUploads((prev) => [
          ...prev,
          { id, name: file.name, progress: 0, status: 'uploading' },
        ])
        try {
          const url = await uploadOwnerVehiclePhotoWithProgress(file, (percent) => {
            setPhotoUploads((prev) =>
              prev.map((it) => (it.id === id ? { ...it, progress: percent } : it)),
            )
          })
          setPhotoUploads((prev) =>
            prev.map((it) =>
              it.id === id ? { ...it, progress: 100, status: 'done' } : it,
            ),
          )
          setPhotoUrlsState((prev) => [...prev, url])
        } catch (e) {
          setPhotoUploads((prev) =>
            prev.map((it) => (it.id === id ? { ...it, status: 'error' } : it)),
          )
          throw e
        }
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload ảnh xe thất bại.')
    } finally {
      setUploadingPhotos(false)
    }
  }

  function removePhotoAt(index: number) {
    setPhotoUrlsState((prev) => prev.filter((_, i) => i !== index))
  }

  function movePhoto(index: number, direction: 'left' | 'right') {
    setPhotoUrlsState((prev) => {
      const target = direction === 'left' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const temp = next[index]
      next[index] = next[target]
      next[target] = temp
      return next
    })
  }

  function setAsCover(index: number) {
    setPhotoUrlsState((prev) => {
      if (index <= 0 || index >= prev.length) return prev
      const next = [...prev]
      const [picked] = next.splice(index, 1)
      next.unshift(picked)
      return next
    })
  }

  return (
    <div className="owreg owreg--clean">
      <TopNav solid />

      <main className="owreg__main owreg__main--clean">
        <h1 className="owreg__title">Đăng xe cho thuê</h1>
        <p className="owreg__lead">
          Hoàn thiện hồ sơ xe của bạn theo từng khối thông tin. Hồ sơ sẽ được admin duyệt trước khi
          xe hiển thị cho thuê. Cần tối thiểu <strong>3 ảnh xe</strong> và đủ{' '}
          <strong>giấy đăng ký + bảo hiểm</strong>.
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
                  setPhotoUrlsState([])
                  setRegistrationDocUrl('')
                  setInsuranceDocUrl('')
                  setRegistrationPreviewUrl(null)
                  setInsurancePreviewUrl(null)
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
        {uploadErr ? (
          <p className="owreg__err" role="alert">
            {uploadErr}
          </p>
        ) : null}

        {successId == null ? (
          <form className="owreg__form owreg__form--clean" onSubmit={onSubmit}>
            <div className="owreg__stepper" role="tablist" aria-label="Các bước đăng xe">
              <button
                type="button"
                className={`owreg__step ${step === 1 ? 'is-active' : ''} ${step > 1 ? 'is-done' : ''}`}
                onClick={() => setStep(1)}
              >
                <span className="owreg__step-num">1</span>
                <span className="owreg__step-label">Thông tin xe</span>
              </button>
              <button
                type="button"
                className={`owreg__step ${step === 2 ? 'is-active' : ''} ${step > 2 ? 'is-done' : ''}`}
                onClick={() => setStep(2)}
              >
                <span className="owreg__step-num">2</span>
                <span className="owreg__step-label">Giấy tờ</span>
              </button>
              <button
                type="button"
                className={`owreg__step ${step === 3 ? 'is-active' : ''}`}
                onClick={() => {
                  const err = validateStep(3)
                  if (err) {
                    setSubmitErr(err)
                    return
                  }
                  setStep(3)
                }}
              >
                <span className="owreg__step-num">3</span>
                <span className="owreg__step-label">Xác nhận</span>
              </button>
            </div>

            <section className="owreg__section" style={{ display: step === 1 ? 'block' : 'none' }}>
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

            <section className="owreg__section" style={{ display: step === 1 ? 'block' : 'none' }}>
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
                  <select
                    className="owreg__input"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  >
                    <option value="">— Chọn số chỗ —</option>
                    <option value="2">2</option>
                    <option value="4">4</option>
                    <option value="8">8</option>
                    <option value="16">16</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="owreg__section" style={{ display: step === 1 ? 'block' : 'none' }}>
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

            <section className="owreg__section" style={{ display: step === 1 ? 'block' : 'none' }}>
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
                <select
                  className="owreg__input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                >
                  <option value="">— Chọn địa chỉ từ trạm —</option>
                  {stationAddressOptions.map((addr) => (
                    <option key={addr} value={addr}>
                      {addr}
                    </option>
                  ))}
                </select>
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

            <section className="owreg__section" style={{ display: step === 2 ? 'block' : 'none' }}>
              <h2 className="owreg__section-title">Giấy tờ (upload ảnh)</h2>
              <label className="owreg__field">
                <span className="owreg__label">Giấy đăng ký / đăng kiểm</span>
                <input
                  className="owreg__file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    void onUploadDocument('registration', e.currentTarget.files?.[0] ?? null)
                  }
                />
                <p className="owreg__hint">
                  {uploadingDoc === 'registration'
                    ? 'Đang upload giấy đăng ký...'
                    : registrationDocUrl
                      ? 'Đã upload. Bạn có thể chọn file khác để thay.'
                      : 'Chọn ảnh để upload.'}
                </p>
                {registrationPreviewUrl ? (
                  <a
                    href={registrationPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="owreg__doc-preview"
                  >
                    <img
                      src={registrationPreviewUrl}
                      alt="Preview giấy đăng ký"
                      className="owreg__doc-preview-img"
                    />
                  </a>
                ) : null}
              </label>
              <label className="owreg__field">
                <span className="owreg__label">Giấy bảo hiểm</span>
                <input
                  className="owreg__file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    void onUploadDocument('insurance', e.currentTarget.files?.[0] ?? null)
                  }
                />
                <p className="owreg__hint">
                  {uploadingDoc === 'insurance'
                    ? 'Đang upload giấy bảo hiểm...'
                    : insuranceDocUrl
                      ? 'Đã upload. Bạn có thể chọn file khác để thay.'
                      : 'Chọn ảnh để upload.'}
                </p>
                {insurancePreviewUrl ? (
                  <a
                    href={insurancePreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="owreg__doc-preview"
                  >
                    <img
                      src={insurancePreviewUrl}
                      alt="Preview giấy bảo hiểm"
                      className="owreg__doc-preview-img"
                    />
                  </a>
                ) : null}
              </label>
            </section>

            <section className="owreg__section" style={{ display: step === 2 ? 'block' : 'none' }}>
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
                <input
                  className="owreg__file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => void onUploadPhotos(e.currentTarget.files)}
                />
                <p className="owreg__hint">
                  {uploadingPhotos
                    ? 'Đang upload ảnh xe...'
                    : 'Chọn nhiều ảnh để upload, URL sẽ tự thêm vào danh sách bên dưới.'}
                </p>
                {photoUploads.length > 0 ? (
                  <div className="owreg__upload-list" role="status" aria-live="polite">
                    {photoUploads.map((it) => (
                      <div key={it.id} className="owreg__upload-item">
                        <div className="owreg__upload-head">
                          <span className="owreg__upload-name">{it.name}</span>
                          <span className="owreg__upload-meta">
                            {it.status === 'error'
                              ? 'Lỗi'
                              : it.status === 'done'
                                ? 'Hoàn tất'
                                : `${it.progress}%`}
                          </span>
                        </div>
                        <div className="owreg__upload-bar">
                          <span style={{ width: `${it.progress}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {photoUrls.length > 0 ? (
                  <div className="owreg__thumb-grid">
                    {photoUrls.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="owreg__thumb-card-wrap">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="owreg__thumb-card"
                          title={`Ảnh ${idx + 1}`}
                        >
                          <img
                            src={url}
                            alt={`Ảnh xe ${idx + 1}`}
                            className="owreg__thumb-img"
                            loading="lazy"
                          />
                        </a>
                        <div className="owreg__thumb-tools">
                          {idx === 0 ? (
                            <span className="owreg__thumb-cover">Ảnh đại diện</span>
                          ) : (
                            <button
                              type="button"
                              className="owreg__thumb-btn"
                              onClick={() => setAsCover(idx)}
                            >
                              Đặt đại diện
                            </button>
                          )}
                          <div className="owreg__thumb-move">
                            <button
                              type="button"
                              className="owreg__thumb-btn"
                              onClick={() => movePhoto(idx, 'left')}
                              disabled={idx === 0}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              className="owreg__thumb-btn"
                              onClick={() => movePhoto(idx, 'right')}
                              disabled={idx === photoUrls.length - 1}
                            >
                              →
                            </button>
                            <button
                              type="button"
                              className="owreg__thumb-btn owreg__thumb-btn--danger"
                              onClick={() => removePhotoAt(idx)}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="owreg__hint">
                  URL ảnh được hệ thống lưu tự động sau khi upload; không cần nhập tay.
                </p>
              </label>
            </section>

            <section className="owreg__section" style={{ display: step === 3 ? 'block' : 'none' }}>
              <h2 className="owreg__section-title">Xác nhận &amp; điều khoản</h2>
              {hasConfirmWarning ? (
                <div className="owreg__confirm-alert" role="alert">
                  <strong>Chưa đủ hồ sơ để gửi duyệt:</strong>
                  <ul>
                    {hasDocsMissing ? <li>Thiếu giấy đăng ký hoặc giấy bảo hiểm.</li> : null}
                    {hasPhotosMissing ? (
                      <li>Cần ít nhất 3 ảnh xe (hiện có {photoUrls.length}).</li>
                    ) : null}
                  </ul>
                </div>
              ) : (
                <p className="owreg__confirm-ok" role="status">
                  Hồ sơ đã đủ điều kiện cơ bản để gửi duyệt.
                </p>
              )}
              <div className="owreg__confirm-hero">
                <div className="owreg__confirm-cover">
                  {coverPhotoUrl ? (
                    <img
                      src={coverPhotoUrl}
                      alt="Ảnh đại diện xe"
                      className="owreg__confirm-cover-img"
                    />
                  ) : (
                    <div className="owreg__confirm-cover-empty">Chưa có ảnh đại diện</div>
                  )}
                </div>
                <div className="owreg__confirm-titleblock">
                  <h3>{name || 'Chưa đặt tên xe'}</h3>
                  <p>
                    {brand || '—'} · {licensePlate || '—'}
                  </p>
                  <div className="owreg__confirm-pills">
                    <span className={registrationDocUrl ? 'is-ok' : 'is-bad'}>
                      Đăng ký: {registrationDocUrl ? 'Đã có' : 'Thiếu'}
                    </span>
                    <span className={insuranceDocUrl ? 'is-ok' : 'is-bad'}>
                      Bảo hiểm: {insuranceDocUrl ? 'Đã có' : 'Thiếu'}
                    </span>
                    <span className={photoUrls.length >= 3 ? 'is-ok' : 'is-bad'}>
                      Ảnh xe: {photoUrls.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="owreg__confirm-grid">
                <p><strong>Xe:</strong> {name || '—'} · {brand || '—'}</p>
                <p><strong>Biển số:</strong> {licensePlate || '—'}</p>
                <p><strong>Trạm:</strong> {selectedStationName}</p>
                <p><strong>Số ảnh:</strong> {photoUrls.length}</p>
                <p><strong>Giá theo giờ:</strong> {fmtMoney(hourlyRate)}</p>
                <p><strong>Giá theo ngày:</strong> {fmtMoney(dailyRate)}</p>
                <p><strong>Tiền cọc:</strong> {fmtMoney(depositAmount)}</p>
                <p><strong>Địa chỉ giao xe:</strong> {address || '—'}</p>
                <p><strong>Giấy đăng ký:</strong> {registrationDocUrl ? 'Đã upload' : 'Chưa có'}</p>
                <p><strong>Bảo hiểm:</strong> {insuranceDocUrl ? 'Đã upload' : 'Chưa có'}</p>
              </div>
              <p className="owreg__hint">
                Vui lòng kiểm tra lại thông tin trước khi gửi duyệt. Sau khi gửi, bạn vẫn có thể chỉnh
                sửa ở mục “Yêu cầu xe của tôi” nếu trạng thái cho phép.
              </p>
            </section>

            <section className="owreg__section" style={{ display: step === 3 ? 'block' : 'none' }}>
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
              {step > 1 ? (
                <button type="button" className="owreg__btn owreg__btn--ghost" onClick={goBack}>
                  Quay lại
                </button>
              ) : null}
              {step < 3 ? (
                <button
                  type="button"
                  className="owreg__btn owreg__btn--primary"
                  onClick={goNext}
                  disabled={loadingStations || stations.length === 0}
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  type="submit"
                  className="owreg__btn owreg__btn--primary"
                  disabled={submitting || loadingStations || stations.length === 0}
                >
                  {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
                </button>
              )}
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
