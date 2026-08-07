import Link from 'next/link'
import { ThemeToggleButton } from '@/components/landing/theme-toggle-button'

// Deliberately not reusing SiteHeader: it resolves auth CTAs (sign-in/up,
// dashboard) that don't apply mid-onboarding — the user here is already
// authenticated. Just a way back to the landing page + the theme toggle, so
// leaving the wizard never feels like a dead end.
export function OnboardingHeader() {
  return (
    <header>
      <div className="lg-wrap lg-header-inner">
        <Link href="/" className="lg-logo" title="Retour à l'accueil">
          <span className="lg-dot" />
          Fit-AI
        </Link>
        <div className="lg-header-actions">
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  )
}
