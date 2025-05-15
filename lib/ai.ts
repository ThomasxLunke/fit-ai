'use server'

import { OnBoardingSchema } from '@/components/onboarding-form'
import { z } from 'zod'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'

const schemaExercise = z.object({
  name: z.string(),
  description: z.string(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number(),
})

const schemaProgram = z.object({
  name: z.string(),
  description: z.string(),
  exercises: z.array(schemaExercise),
})

export const generateProgram = async (onBoarding: OnBoardingSchema) => {
  const promptTemplate = PromptTemplate.fromTemplate(
    "You are a personal trainer. You are given a user's onboarding data. You need to generate a program for the user.The program should be based on the user's onBoarding data.The program should be a 4 week program.Tu dois générer un programme qui est adapté à l'utilisateur.Le nombre de séance que peut faire cet utilisateur est de {sessionPerWeek} par semaine.Les jours ou il est disponible sont {dayAvailable}.L'objectif de l'utilisateur est de {objective} son poids.Les préférences de programmation de l'utilisateur sont {programPreferences}.Tu dois strictement respecter le nombre de séance par semaine et les jours ou l'utilisateur est disponible."
  )

  const prompt = await promptTemplate.format({
    sessionPerWeek: onBoarding.sessionPerWeek,
    dayAvailable: onBoarding.dayAvailable,
    objective: onBoarding.objective,
    programPreferences: onBoarding.programPreferences,
  })

  const model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  })

  const formatInstructionsLlm = model.withStructuredOutput(schemaProgram)

  const result = await formatInstructionsLlm.invoke(prompt)

  console.log(result)
}
