import { getUserBySessionAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProgramView } from '@/components/dashboard/program-view'
import { ProgramGenerationLoader } from '@/components/dashboard/program-generation-loader'
import { DevOnboardingPayloadPanel } from '@/components/dashboard/dev-onboarding-payload-panel'

export default async function page({
  searchParams,
}: {
  searchParams: Promise<{ generating?: string; mode?: string }>
}) {
  const [user, { generating, mode }] = await Promise.all([
    getUserBySessionAuth(),
    searchParams,
  ])

  const isDev = process.env.NODE_ENV !== 'production'

  if (generating === '1' && (isDev || !user.onboarded)) {
    return <ProgramGenerationLoader agentic={mode === 'agentic'} />
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
