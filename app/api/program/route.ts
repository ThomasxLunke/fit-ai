import prisma from '@/lib/db'
import { schemaProgram } from '@/lib/schema'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const POST = async (req: Request) => {
  const {
    onBoardingProg,
    userId,
  }: { onBoardingProg: z.infer<typeof schemaProgram>; userId: string } =
    await req.json()

  // Program.userId is unique (one program per user) — deleting any existing
  // one first (cascades to its trainingSessions/exercises) makes this
  // endpoint safe to call again for a user who already has a program,
  // instead of failing on the unique constraint.
  await prisma.program.deleteMany({ where: { userId } })

  const program = await prisma.program.create({
    data: {
      name: onBoardingProg.name,
      description: onBoardingProg.description,
      userId: userId,
    },
  })

  await Promise.all(
    onBoardingProg.trainingSessions.map(async (session) => {
      const createdSession = await prisma.trainingSession.create({
        data: {
          name: session.name,
          description: session.description,
          day: session.day,
          programId: program.id,
        },
      })

      await prisma.exercise.createMany({
        data: session.exercises.map((exercise) => ({
          name: exercise.name,
          description: exercise.description,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          reason: exercise.justification.reason,
          sourceBook: exercise.justification.source.book,
          sourceExcerpt: exercise.justification.source.excerpt,
          trainingSessionId: createdSession.id,
        })),
      })
    })
  )

  return NextResponse.json({ program })
}
