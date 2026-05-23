import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  checkVehicleAvailability,
  computeBookingEstimate,
  createMomoPrepayTotalForBooking,
  createBooking,
  formatBookingMoney,
  fromDateTimeLocalValue,
} from '../api/bookings'
import LicenseRequiredModal from '../components/LicenseRequiredModal'
import { isLicenseApprovedForRent, type UserProfileDto } from '../api/users'
import { useAuth } from '../contexts/AuthContext'
import { fetchStationById, stationLabel, type StationDto } from '../api/stations'
import {
  fetchVehicleById,
  formatDeposit,
  formatDailyPrice,
  vehicleDisplayName,
  type VehicleDto,
} from '../api/vehicles'
import './VehicleBookingPage.css'

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'

function resolvePhotoUrl(p: string): string {
  const t = p.trim()
  if (!t) return PLACEHOLDER_IMG
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return t
}

function formatDailyRentalPrice(vehicle: VehicleDto): string {
  const price = formatDailyPrice(vehicle)
  return price === 'Liên hệ' ? price : `${price}/ngày`
}

function moneyToNumber(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDurationDays(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return '0 ngày'
  const rounded = Math.round(days * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ngày`
}

function formatDurationHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0 giờ'
  const rounded = Math.round(hours * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} giờ`
}

function toDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultRange(): { start: string; end: string } {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start)
  end.setHours(end.getHours() + 48)
  return { start: toDateTimeInput(start), end: toDateTimeInput(end) }
}

type Props = { vehicleId: number }

export default function VehicleBookingPage({ vehicleId }: Props) {
  const navigate = useNavigate()
  const { user: ctxUser, isLoggedIn } = useAuth()
  const authed = isLoggedIn || Boolean(localStorage.getItem('accessToken'))

  const [vehicle, setVehicle] = useState<VehicleDto | null>(null)
  const [station, setStation] = useState<StationDto | null>(null)
  // profile: lấy từ context, không cần fetch riêng
  const profile = ctxUser as UserProfileDto | null
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [range, setRange] = useState(defaultRange)
  const { start, end } = range
  const setStart = (v: string) => setRange((r) => ({ ...r, start: v }))
  const setEnd = (v: string) => setRange((r) => ({ ...r, end: v }))

  const [pickupMode, setPickupMode] = useState<'station' | 'delivery'>('station')
  const [extraNote, setExtraNote] = useState('')
  /** Chỉnh cho lần đặt này — gửi kèm pickupNote, không cập nhật hồ sơ tài khoản. */
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [paymentMode, setPaymentMode] = useState<
    'momoWalletPrepay' | 'momoAtmPrepay' | 'cashAtStation'
  >('momoWalletPrepay')

  const [slotAvailable, setSlotAvailable] = useState<boolean | null>(null)
  const [checkingSlot, setCheckingSlot] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const v = await fetchVehicleById(vehicleId)
      setVehicle(v)
      // Chỉ fetch station — user profile lấy từ context, không cần API call thêm
      const st = await fetchStationById(v.stationId)
      setStation(st)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Không tải được dữ liệu.')
      setVehicle(null)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (profile) {
      setNameInput([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim())
      setEmailInput(profile.email?.trim() ?? '')
      setPhoneInput(profile.phone?.trim() ?? '')
    }
  }, [profile])

  const estimate = useMemo(() => {
    if (!vehicle) return { days: 0, subtotal: 0, exactDays: 0, hours: 0, roundedUp: false }
    return computeBookingEstimate(vehicle, start, end)
  }, [vehicle, start, end])

  const timesValid = useMemo(() => {
    if (!start || !end) return false
    return new Date(end) > new Date(start)
  }, [start, end])

  useEffect(() => {
    if (!vehicle || !timesValid) {
      setSlotAvailable(null)
      return
    }
    const startIso = fromDateTimeLocalValue(start)
    const endIso = fromDateTimeLocalValue(end)
    let cancelled = false
    setCheckingSlot(true)
    const t = window.setTimeout(() => {
      void checkVehicleAvailability({ vehicleId: vehicle.id, start: startIso, end: endIso })
        .then((ok) => {
          if (!cancelled) setSlotAvailable(ok)
        })
        .catch(() => {
          if (!cancelled) setSlotAvailable(null)
        })
        .finally(() => {
          if (!cancelled) setCheckingSlot(false)
        })
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [vehicle, start, end, timesValid])

  const canSubmit =
    Boolean(vehicle && profile && timesValid && vehicle.status === 'AVAILABLE' && slotAvailable !== false)

  async function handleSubmit() {
    setSubmitError(null)
    if (!vehicle || !profile) return
    if (vehicle.status !== 'AVAILABLE') {
      setSubmitError('Xe không còn trạng thái AVAILABLE.')
      return
    }
    if (!timesValid) {
      setSubmitError('Thời gian trả phải sau thời gian nhận.')
      return
    }
    if (slotAvailable === false) {
      setSubmitError('Khung giờ này xe đã có người đặt. Vui lòng chọn lịch khác.')
      return
    }
    const startIso = fromDateTimeLocalValue(start)
    const endIso = fromDateTimeLocalValue(end)
    const modeLabel =
      pickupMode === 'station' ? 'Nhận xe tại trạm' : 'Yêu cầu giao xe / làm việc với trạm'
    const nameTrim = nameInput.trim()
    const emailTrim = emailInput.trim()
    const phoneTrim = phoneInput.trim()
    const nameLine = nameTrim ? `Họ tên: ${nameTrim}` : ''
    const emailLine = emailTrim ? `Email: ${emailTrim}` : ''
    const phoneLine = phoneTrim ? `SĐT liên hệ: ${phoneTrim}` : ''
    const pickupNote = [modeLabel, nameLine, emailLine, phoneLine, extraNote.trim()]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 8000)

    setSubmitting(true)
    try {
      const booking = await createBooking({
        renterId: profile.id,
        vehicleId: vehicle.id,
        stationId: vehicle.stationId,
        startTime: startIso,
        expectedEndTime: endIso,
        pickupNote: pickupNote || undefined,
      })

      if (paymentMode === 'momoWalletPrepay' || paymentMode === 'momoAtmPrepay') {
        const momo = await createMomoPrepayTotalForBooking(booking.id, {
          momoRequestType: paymentMode === 'momoAtmPrepay' ? 'payWithATM' : 'captureWallet',
        })
        const targetUrl = momo.payUrl || momo.deeplink || momo.qrCodeUrl
        if (!targetUrl) {
          throw new Error(
            'Đã tạo booking nhưng không lấy được link thanh toán MoMo. Vui lòng thanh toán sau trong tài khoản.',
          )
        }
        window.location.href = targetUrl
        return
      }

      navigate('/account', { replace: true })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Đặt xe thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const topbar = (
    <header className="vb-topbar">
      <a className="vb-back" href={`/rent/${vehicleId}`}>
        ← Chi tiết xe
      </a>
      <a className="vb-logo" href="/rent">
        <span className="vb-logo-mark">H</span>
        Horizon
      </a>
      <a className="vb-back" href="/account">
        Tài khoản
      </a>
    </header>
  )

  if (!authed) {
    return <Navigate to="/auth" replace />
  }

  if (loading) {
    return (
      <div className="vb-page">
        {topbar}
        <p className="vb-center">Đang tải trang đặt xe…</p>
      </div>
    )
  }

  if (loadError || !vehicle || !profile) {
    return (
      <div className="vb-page">
        {topbar}
        <main className="vb-main">
          <p className="vb-error-banner" role="alert">
            {loadError ?? 'Không tải được thông tin.'}
          </p>
          <a className="vb-back" href="/rent">
            Về danh sách xe
          </a>
        </main>
      </div>
    )
  }

  if (!isLicenseApprovedForRent(profile.licenseVerificationStatus)) {
    return (
      <div className="vb-page">
        {topbar}
        <LicenseRequiredModal
          open
          onDismiss={() => navigate(`/rent/${vehicleId}`, { replace: true })}
          currentStatus={profile.licenseVerificationStatus ?? null}
        />
      </div>
    )
  }

  const title = vehicleDisplayName(vehicle)
  const thumb = resolvePhotoUrl(vehicle.photos?.[0] ?? '')
  const stationName = station ? stationLabel(station) : `Trạm #${vehicle.stationId}`
  const dailyRate = moneyToNumber(vehicle.dailyRate)
  const depositAmount = moneyToNumber(vehicle.depositAmount)
  const momoPrepayEstimate = estimate.subtotal + depositAmount

  const slotMsg = !timesValid ? null : checkingSlot ? (
    <p className="vb-slot-msg vb-slot-msg--wait">Đang kiểm tra lịch trống…</p>
  ) : slotAvailable === true ? (
    <p className="vb-slot-msg vb-slot-msg--ok">Xe còn trống trong khung giờ đã chọn.</p>
  ) : slotAvailable === false ? (
    <p className="vb-slot-msg vb-slot-msg--bad">Khung giờ này đã có booking — vui lòng đổi lịch.</p>
  ) : (
    <p className="vb-slot-msg vb-slot-msg--wait">Không kiểm tra được lịch trống; bạn vẫn có thể thử gửi.</p>
  )

  return (
    <div className="vb-page">
      {topbar}

      <main className="vb-main">
        <h1 className="vb-heading">Hoàn tất đặt xe</h1>
        <p className="vb-lead">
          Chọn thời gian nhận — trả xe, kiểm tra lịch trống, rồi xác nhận. Hệ thống dùng tài khoản đăng nhập của bạn
          làm người thuê và gắn xe với trạm hiện tại của xe.
        </p>

        {vehicle.status !== 'AVAILABLE' ? (
          <div className="vb-warn-banner" role="status">
            Xe không ở trạng thái AVAILABLE — không thể tạo booking mới.
          </div>
        ) : null}

        {submitError ? (
          <div className="vb-error-banner" role="alert">
            {submitError}
          </div>
        ) : null}

        <div className="vb-grid">
          <div className="vb-col vb-col--left">
            <section className="vb-card">
              <h2 className="vb-card-title">Thông tin người thuê</h2>
              <div className="vb-field">
                <label className="vb-label" htmlFor="vb-fullname">
                  Họ và tên
                </label>
                <input
                  id="vb-fullname"
                  className="vb-input"
                  type="text"
                  autoComplete="name"
                  placeholder="Họ và tên người liên hệ"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="vb-field">
                <label className="vb-label" htmlFor="vb-email">
                  Email
                </label>
                <input
                  id="vb-email"
                  className="vb-input"
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="vb-field">
                <label className="vb-label" htmlFor="vb-phone">
                  Số điện thoại
                </label>
                <input
                  id="vb-phone"
                  className="vb-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ví dụ: 0912345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="vb-field">
                <span className="vb-label">Trạm giao xe</span>
                <input className="vb-input" type="text" value={stationName} readOnly />
                {station?.address ? <p className="vb-hint">{station.address}</p> : null}
              </div>
            </section>

            <section className="vb-card">
              <h2 className="vb-card-title">Hình thức nhận xe</h2>
              <div className="vb-radio-row" role="radiogroup" aria-label="Hình thức nhận xe">
                <label className="vb-radio">
                  <input
                    type="radio"
                    name="pickupMode"
                    checked={pickupMode === 'station'}
                    onChange={() => setPickupMode('station')}
                  />
                  Nhận tại trạm
                </label>
                <label className="vb-radio">
                  <input
                    type="radio"
                    name="pickupMode"
                    checked={pickupMode === 'delivery'}
                    onChange={() => setPickupMode('delivery')}
                  />
                  Giao / làm việc với trạm
                </label>
              </div>
              <div className="vb-field" style={{ marginTop: '0.85rem' }}>
                <label className="vb-label" htmlFor="vb-extra">
                  Ghi chú thêm (tùy chọn)
                </label>
                <textarea
                  id="vb-extra"
                  className="vb-textarea"
                  placeholder="Ví dụ: giờ đến trạm, biển số xe mang theo…"
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  maxLength={2000}
                />
              </div>
            </section>

            <section className="vb-card">
              <h2 className="vb-card-title">Thanh toán</h2>
              <p className="vb-hint" style={{ marginTop: 0 }}>
                Chọn hình thức thanh toán cho booking này. MoMo thu trước tiền thuê dự kiến và tiền cọc; tiền mặt sẽ
                được trạm xử lý khi nhận xe.
              </p>
              <div className="vb-pay-grid" style={{ marginTop: '0.85rem' }}>
                <label className={`vb-pay-option${paymentMode === 'momoWalletPrepay' ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMode === 'momoWalletPrepay'}
                    onChange={() => setPaymentMode('momoWalletPrepay')}
                  />
                  MoMo Ví — trả trước (tổng + cọc)
                </label>
                <label className={`vb-pay-option${paymentMode === 'momoAtmPrepay' ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMode === 'momoAtmPrepay'}
                    onChange={() => setPaymentMode('momoAtmPrepay')}
                  />
                  MoMo thẻ ATM nội địa (tổng + cọc)
                </label>
                <label className={`vb-pay-option${paymentMode === 'cashAtStation' ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMode === 'cashAtStation'}
                    onChange={() => setPaymentMode('cashAtStation')}
                  />
                  Tiền mặt tại trạm
                </label>
              </div>
              <p className="vb-hint" style={{ marginTop: '0.5rem' }}>
                Thẻ ATM: luồng <code>payWithATM</code> theo{' '}
                <a
                  href="https://developers.momo.vn/v3/vi/docs/payment/api/atm/onetime"
                  target="_blank"
                  rel="noreferrer"
                >
                  tài liệu MoMo
                </a>
                ; dùng thẻ test Napas khi môi trường sandbox.
              </p>
            </section>
          </div>

          <div className="vb-col vb-col--right">
            <section className="vb-card">
              <h2 className="vb-card-title">Đơn đặt xe</h2>

              <div className="vb-order-item">
                <img className="vb-order-thumb" src={thumb} alt="" />
                <div>
                  <p className="vb-order-name">{title}</p>
                  <p className="vb-order-meta">
                    Biển {vehicle.licensePlate} · {formatDailyRentalPrice(vehicle)}
                  </p>
                </div>
              </div>

              <div className="vb-datetime-row">
                <div className="vb-field">
                  <label className="vb-label" htmlFor="vb-start">
                    Nhận xe
                  </label>
                  <input
                    id="vb-start"
                    className="vb-input"
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="vb-field">
                  <label className="vb-label" htmlFor="vb-end">
                    Trả xe dự kiến
                  </label>
                  <input
                    id="vb-end"
                    className="vb-input"
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>
              {slotMsg}

              <div className="vb-coupon" style={{ marginTop: '1rem' }}>
                <input className="vb-input" type="text" placeholder="Mã ưu đãi" disabled />
                <button type="button" className="vb-btn-ghost" disabled>
                  Áp dụng
                </button>
              </div>

              <div className="vb-rows">
                <div className="vb-row">
                  <span>Thời lượng đã chọn</span>
                  <strong>
                    {formatDurationDays(estimate.exactDays)} ({formatDurationHours(estimate.hours)})
                  </strong>
                </div>
                <div className="vb-row">
                  <span>Số ngày tính phí</span>
                  <strong>{estimate.days} ngày</strong>
                </div>
                {estimate.roundedUp ? (
                  <p className="vb-price-note">
                    Thời lượng {formatDurationDays(estimate.exactDays)} được làm tròn thành {estimate.days} ngày theo
                    chính sách thuê theo ngày.
                  </p>
                ) : null}
                <div className="vb-row">
                  <span>
                    Tiền thuê: {estimate.days} ngày × {formatBookingMoney(dailyRate)}/ngày
                  </span>
                  <strong>{formatBookingMoney(estimate.subtotal)}</strong>
                </div>
                <div className="vb-row">
                  <span>Tiền cọc</span>
                  <strong>{formatDeposit(vehicle)}</strong>
                </div>
                <div className="vb-row vb-row--total">
                  <span>Tạm tính tiền thuê</span>
                  <span>{formatBookingMoney(estimate.subtotal)}</span>
                </div>
                {paymentMode === 'momoWalletPrepay' || paymentMode === 'momoAtmPrepay' ? (
                  <div className="vb-row">
                    <span>Số tiền MoMo dự kiến</span>
                    <strong>{formatBookingMoney(momoPrepayEstimate)}</strong>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>

        <div className="vb-actions">
          <button
            type="button"
            className="vb-submit"
            disabled={!canSubmit || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting
              ? 'Đang gửi…'
              : paymentMode === 'momoWalletPrepay' || paymentMode === 'momoAtmPrepay'
                ? paymentMode === 'momoAtmPrepay'
                  ? 'Đặt xe & thanh toán thẻ ATM (MoMo)'
                  : 'Đặt xe & thanh toán MoMo Ví'
                : 'Xác nhận đặt xe'}
          </button>
          <p className="vb-hint" style={{ textAlign: 'center', maxWidth: '28rem' }}>
            Sau khi thành công bạn được chuyển về trang tài khoản. Mã booking và thanh toán do hệ thống / trạm xử
            lý tiếp.
          </p>
        </div>
      </main>
    </div>
  )
}
