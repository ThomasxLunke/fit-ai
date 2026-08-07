import { getUserBySessionAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProgramView } from '@/components/dashboard/program-view'
import { ProgramGenerationLoader } from '@/components/dashboard/program-generation-loader'

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

  if (!user.onboarded) {
    if (generating === '1') return <ProgramGenerationLoader />
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

  return <ProgramView program={program} />
}
