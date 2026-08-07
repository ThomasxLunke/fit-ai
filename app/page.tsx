import './landing.css'
import { getSessionUserOrNull } from '@/lib/auth'
import { resolveLandingCta } from '@/components/landing/cta'
import { landingFontVariables } from '@/components/landing/fonts'
import { GridBackground } from '@/components/landing/grid-background'
import { AuthDialogProvider } from '@/components/landing/auth-dialog-provider'
import type { AuthMode } from '@/components/landing/auth-dialog'
import { SiteHeader } from '@/components/landing/site-header'
import { HeroSection } from '@/components/landing/hero-section'
import { ProblemSection } from '@/components/landing/problem-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { ResultSection } from '@/components/landing/result-section'
import { TechStackSection } from '@/components/landing/tech-stack-section'
import { FinalCtaSection } from '@/components/landing/final-cta-section'
import { SiteFooter } from '@/components/landing/site-footer'

export default async function Page({
  searchParams,
}: {
  // There's no standalone /sign-in or /sign-up page anymore — middleware
  // redirects signed-out visitors hitting a protected route back here with
  // `?auth=sign-in`, and this reopens the dialog instead of a dead link.
  searchParams: Promise<{ auth?: string }>
}) {
  const [user, { auth }] = await Promise.all([
    getSessionUserOrNull(),
    searchParams,
  ])
  const cta = resolveLandingCta(user)
  const initialAuthMode: AuthMode | undefined =
    auth === 'sign-in' || auth === 'sign-up' ? auth : undefined

  return (
    <div className={`landing-scope relative ${landingFontVariables}`}>
      <AuthDialogProvider initialMode={initialAuthMode}>
        <GridBackground />
        <SiteHeader cta={cta} isLoggedIn={user !== null} />
        <main>
          <HeroSection cta={cta} />
          <ProblemSection />
          <HowItWorksSection />
          <ResultSection />
          <TechStackSection />
          <FinalCtaSection cta={cta} />
        </main>
        <SiteFooter />
      </AuthDialogProvider>
    </div>
  )
}
