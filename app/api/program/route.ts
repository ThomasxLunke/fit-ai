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

  console.log('userId = ', userId)

  const program = await prisma.program.create({
    data: {
      name: onBoardingProg.name,
      description: onBoardingProg.description,
      userId: userId,
    },
  })

  console.log(program)

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
          sourcePage: exercise.justification.source.page,
          sourceExcerpt: exercise.justification.source.excerpt,
          trainingSessionId: createdSession.id,
        })),
      })
    })
  )

  return NextResponse.json({ program })
}
