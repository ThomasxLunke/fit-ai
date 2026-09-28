'use server'

import { OnBoardingSchema } from '@/components/onboarding-form'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { schemaProgram } from './schema'
import {
  buildTopicQueries,
  retrieveBookChunks,
  mergeChunksWithinBudget,
  formatContextForPrompt,
} from './retrieval'

const CONTEXT_TOKEN_BUDGET = 12000

// onBoarding.arm = (bras/avant-bras) mesuré en step 4 de l'onboarding
// (firstDistance épaule-coude / secondDistance coude-poignet — voir
// onboarding-form.tsx). >1 = bras plus long que l'avant-bras, <1 = l'inverse.
// Graduée délibérément plutôt qu'une large bande "proportionné" unique :
// même un écart de 5-10% change mesurablement le bras de levier dans un
// mouvement, donc regrouper tout ce qui est proche de 1.0 sous "équilibré"
// jetterait un vrai signal exploitable — seul un écart réellement
// négligeable (~3%) est qualifié de "quasiment identique". Les seuils
// restent des heuristiques, pas des normes anthropométriques validées :
// le but est une lecture directionnelle cohérente d'un utilisateur à
// l'autre, pas une prétention à la précision.
export const interpretForearmRatio = (ratio: number) => {
  if (ratio > 1.1) return 'avant-bras nettement plus court que le bras'
  if (ratio > 1.03) return 'avant-bras légèrement plus court que le bras'
  if (ratio < 0.9) return 'avant-bras nettement plus long que le bras'
  if (ratio < 0.97) return 'avant-bras légèrement plus long que le bras'
  return 'bras et avant-bras de longueur quasiment identique'
}

export const interpretTorsoLegRatio = (ratio: number) => {
  if (ratio > 0.57) return 'buste nettement plus long par rapport aux jambes'
  if (ratio > 0.515)
    return 'buste légèrement plus long par rapport aux jambes'
  if (ratio < 0.43)
    return 'jambes nettement plus longues par rapport au buste'
  if (ratio < 0.485)
    return 'jambes légèrement plus longues par rapport au buste'
  return 'buste et jambes de longueur quasiment identique'
}

export const generateProgram = async (onBoarding: OnBoardingSchema) => {
  const torsoLegRatio = onBoarding.torso / onBoarding.leg
  const forearmInterpretation = interpretForearmRatio(onBoarding.arm)
  const torsoLegInterpretation = interpretTorsoLegRatio(torsoLegRatio)

  const topicQueries = buildTopicQueries(
    onBoarding,
    forearmInterpretation,
    torsoLegInterpretation,
  )
  const byTag = await retrieveBookChunks(topicQueries)
  const chunks = mergeChunksWithinBudget(byTag, CONTEXT_TOKEN_BUDGET)
  const contextText = formatContextForPrompt(chunks)

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
2. Le contexte ci-dessous étiquette chaque extrait par groupe musculaire et par type : "description exercice" ou "morphologie/blessure". Pour chaque exercice, s'il existe dans le contexte un extrait "morphologie/blessure" du MÊME groupe musculaire, tu DOIS baser "justification.reason" et "source.excerpt" sur CET extrait (pas sur l'extrait "description exercice") : reformule concrètement le fait qu'il rapporte (longueur de membre, angle articulaire, proportion, risque de blessure précis) et relie-le explicitement à l'interprétation morphologique de l'utilisateur donnée plus haut. N'utilise un extrait "description exercice" comme source que si aucun extrait "morphologie/blessure" pertinent n'existe pour ce groupe musculaire dans le contexte. Interdiction absolue des formules creuses et interchangeables d'un utilisateur à l'autre ("adapté à la morphologie de l'utilisateur", "important/crucial/essentiel pour l'utilisateur", "morphologie proportionnée" utilisé seul sans mécanisme concret) : chaque "reason" doit rester incompréhensible si on la copie-colle sur un autre utilisateur avec une morphologie différente. N'utilise aucun exercice qui ne conviendrait pas à la morphologie indiquée.
3. La répartition des séances et le choix des exercices par séance doivent respecter les préférences de programmation, le nombre de séances et les jours disponibles, tout en restant cohérents avec la morphologie.
4. Chaque séance doit compter entre 4 et 6 exercices : vise plutôt 6 pour une séance "full-body" ou "half-body" qui couvre plusieurs groupes musculaires à la fois, plutôt 4 pour une séance ciblée (split, PPL) centrée sur un ou deux groupes. N'invente jamais un exercice non justifiable par le contexte ci-dessus uniquement pour atteindre ce nombre — s'il n'y a pas assez de matière pertinente dans le contexte pour un groupe musculaire donné, reste en dessous de la fourchette plutôt que d'inventer.
5. Si le contexte fourni contient des exemples de séances ou de semaines-type, appuie-toi sur leur format (nombre d'exercices par séance, fréquence hebdomadaire d'un même groupe musculaire) comme référence de structure — sans copier des exercices inadaptés à la morphologie de l'utilisateur.
6. Pour "justification.source.book", indique exactement l'un des noms de livre apparaissant dans un en-tête "[Source : ...]" du contexte ci-dessus. Pour "source.excerpt", cite un court passage du chunk correspondant.

Respecte strictement le schéma suivant :
→ programme {{ name, description, trainingSessions: [ {{ name, description, day, exercises: [ {{ name, description, sets, reps, weight, justification: {{ reason, source: {{ book, excerpt }} }} }} ] }} ] }}

Sois concis mais exhaustif dans les descriptions des mouvements.
  `)

  const prompt = await promptTemplate.format({
    sessionPerWeek: onBoarding.sessionPerWeek,
    dayAvailable: onBoarding.dayAvailable,
    objective: onBoarding.objective,
    programPreferences: onBoarding.programPreferences,
    shoulderElbowToElbowWristRatio: onBoarding.arm,
    torsoLegRatio,
    forearmInterpretation,
    torsoLegInterpretation,
    context: contextText,
  })

  const model = new ChatOpenAI({
    model: 'gpt-6-sol',
  }).withStructuredOutput(schemaProgram)

  const result = await model.invoke([{ role: 'user', content: prompt }])

  // The model sometimes quotes a real retrieved excerpt correctly but
  // attributes it to the wrong book (observed: an excerpt verbatim from
  // "Blessures en musculation et sports de force" labeled as coming from
  // "Guide des mouvements de musculation"). Since every excerpt it can
  // legitimately quote came from one of the chunks we actually retrieved,
  // book attribution doesn't need to rely on the model self-reporting it
  // correctly — look up which retrieved chunk the excerpt came from and
  // overwrite `source.book` with the real one. Left as-is (best-effort
  // LLM self-report) only if the excerpt doesn't match any retrieved
  // chunk (e.g. a paraphrase rather than a verbatim quote).
  for (const session of result.trainingSessions) {
    for (const exercise of session.exercises) {
      const excerpt = exercise.justification.source.excerpt
      const match = chunks.find((chunk) => chunk.content.includes(excerpt))
      if (match) exercise.justification.source.book = match.book
    }
  }

  return result
}
