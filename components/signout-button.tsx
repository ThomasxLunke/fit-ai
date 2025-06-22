'use client'

import React from 'react'
import { Button } from './ui/button'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function Signoutbutton() {
  const router = useRouter()
  return (
    <Button
      variant="destructive"
      onClick={() => {
        authClient.signOut().then(() => {
          router.push('sign-in')
        })
      }}
    >
      Se déconnecter
    </Button>
  )
}
