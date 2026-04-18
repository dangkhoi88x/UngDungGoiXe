import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginRequest, persistUserDisplayName, registerRequest, rolesFromJwt } from '../api/auth'
import './AuthPage.css'

type AuthMode = 'signin' | 'signup'

function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  const title = useMemo(
    () => (mode === 'signin' ? 'Welcome back' : 'Create an account'),
    [mode]
  )

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
        const roles = rolesFromJwt(result.accessToken)
        console.log(rolesFromJwt(result.accessToken))
        const normalizedRoles = roles.map((r) => r.trim().toUpperCase())
        const isAdmin = normalizedRoles.some(
          (r) => r === 'ROLE_ADMIN' || r === 'ADMIN' || r === 'ROLE_SUPER_ADMIN' || r === 'SUPER_ADMIN' || r.startsWith('ROLE_ADMIN')
        )
        navigate(isAdmin ? '/admin' : '/', { replace: true })
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
          <h1>Move Fast. Break Nothing.</h1>
          <ul className="auth-feature-list">
            <li>
              <span className="auth-feature-list__icon">||</span>
              <div>
                <h2>Remove Bottlenecks</h2>
                <p>
                  Simplify release flow and remove handoff friction across teams.
                </p>
              </div>
            </li>
            <li>
              <span className="auth-feature-list__icon">[]</span>
              <div>
                <h2>Access Risk Analysis</h2>
                <p>
                  Assess changes faster using clear context and predictable checks.
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
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
          </div>

          <h2 className="auth-card__title">{title}</h2>
          <p className="auth-card__subtitle">
            {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
            <button
              type="button"
              className="auth-link-button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          {status ? (
            <div
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
              {loading ? 'Đang xử lý…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          <div className="auth-divider">or continue with</div>

          <div className="auth-social">
            <button type="button" className="auth-social__btn">
              Github
            </button>
            <button type="button" className="auth-social__btn">
              Google
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default AuthPage
