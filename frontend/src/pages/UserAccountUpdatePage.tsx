import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  fetchMyInfo,
  licenseVerificationLabel,
  submitMyDocuments,
  type ApiErrorWithStatus,
  type UserProfileDto,
} from '../api/users'
import './UserAccountPage.css'

function goLogoutRoute() {
  window.location.replace('/logout')
}

function licenseStatusLabel(p: UserProfileDto | null): string {
  if (!p) return '—'
  return licenseVerificationLabel(p.licenseVerificationStatus)
}

export default function UserAccountUpdatePage() {
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [identityNumber, setIdentityNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) {
      window.location.replace('/auth')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyInfo()
      setProfile(data)
      setIdentityNumber(data.identityNumber?.trim() ?? '')
      setLicenseNumber(data.licenseNumber?.trim() ?? '')
    } catch (e) {
      const status = typeof e === 'object' && e && 'status' in e ? (e as ApiErrorWithStatus).status : undefined
      if (status === 401) {
        goLogoutRoute()
        return
      }
      setError(e instanceof Error ? e.message : 'Không tải được hồ sơ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const locked = profile?.licenseVerificationStatus === 'APPROVED'

  const statusText = useMemo(() => licenseStatusLabel(profile), [profile])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatusMsg(null)
    if (locked) return

    if (!identityNumber.trim() || !licenseNumber.trim()) {
      setStatusMsg({ type: 'err', text: 'Vui lòng nhập CMND/CCCD và số GPLX.' })
      return
    }
    if (!frontFile || !backFile) {
      setStatusMsg({ type: 'err', text: 'Vui lòng chọn ảnh GPLX mặt trước và mặt sau (JPEG, PNG hoặc WebP).' })
      return
    }

    const fd = new FormData()
    fd.set('identityNumber', identityNumber.trim())
    fd.set('licenseNumber', licenseNumber.trim())
    fd.set('frontImage', frontFile)
    fd.set('backImage', backFile)

    setSaving(true)
    try {
      const updated = await submitMyDocuments(fd)
      setProfile(updated)
      setIdentityNumber(updated.identityNumber?.trim() ?? '')
      setLicenseNumber(updated.licenseNumber?.trim() ?? '')
      setFrontFile(null)
      setBackFile(null)
      ;(e.target as HTMLFormElement).reset()
      setStatusMsg({
        type: 'ok',
        text: 'Đã gửi hồ sơ. Admin sẽ xem xét và cập nhật trạng thái GPLX trên hệ thống.',
      })
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gửi hồ sơ thất bại.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="uacc">
      <header className="uacc__toolbar">
        <nav className="uacc__crumb" aria-label="Breadcrumb">
          <a className="uacc__crumb-link" href="/" title="Trang chủ">
            VEX
          </a>
          <span className="uacc__crumb-sep" aria-hidden>
            /
          </span>
          <a className="uacc__crumb-link uacc__crumb-muted" href="/account">
            Tài khoản
          </a>
          <span className="uacc__crumb-sep" aria-hidden>
            /
          </span>
          <span className="uacc__crumb-current">Cập nhật giấy tờ</span>
        </nav>
        <div className="uacc__toolbar-actions">
          <a className="uacc__btn uacc__btn--ghost" href="/account" style={{ textDecoration: 'none' }}>
            Quay lại hồ sơ
          </a>
        </div>
      </header>

      <div className="uacc__shell uacc__shell--form">
        {loading ? <p className="uacc__muted-inline">Đang tải…</p> : null}
        {error && !loading ? <p className="uacc__error-banner">{error}</p> : null}

        {!loading && profile ? (
          <article className="uacc__card uacc__card--form">
            <div className="uacc-form__head">
              <h1 className="uacc-form__title">Cập nhật giấy tờ &amp; GPLX</h1>
              <p className="uacc-form__lead">
                Điền CMND/CCCD, số GPLX và tải ảnh hai mặt. Họ tên, email và số điện thoại không thay đổi tại đây. Sau
                khi gửi, admin sẽ duyệt trên hệ thống quản trị.
              </p>
            </div>

            {locked ? (
              <div className="uacc-form__notice uacc-form__notice--ok">
                GPLX của bạn đã được xác minh. Không cần gửi lại. Nếu cần chỉnh sửa, vui lòng liên hệ admin.
              </div>
            ) : null}

            <div className="uacc-row uacc-row--form">
              <span className="uacc-row__label">Trạng thái GPLX</span>
              <span className="uacc-row__value uacc-row__value--status">
                {statusText}
                <span className="uacc-row__chevron" aria-hidden>
                  ▾
                </span>
              </span>
            </div>

            <form className="uacc-form" onSubmit={(ev) => void onSubmit(ev)}>
              <label className="uacc-form__field">
                <span className="uacc-form__label">CMND / CCCD</span>
                <input
                  className="uacc-form__input"
                  name="identityNumber"
                  value={identityNumber}
                  onChange={(ev) => setIdentityNumber(ev.target.value)}
                  autoComplete="off"
                  disabled={locked}
                  placeholder="Số giấy tờ"
                />
              </label>

              <label className="uacc-form__field">
                <span className="uacc-form__label">Số GPLX</span>
                <input
                  className="uacc-form__input"
                  name="licenseNumber"
                  value={licenseNumber}
                  onChange={(ev) => setLicenseNumber(ev.target.value)}
                  autoComplete="off"
                  disabled={locked}
                  placeholder="Số giấy phép lái xe"
                />
              </label>

              <div className="uacc-form__field">
                <span className="uacc-form__label">Ảnh GPLX — mặt trước</span>
                <input
                  className="uacc-form__file"
                  type="file"
                  name="frontImage"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={locked}
                  onChange={(ev) => setFrontFile(ev.target.files?.[0] ?? null)}
                />
              </div>

              <div className="uacc-form__field">
                <span className="uacc-form__label">Ảnh GPLX — mặt sau</span>
                <input
                  className="uacc-form__file"
                  type="file"
                  name="backImage"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={locked}
                  onChange={(ev) => setBackFile(ev.target.files?.[0] ?? null)}
                />
              </div>

              {statusMsg ? (
                <p className={statusMsg.type === 'ok' ? 'uacc-form__feedback uacc-form__feedback--ok' : 'uacc-form__feedback uacc-form__feedback--err'}>
                  {statusMsg.text}
                </p>
              ) : null}

              <div className="uacc-form__actions">
                <button type="submit" className="uacc__btn uacc__btn--primary" disabled={locked || saving}>
                  {saving ? 'Đang gửi…' : 'Gửi hồ sơ chờ duyệt'}
                </button>
              </div>
            </form>
          </article>
        ) : null}
      </div>
    </div>
  )
}
