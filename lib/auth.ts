import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { headers } from 'next/headers'
import prisma from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  user: {
    additionalFields: {
      onboarded: {
        type: 'boolean',
        required: true,
        defaultValue: false,
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },
})

export const getUserBySessionAuth = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session?.user.id,
      email: session?.user.email,
    },
  })

  return user
}
