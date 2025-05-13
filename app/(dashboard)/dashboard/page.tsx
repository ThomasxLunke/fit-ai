import { getUserByAuthId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function page() {
  const user = await getUserByAuthId()

  if (!user.onboarded) redirect('/onboarding')
  return (
    <div>
      <h1>Dashboard</h1>
    </div>
  )
}
