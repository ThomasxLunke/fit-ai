import { X } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ThemeToggleButton } from './theme-toggle-button'
import { CtaAction } from './cta-action'
import { SignOutButton } from './sign-out-button'
import { landingFontVariables } from './fonts'
import type { LandingCta } from './cta'

const NAV_LINKS = [
  { href: '#comment', label: 'Comment ça marche' },
  { href: '#resultat', label: 'Résultat' },
  { href: '#stack', label: 'Stack' },
]

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
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions — hidden below the nav breakpoint, replaced by
            the burger + sheet so everything stays reachable on mobile
            instead of just disappearing with the nav. */}
        <div className="lg-header-actions lg-header-actions-desktop">
          <ThemeToggleButton />
          {isLoggedIn && <SignOutButton />}
          {cta.secondary && (
            <CtaAction className="lg-btn lg-btn-ghost" link={cta.secondary} />
          )}
          <CtaAction className="lg-btn lg-btn-primary" link={cta.primary} />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="lg-icon-btn lg-menu-trigger"
              aria-label="Ouvrir le menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            showCloseButton={false}
            className={`landing-scope ${landingFontVariables} lg-mobile-sheet`}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Navigation et connexion
            </SheetDescription>

            <div className="lg-mobile-sheet-head">
              <div className="lg-logo">
                <span className="lg-dot" />
                Fit-AI
              </div>
              <div className="lg-mobile-sheet-head-actions">
                <ThemeToggleButton />
                <SheetClose asChild>
                  <button
                    type="button"
                    className="lg-icon-btn"
                    aria-label="Fermer le menu"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </SheetClose>
              </div>
            </div>

            <nav className="lg-mobile-nav">
              {NAV_LINKS.map((link) => (
                <SheetClose asChild key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </SheetClose>
              ))}
            </nav>

            <div className="lg-mobile-sheet-auth">
              <span className="lg-eyebrow">authentification</span>
              <div className="lg-mobile-sheet-actions">
                <CtaAction
                  className="lg-btn lg-btn-primary"
                  link={cta.primary}
                />
                {cta.secondary && (
                  <CtaAction
                    className="lg-btn lg-btn-ghost"
                    link={cta.secondary}
                  />
                )}
                {isLoggedIn && <SignOutButton />}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
