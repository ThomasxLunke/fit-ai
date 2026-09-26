'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { randomOnboardingPayload } from '@/lib/dev-onboarding'
import { setOnboardingPayload } from '@/lib/onboarding-storage'

// Dev-only shortcut: skips the onboarding wizard (random values instead of
// filling it by hand, including the camera-measurement steps) and jumps
// straight to /dashboard's generation loader, reusing whichever account is
// currently signed in — no need to create a fresh account for every test run.
export function DevRandomOnboardingButton({
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
        router.push('/dashboard?generating=1')
      }}
    >
      🧪 Dev — programme aléatoire
    </button>
  )
}
