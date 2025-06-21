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
  justification: z.object({
    reason: z.string(),
    source: z.object({
      book: z.string(),
      page: z.number(),
      excerpt: z.string(),
    }),
  }),
})

const schemaTrainingSession = z.object({
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
  // console.log('context = ', context)
  const flattenedContext = context.flat() // retire le niveau inutile
  const contextText = flattenedContext.map((file) => file.text).join('\n\n')
  // console.log('contextText = ', contextText)
  // console.log(onBoarding)
  const promptTemplate = PromptTemplate.fromTemplate(`
    Tu es un coach expert en biomécanique, morphoanatomie et optimisation des leviers articulaires, t'appuyant exclusivement sur les ouvrages de référence "Méthode Delavier" de Frédéric Delavier et Michael Gundill.
    
    Voici les données morphoanatomiques de l'utilisateur :
    - Rapport buste/jambe : {torsoLegRatio}
    - Rapport épaule/coude/coude/poignet : {shoulderElbowToElbowWristRatio}
    
    Objectif de l'utilisateur : {objective} son poids.
    Jours d'entraînement disponibles : {dayAvailable}
    Nombre de séances par semaine : {sessionPerWeek}
    Préférences de l'utilisateur pour la programmation : {programPreferences}
    
    ⚠️ Tu dois absolument générer exactement {sessionPerWeek} séances distinctes (Push, Pull, Legs), chacune correspondant à un des jours disponibles ({dayAvailable}).
    ⚠️ Ne jamais générer moins ou plus de séances.
    
    Voici un contexte extrait d'ouvrages spécialisés :
    {context}
    
    Ta mission :
    1. Proposer un programme complet de {sessionPerWeek} séances par semaine en respectant les jours disponibles ({dayAvailable}).
    2. Chaque séance doit inclure :
       - Un nom clair
       - Le jour choisi (issu de {dayAvailable})
       - Une description concise
    3. Chaque exercice doit obligatoirement inclure :
       - Nom
       - Description
       - Séries
       - Répétitions
       - Poids (0 si inconnu)
       - Justification morphoanatomique issue du contexte ci-dessus uniquement
       - Source exacte : Livre, page, extrait cité
    
    ⚠️ Tu n'as pas le droit d'inventer des justifications ou des sources qui ne figurent pas dans le contexte fourni.
    ⚠️ Si aucune justification valide n'est trouvée dans le contexte, supprime cet exercice.
    
    Rappel : sois concis mais précis. Ne dépasse jamais le cadre morphoanatomique des ouvrages cités.
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
  console.log(result)
  return result
}
