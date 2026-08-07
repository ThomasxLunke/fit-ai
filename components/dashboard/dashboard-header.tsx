import Link from 'next/link'
import { ThemeToggleButton } from '@/components/landing/theme-toggle-button'
import { SignOutButton } from '@/components/landing/sign-out-button'

// Same shell as OnboardingHeader — logo back to the landing page, theme
// toggle, and here also a sign-out action since this is where a user
// actually lands once authenticated.
export function DashboardHeader() {
  return (
    <header>
      <div className="lg-wrap lg-header-inner">
        <Link href="/" className="lg-logo" title="Retour à l'accueil">
          <span className="lg-dot" />
          Fit-AI
        </Link>
        <div className="lg-header-actions">
          <ThemeToggleButton />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
