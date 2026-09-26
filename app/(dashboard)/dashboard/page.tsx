import { getUserBySessionAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProgramView } from '@/components/dashboard/program-view'
import { ProgramGenerationLoader } from '@/components/dashboard/program-generation-loader'
import { DevOnboardingPayloadPanel } from '@/components/dashboard/dev-onboarding-payload-panel'

export default async function page({
  searchParams,
}: {
  // Set by onboarding-form.tsx right after "Valider" — the actual payload
  // travels via sessionStorage, this param just tells us to render the
  // loader instead of redirecting to /onboarding while it's not done yet.
  searchParams: Promise<{ generating?: string }>
}) {
  const [user, { generating }] = await Promise.all([
    getUserBySessionAuth(),
    searchParams,
  ])

  // Dev-only: the header's random-onboarding button (re)generates a program
  // for whichever account is signed in, even one that's already onboarded —
  // otherwise testing a regeneration would require a fresh account every
  // time. See components/landing/dev-random-onboarding-button.tsx.
  const isDev = process.env.NODE_ENV !== 'production'

  if (generating === '1' && (isDev || !user.onboarded)) {
    return <ProgramGenerationLoader />
  }

  if (!user.onboarded) {
    redirect('/onboarding')
  }

  const program = user.program

  if (!program) {
    return (
      <div className="lg-wrap">
        <p className="text-muted-foreground">
          Aucun programme trouvé pour cet utilisateur.
        </p>
      </div>
    )
  }

  return (
    <>
      {isDev && <DevOnboardingPayloadPanel />}
      <ProgramView program={program} />
    </>
  )
}
