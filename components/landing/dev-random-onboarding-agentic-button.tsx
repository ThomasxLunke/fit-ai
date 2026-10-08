'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { randomOnboardingPayload } from '@/lib/dev-onboarding'
import { setOnboardingPayload } from '@/lib/onboarding-storage'

// Sibling of DevRandomOnboardingButton — same dev-only shortcut, but routes
// through generateProgramAgentic() (lib/ai.ts's judge-and-retry retrieval
// loop) instead of the classic generateProgram(), via the `mode=agentic`
// param app/(dashboard)/dashboard/page.tsx reads to choose which loader to
// render.
export function DevRandomOnboardingAgenticButton({
  isLoggedIn,
}: {
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (process.env.NODE_ENV === 'production' || !isLoggedIn) return null

  return (
    <button
      type="button"
      className="lg-btn lg-btn-ghost"
      disabled={isLoading}
      onClick={() => {
        setIsLoading(true)
        setOnboardingPayload(randomOnboardingPayload())
        router.push('/dashboard?generating=1&mode=agentic')
      }}
    >
      🧪 Agentique RAG
    </button>
  )
}
