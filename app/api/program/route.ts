import { schemaProgram } from '@/lib/ai'
import prisma from '@/lib/db'
import { z } from 'zod'

export const POST = async (req: Request) => {
  const {
    onBoardingProg,
    userId,
  }: { onBoardingProg: z.infer<typeof schemaProgram>; userId: string } =
    await req.json()

  const program = await prisma.program.create({
    data: {
      name: onBoardingProg.name,
      description: onBoardingProg.description,
      userId: userId,
      // trainingSessions
    },
  })
}
