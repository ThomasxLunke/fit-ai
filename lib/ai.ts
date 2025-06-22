'use server'

import { OnBoardingSchema } from '@/components/onboarding-form'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import fetch from 'node-fetch'
import { schemaProgram } from './schema'

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
  return files
}

export const generateProgram = async (onBoarding: OnBoardingSchema) => {
  const context = await queryVectorStore()
  const flattenedContext = context.flat() // retire le niveau inutile
  const contextText = flattenedContext.map((file) => file.text).join('\n\n')
  const promptTemplate = PromptTemplate.fromTemplate(`
Tu es un coach expert en biomécanique, morphoanatomie et optimisation des leviers articulaires.
Add commentMore actions
Voici les données morphoanatomiques de l'utilisateur :
- Rapport de longueur buste/jambe : {torsoLegRatio}
- Rapport de longueur epaule/coude et coude/poignet : {shoulderElbowToElbowWristRatio}

Objectif de l'utilisateur : {objective} son poids.

Jours d'entraînement disponibles : {dayAvailable}
Nombre de séances par semaine : {sessionPerWeek}

Préférences de l'utilisateur pour la programmation : {programPreferences}

Voici un contexte extrait d’ouvrages spécialisés :
{context}

Respecte strictement le schéma suivant :
→ programme {{ name, description, trainingSessions: [ {{ name, description, day, exercises: [ {{ name, description, sets, reps, weight }} ] }} ] }}

N'utilise aucun exercice qui ne conviendrait pas à la morphologie indiquée. Sois concis mais exhaustif dans les descriptions des mouvements.
  `)

  const prompt = await promptTemplate.format({
    sessionPerWeek: onBoarding.sessionPerWeek,
    dayAvailable: onBoarding.dayAvailable,
    objective: onBoarding.objective,
    programPreferences: onBoarding.programPreferences,
    shoulderElbowToElbowWristRatio: onBoarding.arm,
    torsoLegRatio: onBoarding.torso / onBoarding.leg,
    context: contextText,
  })

  const model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  }).withStructuredOutput(schemaProgram)

  const result = await model.invoke([{ role: 'user', content: prompt }])
  return result
}
