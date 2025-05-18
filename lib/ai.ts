'use server'

import { OnBoardingSchema } from '@/components/onboarding-form'
import { z } from 'zod'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import fetch from 'node-fetch'

const schemaExercise = z.object({
  name: z.string(),
  description: z.string(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number(),
})

const schemaTrainingSession = z.object({
  name: z.string(),
  day: z.string(),
  description: z.string(),
  exercises: z.array(schemaExercise),
})

const schemaProgram = z.object({
  name: z.string(),
  description: z.string(),
  trainingSessions: z.array(schemaTrainingSession),
})

const queryVectorStore = async () => {
  const res = await fetch(
    `https://api.openai.com/v1/vector_stores/${process.env.VECTOR_STORE_ID}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const json = await res.json()
  const texts = json?.data?.map((d: any) => d.document.text) ?? []
  return texts.join('\n\n')
}

export const generateProgram = async (onBoarding: OnBoardingSchema) => {
  const context = await queryVectorStore()

  const promptTemplate = PromptTemplate.fromTemplate(
    `
Tu es un coach expert en biomécanique, morphoanatomie et optimisation des leviers articulaires.

Voici les données morphoanatomiques de l'utilisateur :
- Longueur buste : {torsoLength}
- Longueur jambe : {legLength}
- Rapport fémur/tibia : {femurToTibia}
- Rapport humérus/radius : {humerusToRadius}
- Autres particularités morphologiques : {otherMorphoDetails}

Objectif de l'utilisateur : {objective} son poids.

Jours d'entraînement disponibles : {dayAvailable}
Nombre de séances par semaine : {sessionPerWeek}

Préférences de l'utilisateur pour la programmation : {programPreferences}

Voici un contexte extrait d’ouvrages spécialisés :
{context}

Respecte strictement le schéma suivant :
→ programme {{ name, description, trainingSessions: [ {{ name, description, day, exercises: [ {{ name, description, sets, reps, weight }} ] }} ] }}

N'utilise aucun exercice qui ne conviendrait pas à la morphologie indiquée. Sois concis mais exhaustif dans les descriptions des mouvements.
  `
  )

  const prompt = await promptTemplate.format({
    sessionPerWeek: onBoarding.sessionPerWeek,
    dayAvailable: onBoarding.dayAvailable,
    objective: onBoarding.objective,
    programPreferences: onBoarding.programPreferences,
    torsoLength: 55, // en cm, buste court
    legLength: 90, // en cm, jambes longues
    femurToTibia: 1.3, // fémur plus long que tibia
    humerusToRadius: 1.2, // humérus légèrement plus long que radius
    otherMorphoDetails:
      'Épaules larges, cage thoracique étroite, avant-bras courts',
    context,
  })

  const model = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
  }).withStructuredOutput(schemaProgram)

  const result = await model.invoke([{ role: 'user', content: prompt }])
  console.log(result)
  return result
}
