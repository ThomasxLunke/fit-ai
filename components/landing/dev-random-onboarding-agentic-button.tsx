'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { randomOnboardingPayload } from '@/lib/dev-onboarding'
import { setOnboardingPayload } from '@/lib/onboarding-storage'

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
