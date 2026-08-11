'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
        // Not authClient.signOut(): better-auth's client sends this POST
        // with an empty-string body while still setting
        // Content-Type: application/json. better-call's server-side
        // getBody() only skips JSON parsing when request.body is null —
        // an empty-but-present stream still reaches `await request.json()`,
        // which throws "Unexpected end of JSON input" and 500s, so the
        // session cookie never actually gets cleared. A real (even empty)
        // JSON body sidesteps the bug entirely.
        await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        router.push('/')
        router.refresh()
      }}
    >
      Se déconnecter
    </button>
  )
}
