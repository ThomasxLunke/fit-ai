'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <button
      type="button"
      className="lg-btn lg-btn-ghost"
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true)
        await authClient.signOut()
        router.push('/')
        router.refresh()
      }}
    >
      Se déconnecter
    </button>
  )
}
