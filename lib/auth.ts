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
        // Not `required: true`: better-auth's own parseInputData applies
        // `defaultValue` with a truthy check (`if (fields[key].defaultValue)`),
        // so a falsy default like `false` is never actually applied — the
        // field then falls through to the `required` check and throws
        // "onboarded is required" on every sign-up, since `input: false`
        // means the client can never send it either. Leaving it optional
        // here means better-auth just omits it from the create() call, and
        // Prisma's own `@default(false)` (prisma/schema.prisma) fills it in.
        required: false,
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

  if (!session) throw new Error('userId is required')

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session?.user.id,
      email: session?.user.email,
    },
    include: {
      program: {
        include: {
          trainingSessions: {
            include: {
              exercises: true,
            },
          },
        },
      },
    },
  })

  return user
}

// Non-throwing session lookup for public pages (e.g. the landing page) that
// must render for anonymous visitors instead of erroring out. Deliberately
// named differently from the `getUserBySessionAuth` helpers above — those
// both throw when there's no session, which is the wrong contract here.
export const getSessionUserOrNull = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, onboarded: true },
  })
}
