import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const GET = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session?.user.id,
      email: session?.user.email,
    },
  })

  return NextResponse.json({ user })
}
