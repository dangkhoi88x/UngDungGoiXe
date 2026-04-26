import { useEffect, useState, type FormEvent } from 'react'

type TopNavProps = {
  solid?: boolean
}

export default function TopNav({ solid = false }: TopNavProps) {
  const [authUi, setAuthUi] = useState<{ loggedIn: boolean; displayName: string | null }>({
    loggedIn: false,
    displayName: null,
  })
  const [navQuery, setNavQuery] = useState('')

  useEffect(() => {
    const sync = () => {
      const token = localStorage.getItem('accessToken')
      const displayName = localStorage.getItem('userDisplayName')?.trim() || null
      setAuthUi({ loggedIn: Boolean(token), displayName })
    }
    sync()
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function handleNavSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = navQuery.trim()
    if (!q) return
    window.location.href = `/rent?q=${encodeURIComponent(q)}`
  }

  return (
    <header className={`cr-nav ${solid ? 'cr-nav--solid' : ''}`}>
      <div className="cr-nav__left">
        <a className="cr-nav__logo" href="/">
          <span className="cr-nav__logo-mark" aria-hidden="true">
            H
          </span>
          Horizon
        </a>
        <ul className="cr-nav__links">
          <li><a href="/blog">Blog</a></li>
          <li><a href="/rent">Car Rental</a></li>
          <li>
            <a href="/account/orders">Lịch sử</a>
          </li>
        </ul>
      </div>
      <div className="cr-nav__search-wrap">
        <form className="cr-nav__search" onSubmit={handleNavSearchSubmit} role="search">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            name="navSearch"
            placeholder="Search destination..."
            aria-label="Search destination"
            value={navQuery}
            onChange={(ev) => setNavQuery(ev.target.value)}
          />
        </form>
      </div>
      <div className="cr-nav__right">
        <button type="button" className="cr-nav__lang" aria-label="Language English">
          🌐 EN
        </button>
        {authUi.loggedIn ? (
          <>
            <a className="cr-nav__owner-btn" href="/owner/register-vehicle">
              Đăng ký cho thuê xe
            </a>
            <a className="cr-nav__account-btn" href="/account" title={authUi.displayName ?? 'Tài khoản'}>
              {authUi.displayName ? `Hi, ${authUi.displayName}` : 'My Account'}
            </a>
            <a className="cr-nav__logout-btn" href="/logout">
              Log Out
            </a>
          </>
        ) : (
          <>
            <a className="cr-nav__login" href="/auth">
              Log In
            </a>
            <a className="cr-nav__signup" href="/auth">
              Sign Up
            </a>
          </>
        )}
      </div>
    </header>
  )
}
