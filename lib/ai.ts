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

interface VectorStoreFile {
  id: string
  content: string
}

export const queryVectorStore = async () => {
  const files: VectorStoreFile[] = []

  const res = await fetch(
    `https://api.openai.com/v1/vector_stores/${process.env.VECTOR_STORE_ID}/files`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const resJson = await res.json()

  if (resJson.data) {
    await Promise.all(
      resJson.data.map(async (file: VectorStoreFile) => {
        const res = await fetch(
          `https://api.openai.com/v1/vector_stores/${process.env.VECTOR_STORE_ID}/files/${file.id}/content`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        )
        const json = await res.json()
        files.push(json.data)
      })
    )
  }

  console.log('files = ', files)
  return files
}

export const generateProgram = async (onBoarding: OnBoardingSchema) => {
  // const context = await queryVectorStore()
  // console.log('context = ', context)

  const promptTemplate = PromptTemplate.fromTemplate(
    `
Tu es un coach expert en biomécanique, morphoanatomie et optimisation des leviers articulaires.

Voici les données morphoanatomiques de l'utilisateur :
- Longueur buste : {torsoLength}
- Longueur jambe : {legLength}
- Rapport fémur/tibia : {femurToTibia}
- Rapport humérus/radius : {humerusToRadius}

Objectif de l'utilisateur : {objective} son poids.

Jours d'entraînement disponibles : {dayAvailable}
Nombre de séances par semaine : {sessionPerWeek}

Préférences de l'utilisateur pour la programmation : {programPreferences}

Voici un contexte extrait d'ouvrages spécialisés :
{context}

N'utilise aucun exercice qui ne conviendrait pas à la morphologie indiquée. Sois concis mais exhaustif dans les descriptions des mouvements. Respecte strictement le nombre de séances par semaine indiqué. Afin de justifier les choix d'exercices choisis, appuie toi sur le contexte extrait d'ouvrages spécialisés, et fournis des explications sur les raisons de ces choix dans la description de l'exercice.
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
    context: '',
  })

  const model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  }).withStructuredOutput(schemaProgram)

  const result = await model.invoke([{ role: 'user', content: prompt }])
  console.log(result)
  return result
}
