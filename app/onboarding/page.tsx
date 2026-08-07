import '../landing.css'
import OnboardingForm from '@/components/onboarding-form'
import { landingFontVariables } from '@/components/landing/fonts'
import { GridBackground } from '@/components/landing/grid-background'
import { OnboardingHeader } from '@/components/onboarding/onboarding-header'
import { getUserBySessionAuth } from '../actions'
import { redirect } from 'next/navigation'

export default async function page() {
  const user = await getUserBySessionAuth()

  if (user.onboarded) redirect('/dashboard')

  return (
    <div className={`landing-scope relative ${landingFontVariables}`}>
      <GridBackground />
      <OnboardingHeader />
      <main>
        <OnboardingForm />
      </main>
    </div>
  )
}
