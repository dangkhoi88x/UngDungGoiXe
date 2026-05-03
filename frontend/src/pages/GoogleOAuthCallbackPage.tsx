import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getPostLoginPath,
  googleOAuthLoginRequest,
  persistUserDisplayName,
} from '../api/auth'

const GOOGLE_STATE_KEY = 'google_oauth_state'

export default function GoogleOAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('Đang xử lý đăng nhập Google…')
  /** Tranh chay logic OAuth hai lan (React Strict Mode + sessionStorage bi xoa lan dau). */
  const oauthStartedRef = useRef(false)

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      const desc = searchParams.get('error_description')
      setMsg(
        err === 'access_denied'
          ? 'Bạn đã hủy đăng nhập Google.'
          : desc || 'Đăng nhập Google thất bại.',
      )
      const t = window.setTimeout(() => navigate('/auth', { replace: true }), 2500)
      return () => window.clearTimeout(t)
    }

    if (oauthStartedRef.current) {
      return
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const stored = sessionStorage.getItem(GOOGLE_STATE_KEY)

    if (!code) {
      sessionStorage.removeItem(GOOGLE_STATE_KEY)
      setMsg('Thiếu mã xác thực từ Google.')
      const t = window.setTimeout(() => navigate('/auth', { replace: true }), 2000)
      return () => window.clearTimeout(t)
    }
    if (!state || !stored || state !== stored) {
      sessionStorage.removeItem(GOOGLE_STATE_KEY)
      setMsg(
        'Phiên đăng nhập không hợp lệ. Hãy thử lại từ trang đăng nhập. ' +
          '(Nếu vừa mở Google xong: thử luôn dùng một địa chỉ — chỉ localhost hoặc chỉ 127.0.0.1 — khớp khi bấm Đăng nhập Google.)',
      )
      const t = window.setTimeout(() => navigate('/auth', { replace: true }), 3500)
      return () => window.clearTimeout(t)
    }

    oauthStartedRef.current = true
    sessionStorage.removeItem(GOOGLE_STATE_KEY)

    const redirectUri = `${window.location.origin}/auth/google`

    void (async () => {
      try {
        const result = await googleOAuthLoginRequest({ code, redirectUri })
        if (result.accessToken) {
          localStorage.setItem('accessToken', result.accessToken)
        }
        persistUserDisplayName(result.firstName, result.lastName)
        navigate(getPostLoginPath(result.accessToken), { replace: true })
      } catch (e) {
        const text = e instanceof Error ? e.message : 'Đăng nhập Google thất bại.'
        setMsg(text)
        window.setTimeout(() => navigate('/auth', { replace: true }), 3200)
      }
    })()
  }, [navigate, searchParams])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <p role="status">{msg}</p>
    </main>
  )
}
