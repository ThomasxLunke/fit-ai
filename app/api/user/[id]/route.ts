import prisma from '@/lib/db'
import { NextResponse } from 'next/server'

export const PATCH = async (req: Request) => {
  const { userData } = await req.json()

  const user = await prisma.user.update({
    where: { id: userData.id },
    data: userData,
  })

  return NextResponse.json({ user })
}
