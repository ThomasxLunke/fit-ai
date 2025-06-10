'use server'

import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { headers } from 'next/headers'

export const getUserBySessionAuth = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  console.log('session = ', session)

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session?.user.id,
      email: session?.user.email,
    },
  })

  return user
}
