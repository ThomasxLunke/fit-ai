'use server'

import { OnBoardingSchema } from '@/components/onboarding-form'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import fetch from 'node-fetch'
import { schemaProgram } from './schema'

interface VectorStoreFileEntry {
  id: string
  status: string
}

// The actual shape returned by OpenAI's "retrieve vector store file content"
// endpoint: `data` is an array of content parts, not a single {id, content}
// file — queryVectorStore pushes one such array per file, which is exactly
// why generateProgram calls `.flat()` on the result afterwards.
interface VectorStoreFileContentPart {
  type: string
  text: string
}

export const queryVectorStore = async () => {
  const files: VectorStoreFileContentPart[][] = []

  const res = await fetch(
    `https://api.openai.com/v1/vector_stores/${process.env.VECTOR_STORE_ID}/files`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const resJson = await res.json()

  if (resJson.data) {
    await Promise.all(
      resJson.data
        // A vector store can end up with lingering non-"completed" entries
        // (a failed OCR/parse attempt, or — observed in practice — OpenAI
        // sometimes not actually dropping a "failed" entry from this list
        // even after it's been detached) that have no content to fetch.
        // Skipping them here, rather than trusting every listed file to
        // have real content, is what keeps a stray one of those from
        // crashing generateProgram() on `undefined.text` downstream.
        .filter((file: VectorStoreFileEntry) => file.status === 'completed')
        .map(async (file: VectorStoreFileEntry) => {
          const res = await fetch(
            `https://api.openai.com/v1/vector_stores/${process.env.VECTOR_STORE_ID}/files/${file.id}/content`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
            },
          )
          const json = await res.json()
          if (Array.isArray(json.data)) files.push(json.data)
        }),
    )
  }
  return files
}

// Cleaning the OCR'd book excerpts (stripping figure legends, OCR garbage,
// watermarks) used to happen here, on every single generateProgram call —
// i.e. once per user, redundantly, on the exact same book text every time.
// That pass now runs once, offline, against the vector store itself (see
// scripts/export-vector-store-content.ts and lib/context-cleanup.ts) — the
// store is expected to already contain clean text, so this just uses it
// as-is.

// onBoarding.arm = (bras/avant-bras) mesuré en step 4 de l'onboarding
// (firstDistance épaule-coude / secondDistance coude-poignet — voir
// onboarding-form.tsx). >1 = bras plus long que l'avant-bras, <1 = l'inverse.
// La bande neutre (0.9-1.1) et le seuil du ratio buste/jambe (baseline 0.5,
// tirée de fillFakeMeasurement()'s arm≈0.95/leg≈300/torso≈150 dans
// onboarding-form.tsx — la seule approximation de mesures réalistes dont on
// dispose) sont des heuristiques, pas des normes anthropométriques validées :
// le but est juste de donner au modèle une lecture "long/court/proportionné"
// cohérente d'un utilisateur à l'autre plutôt que de le laisser interpréter
// un ratio brut sans repère.
const interpretForearmRatio = (ratio: number) => {
  if (ratio > 1.1) return 'avant-bras nettement plus court que le bras'
  if (ratio < 0.9) return 'avant-bras nettement plus long que le bras'
  return 'bras et avant-bras de longueur proportionnée'
}

const interpretTorsoLegRatio = (ratio: number) => {
  if (ratio > 0.57)
    return 'buste proportionnellement long par rapport aux jambes'
  if (ratio < 0.43)
    return 'jambes proportionnellement longues par rapport au buste'
  return 'buste et jambes de longueur proportionnée'
}

export const generateProgram = async (onBoarding: OnBoardingSchema) => {
  const context = await queryVectorStore()
  const flattenedContext = context.flat() // retire le niveau inutile
  const contextText = flattenedContext.map((file) => file.text).join('\n\n')

  const torsoLegRatio = onBoarding.torso / onBoarding.leg

  const promptTemplate = PromptTemplate.fromTemplate(`
Tu es un coach expert en biomécanique, morphoanatomie et optimisation des leviers articulaires.

Voici l'interprétation des données morphoanatomiques de l'utilisateur (mesures caméra, à traiter comme une indication directionnelle) :
- Avant-bras vs bras : {forearmInterpretation} (ratio bras/avant-bras mesuré : {shoulderElbowToElbowWristRatio})
- Buste vs jambes : {torsoLegInterpretation} (ratio buste/jambes mesuré : {torsoLegRatio})

Objectif de l'utilisateur : {objective} son poids.

Jours d'entraînement disponibles : {dayAvailable}
Nombre de séances par semaine : {sessionPerWeek}

Préférences de l'utilisateur pour la programmation : {programPreferences}

Voici un contexte extrait d’ouvrages spécialisés :
{context}

Consignes impératives :
1. Le champ "description" du programme doit commencer par une ou deux phrases en langage clair (pas les ratios bruts) qui expliquent à l'utilisateur ces deux interprétations morphologiques et ce qu'elles impliquent pour son entraînement.
2. Pour chaque exercice, "justification.reason" doit expliquer concrètement en quoi ce mouvement convient à CETTE morphologie précise (avant-bras/bras, buste/jambes) — pas une justification générique interchangeable d'un utilisateur à l'autre. N'utilise aucun exercice qui ne conviendrait pas à la morphologie indiquée.
3. La répartition des séances et le choix des exercices par séance doivent respecter les préférences de programmation, le nombre de séances et les jours disponibles, tout en restant cohérents avec la morphologie.
4. Si le contexte fourni contient des exemples de séances ou de semaines-type, appuie-toi sur leur format (nombre d'exercices par séance, fréquence hebdomadaire d'un même groupe musculaire) comme référence de structure — sans copier des exercices inadaptés à la morphologie de l'utilisateur.

Respecte strictement le schéma suivant :
→ programme {{ name, description, trainingSessions: [ {{ name, description, day, exercises: [ {{ name, description, sets, reps, weight, justification: {{ reason, source: {{ book, page, excerpt }} }} }} ] }} ] }}

Sois concis mais exhaustif dans les descriptions des mouvements.
  `)

  const prompt = await promptTemplate.format({
    sessionPerWeek: onBoarding.sessionPerWeek,
    dayAvailable: onBoarding.dayAvailable,
    objective: onBoarding.objective,
    programPreferences: onBoarding.programPreferences,
    shoulderElbowToElbowWristRatio: onBoarding.arm,
    torsoLegRatio,
    forearmInterpretation: interpretForearmRatio(onBoarding.arm),
    torsoLegInterpretation: interpretTorsoLegRatio(torsoLegRatio),
    context: contextText,
  })

  const model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  }).withStructuredOutput(schemaProgram)

  const result = await model.invoke([{ role: 'user', content: prompt }])
  return result
}
