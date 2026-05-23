import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPostLoginPath,
  loginRequest,
  persistUserDisplayName,
  registerRequest,
  resolveGoogleOAuthClientId,
} from '../api/auth'
import './AuthPage.css'

type AuthMode = 'signin' | 'signup'

function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [loading, setLoading] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status && statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [status])

  const title = useMemo(
    () => (mode === 'signin' ? 'Welcome back' : 'Create an account'),
    [mode]
  )

  async function startGoogleOAuth() {
    setGoogleBusy(true)
    try {
      const googleClientId = await resolveGoogleOAuthClientId()
      if (!googleClientId) {
        setStatus({
          type: 'error',
          text:
            'Chưa có Google Web Client ID: trong IntelliJ, thêm OAUTH_GOOGLE_ID (và OAUTH_GOOGLE_SECRET) vào Run Configuration của Spring Boot; khởi động backend. Tuỳ chọn: VITE_OAUTH_GOOGLE_ID trong frontend/.env nếu không dùng proxy /api.',
        })
        return
      }
      const redirectUri = `${window.location.origin}/auth/google`
      const state = crypto.randomUUID()
      sessionStorage.setItem('google_oauth_state', state)
      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
      })
      window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
    } finally {
      setGoogleBusy(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)
    const form = event.currentTarget
    const fd = new FormData(form)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')

    if (!email || !password) {
      setStatus({ type: 'error', text: 'Vui lòng nhập email và mật khẩu.' })
      return
    }

    if (mode === 'signup') {
      const firstName = String(fd.get('firstName') ?? '').trim()
      const lastName = String(fd.get('lastName') ?? '').trim()
      const confirm = String(fd.get('confirmPassword') ?? '')
      if (!firstName || !lastName) {
        setStatus({ type: 'error', text: 'Vui lòng nhập họ và tên.' })
        return
      }
      if (password !== confirm) {
        setStatus({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const firstName = String(fd.get('firstName') ?? '').trim()
        const lastName = String(fd.get('lastName') ?? '').trim()
        await registerRequest({ email, password, firstName, lastName })
        setStatus({ type: 'success', text: 'Đăng ký thành công. Bạn có thể đăng nhập.' })
        setMode('signin')
        form.reset()
      } else {
        const result = await loginRequest({ email, password })
        if (result.accessToken) {
          localStorage.setItem('accessToken', result.accessToken)
        }

        persistUserDisplayName(result.firstName, result.lastName)
        navigate(getPostLoginPath(result.accessToken), { replace: true })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra.'
      setStatus({ type: 'error', text: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-left">
          <div className="auth-left__glow" aria-hidden="true" />
          <h1>Thuê xe nhanh, an tâm trên mọi hành trình.</h1>
          <ul className="auth-feature-list">
            <li>
              <span className="auth-feature-list__icon">||</span>
              <div>
                <h2>Đặt xe gọn hơn</h2>
                <p>
                  Tìm xe, chọn lịch và thanh toán trong một luồng rõ ràng.
                </p>
              </div>
            </li>
            <li>
              <span className="auth-feature-list__icon">[]</span>
              <div>
                <h2>Quản lý minh bạch</h2>
                <p>
                  Theo dõi hồ sơ, booking và trạng thái xác minh ngay trong tài khoản.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div className="auth-card">
          <div className="auth-mode-toggle" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={mode === 'signin' ? 'is-active' : ''}
              onClick={() => setMode('signin')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => setMode('signup')}
            >
              Đăng ký
            </button>
          </div>

          <h2 className="auth-card__title">{title}</h2>
          <p className="auth-card__subtitle">
            {mode === 'signin' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button
              type="button"
              className="auth-link-button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Tạo tài khoản' : 'Đăng nhập'}
            </button>
          </p>

          {status ? (
            <div
              ref={statusRef}
              className={`auth-status ${status.type === 'error' ? 'auth-status--error' : 'auth-status--success'}`}
              role="status"
            >
              {status.text}
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <div className="auth-form__row">
                <label>
                  <span>First name</span>
                  <input
                    type="text"
                    placeholder="Nguyễn"
                    autoComplete="given-name"
                    name="firstName"
                    required
                  />
                </label>
                <label>
                  <span>Last name</span>
                  <input
                    type="text"
                    placeholder="Văn A"
                    autoComplete="family-name"
                    name="lastName"
                    required
                  />
                </label>
              </div>
            ) : null}
            <label>
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                name="email"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                name="password"
                minLength={8}
                required
              />
            </label>
            {mode === 'signup' ? (
              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  name="confirmPassword"
                  minLength={8}
                  required
                />
              </label>
            ) : null}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>

          <div className="auth-divider">or continue with</div>

          <div className="auth-social">
            <button
              type="button"
              className="auth-social__btn"
              onClick={() =>
                setStatus({ type: 'error', text: 'Đăng nhập Github chưa được bật trong phiên bản này.' })
              }
            >
              Github
            </button>
            <button
              type="button"
              className="auth-social__btn auth-social__btn--google"
              title="Đăng nhập bằng Google"
              disabled={googleBusy}
              onClick={() => void startGoogleOAuth()}
            >
              {googleBusy ? 'Đang tải…' : 'Google'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default AuthPage
