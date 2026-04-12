import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { persistUserDisplayName } from '../api/auth'
import {
  fetchMyInfo,
  licenseVerificationLabel,
  userDisplayName,
  type ApiErrorWithStatus,
  type UserProfileDto,
} from '../api/users'
import './UserAccountPage.css'

function clearSessionAndGoAuth() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('userDisplayName')
  window.location.replace('/auth')
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}

function initials(profile: UserProfileDto): string {
  const a = (profile.firstName || '').trim().charAt(0)
  const b = (profile.lastName || '').trim().charAt(0)
  const s = (a + b).toUpperCase()
  if (s) return s
  return (profile.email || '?').charAt(0).toUpperCase()
}

function truncateMiddle(s: string, head = 8, tail = 6): string {
  if (s.length <= head + tail + 3) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function IconHome() {
  return (
    <svg className="uacc-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconUser() {
  return (
    <svg className="uacc-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg className="uacc-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  )
}

function IconSection({ children }: { children: ReactNode }) {
  return <span className="uacc-section__glyph">{children}</span>
}

function InfoRow({
  label,
  children,
  chevron,
}: {
  label: string
  children: React.ReactNode
  chevron?: boolean
}) {
  return (
    <div className="uacc-row">
      <span className="uacc-row__label">{label}</span>
      <span className="uacc-row__value">
        {children}
        {chevron ? (
          <span className="uacc-row__chevron" aria-hidden>
            ▾
          </span>
        ) : null}
      </span>
    </div>
  )
}

function roleLabelVi(role: string): string {
  const r = role.toUpperCase()
  if (r === 'ADMIN') return 'Quản trị'
  if (r === 'USER') return 'Khách hàng'
  if (r === 'DRIVER') return 'Tài xế'
  return role
}

export default function UserAccountPage() {
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [discardBusy, setDiscardBusy] = useState(false)
  const [copyHint, setCopyHint] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) {
      window.location.replace('/auth')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyInfo()
      setProfile(data)
      persistUserDisplayName(data.firstName ?? '', data.lastName ?? '')
    } catch (e) {
      const status = typeof e === 'object' && e && 'status' in e ? (e as ApiErrorWithStatus).status : undefined
      if (status === 401) {
        clearSessionAndGoAuth()
        return
      }
      const msg = e instanceof Error ? e.message : 'Không tải được hồ sơ.'
      setError(msg)
    } finally {
      setLoading(false)
      setDiscardBusy(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const displayName = profile ? userDisplayName(profile) : ''
  const rolePills = useMemo(() => {
    if (!profile?.roles?.length) return [] as string[]
    return [...new Set(profile.roles.map(roleLabelVi))]
  }, [profile])

  async function handleCopyEmail() {
    if (!profile?.email) return
    const ok = await copyText(profile.email)
    setCopyHint(ok ? 'Đã sao chép' : 'Không sao chép được')
    window.setTimeout(() => setCopyHint(null), 2000)
  }

  async function handleDiscard() {
    setDiscardBusy(true)
    await loadProfile()
  }

  return (
    <div className="uacc">
      <header className="uacc__toolbar">
        <nav className="uacc__crumb" aria-label="Breadcrumb">
          <a className="uacc__crumb-link" href="/" title="Trang chủ">
            <IconHome />
          </a>
          <span className="uacc__crumb-sep" aria-hidden>
            /
          </span>
          <span className="uacc__crumb-muted">Tài khoản</span>
          <span className="uacc__crumb-sep" aria-hidden>
            /
          </span>
          <span className="uacc__crumb-current">
            <IconUser />
            Thông tin chung
          </span>
        </nav>
        <div className="uacc__toolbar-actions">
          <button
            type="button"
            className="uacc__btn uacc__btn--ghost"
            onClick={() => void handleDiscard()}
            disabled={loading || discardBusy}
          >
            {discardBusy ? 'Đang tải…' : 'Hủy thay đổi'}
          </button>
          <button
            type="button"
            className="uacc__btn uacc__btn--primary"
            disabled
            title="Cập nhật hồ sơ qua API sẽ được bổ sung sau"
          >
            Lưu thay đổi
          </button>
        </div>
      </header>

      <div className="uacc__shell">
        {loading && !profile ? (
          <div className="uacc__skeleton-card" aria-busy="true">
            <div className="uacc__skeleton-banner" />
            <div className="uacc__skeleton-avatar" />
            <div className="uacc__skeleton-lines" />
          </div>
        ) : null}

        {error && !profile && !loading ? <p className="uacc__error-banner">{error}</p> : null}

        {profile ? (
          <article className="uacc__card">
            <div className="uacc__banner" aria-hidden>
              <div className="uacc__banner-mesh" />
            </div>

            <div className="uacc__profile-block">
              <div className="uacc__avatar" aria-hidden>
                <span>{initials(profile)}</span>
              </div>
              <div className="uacc__identity">
                <div className="uacc__name-row">
                  <h1 className="uacc__name">{displayName}</h1>
                  <a className="uacc__update-btn" href="/account/update">
                    Cập nhật thông tin
                  </a>
                </div>
                <p className="uacc__email-row">
                  <span className="uacc__email-text" title={profile.email}>
                    {truncateMiddle(profile.email, 10, 8)}
                  </span>
                  <button
                    type="button"
                    className="uacc__icon-btn"
                    onClick={() => void handleCopyEmail()}
                    aria-label="Sao chép email"
                  >
                    <IconCopy />
                  </button>
                  {copyHint ? <span className="uacc__copy-hint">{copyHint}</span> : null}
                </p>
                <p className="uacc__meta-line">
                  <span className="uacc__meta-link">
                    {rolePills.length ? rolePills.join(' · ') : 'Thành viên VEX'}
                  </span>
                  <span className="uacc__meta-dot" aria-hidden>
                    ·
                  </span>
                  <span>ID #{profile.id}</span>
                </p>
                <ul className="uacc__pills" aria-label="Thẻ trạng thái">
                  {rolePills.map((label, i) => (
                    <li key={`${label}-${i}`} className="uacc__pill">
                      {label}
                    </li>
                  ))}
                  {profile.licenseVerificationStatus === 'APPROVED' ? (
                    <li className="uacc__pill uacc__pill--hot">GPLX đã xác minh</li>
                  ) : profile.licenseVerificationStatus === 'PENDING' ? (
                    <li className="uacc__pill uacc__pill--soft">GPLX chờ duyệt</li>
                  ) : profile.licenseVerificationStatus === 'REJECTED' ? (
                    <li className="uacc__pill uacc__pill--soft">GPLX bị từ chối</li>
                  ) : (
                    <li className="uacc__pill uacc__pill--soft">Chưa gửi / chưa xác minh GPLX</li>
                  )}
                  <li className="uacc__pill uacc__pill--accent">VEX Member</li>
                </ul>
              </div>
            </div>

            <div className="uacc__sections">
              <section className="uacc-section">
                <h2 className="uacc-section__title">
                  <IconSection>◆</IconSection>
                  Thông tin tài khoản
                </h2>
                <InfoRow label="Họ và tên">{displayName}</InfoRow>
                <InfoRow label="Email">{profile.email}</InfoRow>
                <InfoRow label="Số điện thoại">{profile.phone?.trim() || '—'}</InfoRow>
              </section>

              <section className="uacc-section">
                <h2 className="uacc-section__title">
                  <IconSection>▣</IconSection>
                  Giấy tờ &amp; GPLX
                </h2>
                <InfoRow label="CMND / CCCD">{profile.identityNumber?.trim() || '—'}</InfoRow>
                <InfoRow label="Số GPLX">{profile.licenseNumber?.trim() || '—'}</InfoRow>
                <InfoRow label="Trạng thái GPLX" chevron>
                  {licenseVerificationLabel(profile.licenseVerificationStatus)}
                </InfoRow>
                <InfoRow label="Ảnh GPLX (trước / sau)">
                  <span className="uacc__inline-links">
                    {profile.licenseCardFrontImageUrl ? (
                      <a href={profile.licenseCardFrontImageUrl} target="_blank" rel="noreferrer">
                        Trước
                      </a>
                    ) : null}
                    {profile.licenseCardFrontImageUrl && profile.licenseCardBackImageUrl ? (
                      <span className="uacc__sep">·</span>
                    ) : null}
                    {profile.licenseCardBackImageUrl ? (
                      <a href={profile.licenseCardBackImageUrl} target="_blank" rel="noreferrer">
                        Sau
                      </a>
                    ) : null}
                    {!profile.licenseCardFrontImageUrl && !profile.licenseCardBackImageUrl ? '—' : null}
                  </span>
                </InfoRow>
              </section>

              <section className="uacc-section uacc-section--last">
                <h2 className="uacc-section__title">
                  <IconSection>◇</IconSection>
                  Xác minh &amp; cập nhật
                </h2>
                <InfoRow label="Tài khoản đáng tin cậy">
                  <span
                    className={
                      profile.licenseVerificationStatus === 'APPROVED'
                        ? 'uacc__badge uacc__badge--ok'
                        : 'uacc__badge uacc__badge--pending'
                    }
                  >
                    {profile.licenseVerificationStatus === 'APPROVED'
                      ? 'ĐÃ XÁC MINH'
                      : profile.licenseVerificationStatus === 'PENDING'
                        ? 'CHỜ DUYỆT'
                        : profile.licenseVerificationStatus === 'REJECTED'
                          ? 'TỪ CHỐI'
                          : 'CHƯA GỬI HỒ SƠ'}
                  </span>
                </InfoRow>
                <InfoRow label="Cập nhật lần cuối">{formatDateTime(profile.updatedAt)}</InfoRow>
                <InfoRow label="Xác minh lúc">{formatDateTime(profile.verifiedAt)}</InfoRow>
              </section>
            </div>

            <footer className="uacc__footer">
              <a className="uacc__footer-link" href="/">
                ← Về trang chủ VEX
              </a>
              <a className="uacc__footer-link" href="/rent">
                Thuê xe
              </a>
              <button type="button" className="uacc__footer-logout" onClick={clearSessionAndGoAuth}>
                Đăng xuất
              </button>
            </footer>
          </article>
        ) : null}
      </div>
    </div>
  )
}
