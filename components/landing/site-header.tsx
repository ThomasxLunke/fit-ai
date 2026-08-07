import { ThemeToggleButton } from './theme-toggle-button'
import { CtaAction } from './cta-action'
import { SignOutButton } from './sign-out-button'
import type { LandingCta } from './cta'

export function SiteHeader({
  cta,
  isLoggedIn,
}: {
  cta: LandingCta
  isLoggedIn: boolean
}) {
  return (
    <header>
      <div className="lg-wrap lg-header-inner">
        <div className="lg-logo">
          <span className="lg-dot" />
          Fit-AI
        </div>
        <nav className="lg-primary-nav">
          <a href="#comment">Comment ça marche</a>
          <a href="#resultat">Résultat</a>
          <a href="#stack">Stack</a>
        </nav>
        <div className="lg-header-actions">
          <ThemeToggleButton />
          {isLoggedIn && <SignOutButton />}
          {cta.secondary && (
            <CtaAction className="lg-btn lg-btn-ghost" link={cta.secondary} />
          )}
          <CtaAction className="lg-btn lg-btn-primary" link={cta.primary} />
        </div>
      </div>
    </header>
  )
}
