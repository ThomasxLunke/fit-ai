import OnboardingForm from '@/components/onboarding-form'
import React from 'react'
import { getUserBySessionAuth } from '../actions'
import { redirect } from 'next/navigation'

export default async function page() {
  const user = await getUserBySessionAuth()

  if (user.onboarded) redirect('/dashboard')
  return (
    <div className="h-full w-full">
      <OnboardingForm />
    </div>
  )
}
