import { useState } from 'react'
import './LandingPage.css'

export type SectionId = 'retail' | 'workplace' | 'food'

const SECTIONS: Record<
  SectionId,
  { image: string; label: string; display: string }
> = {
  retail: {
    image: '/hero-retail.png',
    label: 'retail',
    display: 'retail',
  },
  workplace: {
    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
    label: 'workplace',
    display: 'workplace',
  },
  food: {
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80',
    label: 'food & beverage',
    display: 'food & beverage',
  },
}

const SECTION_ORDER: SectionId[] = ['retail', 'workplace', 'food']

export function LandingPage() {
  const [active, setActive] = useState<SectionId>('retail')

  return (
    <div className="landing">
      <div className="landing__bg-stack" aria-hidden="true">
        {SECTION_ORDER.map((id) => (
          <div
            key={id}
            className="landing__bg-layer"
            data-visible={active === id}
            style={{ backgroundImage: `url(${SECTIONS[id].image})` }}
          />
        ))}
      </div>

      <div className="landing__overlay" aria-hidden="true" />

      <header className="landing__hero">
        <p className="landing__headline">
          <span className="landing__headline-static">
            We design innovative interiors for high performance{' '}
          </span>
          <button
            type="button"
            className="landing__keyword"
            data-active={active === 'retail'}
            onMouseEnter={() => setActive('retail')}
            onFocus={() => setActive('retail')}
            aria-pressed={active === 'retail'}
          >
            retail
          </button>
          <span className="landing__headline-static">, </span>
          <button
            type="button"
            className="landing__keyword"
            data-active={active === 'workplace'}
            onMouseEnter={() => setActive('workplace')}
            onFocus={() => setActive('workplace')}
            aria-pressed={active === 'workplace'}
          >
            workplace
          </button>
          <span className="landing__headline-static">, and </span>
          <button
            type="button"
            className="landing__keyword landing__keyword--wide"
            data-active={active === 'food'}
            onMouseEnter={() => setActive('food')}
            onFocus={() => setActive('food')}
            aria-pressed={active === 'food'}
          >
            food &amp; beverage
          </button>
          <span className="landing__headline-static"> businesses.</span>
        </p>
      </header>

      <nav className="landing__dock" aria-label="Primary">
        <div className="landing__dock-inner">
          <span className="landing__logo" aria-hidden="true">
            ✕
          </span>
          <button
            type="button"
            className="landing__menu-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="landing__menu-icon" />
            TOP
          </button>
          <button type="button" className="landing__contact-btn">
            Contact
          </button>
        </div>
      </nav>
    </div>
  )
}
