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

// Constrained (not a free-form string) so the dashboard's weekly view can
// reliably place each session on a real day — this is enforced at the LLM
// call site via withStructuredOutput's function-calling schema, not just a
// prompt hint.
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
