import { z } from 'zod'

export const schemaExercise = z.object({
  name: z.string(),
  description: z.string(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number(),
  justification: z.object({
    reason: z.string(),
    source: z.object({
      book: z.string(),
      page: z.number(),
      excerpt: z.string(),
    }),
  }),
})

export const schemaTrainingSession = z.object({
  name: z.string(),
  day: z.string(),
  description: z.string(),
  exercises: z.array(schemaExercise),
})

export const schemaProgram = z.object({
  name: z.string(),
  description: z.string(),
  trainingSessions: z.array(schemaTrainingSession),
})
