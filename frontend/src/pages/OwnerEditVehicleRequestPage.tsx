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
  uploadOwnerVehicleDocument,
  uploadOwnerVehiclePhotoWithProgress,
} from '../api/uploads'
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

type PhotoUploadItem = {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'done' | 'error'
}

function fuelFromDto(raw: string | null | undefined): OwnerVehicleFuelType {
  if (raw === 'ELECTRICITY') return 'ELECTRICITY'
  if (raw === 'DIESEL') return 'DIESEL'
  return 'GASOLINE'
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
  const [photoUrlsState, setPhotoUrlsState] = useState<string[]>([])
  const [policiesBlock, setPoliciesBlock] = useState('')

  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState<'registration' | 'insurance' | null>(null)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [photoUploads, setPhotoUploads] = useState<PhotoUploadItem[]>([])
  const [registrationPreviewUrl, setRegistrationPreviewUrl] = useState<string | null>(null)
  const [insurancePreviewUrl, setInsurancePreviewUrl] = useState<string | null>(null)

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
      setRegistrationPreviewUrl(dto.registrationDocUrl?.trim() || null)
      setInsurancePreviewUrl(dto.insuranceDocUrl?.trim() || null)
      setPhotoUrlsState(splitLinesUrls(joinLines(dto.photos)))
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
            {uploadErr ? (
              <p className="owreg__err" role="alert">
                {uploadErr}
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
                      <option value="DIESEL">Dầu (DIESEL)</option>
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
