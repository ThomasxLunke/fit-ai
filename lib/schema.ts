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
      excerpt: z.string(),
    }),
  }),
})

export const dayOfWeek = z.enum([
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
])

export const schemaTrainingSession = z.object({
  name: z.string(),
  day: dayOfWeek,
  description: z.string(),
  exercises: z.array(schemaExercise),
})

export const schemaProgram = z.object({
  name: z.string(),
  description: z.string(),
  trainingSessions: z.array(schemaTrainingSession),
})
