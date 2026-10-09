'use server'

import { OnBoardingSchema } from '@/components/onboarding-form'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { startObservation } from '@langfuse/tracing'
import { schemaProgram } from './schema'
import {
  buildTopicQueries,
  retrieveBookChunks,
  retrieveBookChunksAgentic,
  mergeChunksWithinBudget,
  formatContextForPrompt,
  type TopicQuery,
  type RetrievedChunk,
} from './retrieval'
import {
  interpretForearmRatio,
  interpretTorsoLegRatio,
} from './morphology-interpretation'
import {
  initObservability,
  getLangfuseHandler,
  getLangfuseClient,
} from './observability'

const CONTEXT_TOKEN_BUDGET = 12000

async function recordTopicRetrievalObservations(
  topicQueries: TopicQuery[],
  byTag: Map<string, RetrievedChunk[]>,
  runId: string,
) {
  const synthesisModel = new ChatOpenAI({ model: 'gpt-4o-mini' })

  await Promise.all(
    topicQueries.map(async (query) => {
      const chunks = byTag.get(query.tag) ?? []
      const contexts = chunks.map((chunk) => chunk.content)

      const synthesis = await synthesisModel.invoke(
        [
          {
            role: 'user',
            content: `Voici des extraits récupérés pour la requête : "${query.text}"\n\n${contexts.join('\n\n')}\n\nEn 2 à 3 phrases, résume ce que ces extraits apportent concrètement pour répondre à cette requête. Ne recopie pas le texte source verbatim, reformule.`,
          },
        ],
        { callbacks: [getLangfuseHandler()] },
      )

      const span = startObservation(`topic-retrieval-${runId}`, {
        input: { question: query.text, contexts },
        metadata: { tag: query.tag, runId },
      })
      span.update({ output: { answer: synthesis.content } })
      span.end()
    }),
  )
}

interface OnboardingContext {
  topicQueries: TopicQuery[]
  forearmInterpretation: string
  torsoLegInterpretation: string
  torsoLegRatio: number
}

function buildOnboardingContext(
  onBoarding: OnBoardingSchema,
): OnboardingContext {
  const torsoLegRatio = onBoarding.torso / onBoarding.leg
  const forearmInterpretation = interpretForearmRatio(onBoarding.arm)
  const torsoLegInterpretation = interpretTorsoLegRatio(torsoLegRatio)
  const topicQueries = buildTopicQueries(
    onBoarding,
    forearmInterpretation,
    torsoLegInterpretation,
  )
  return {
    topicQueries,
    forearmInterpretation,
    torsoLegInterpretation,
    torsoLegRatio,
  }
}

async function buildAndRunGeneration(
  onBoarding: OnBoardingSchema,
  context: OnboardingContext,
  byTag: Map<string, RetrievedChunk[]>,
  runId: string,
  evalMode: boolean,
) {
  const {
    topicQueries,
    forearmInterpretation,
    torsoLegInterpretation,
    torsoLegRatio,
  } = context

  if (evalMode)
    await recordTopicRetrievalObservations(topicQueries, byTag, runId)
  const chunks = mergeChunksWithinBudget(byTag, CONTEXT_TOKEN_BUDGET)
  const contextText = formatContextForPrompt(chunks)

  const langfusePrompt =
    await getLangfuseClient().prompt.get('program-generation')
  const promptTemplate = PromptTemplate.fromTemplate(
    langfusePrompt.getLangchainPrompt(),
  )

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

  const result = await model.invoke([{ role: 'user', content: prompt }], {
    callbacks: [getLangfuseHandler()],
    tags: [onBoarding.programPreferences],
  })

  for (const session of result.trainingSessions) {
    for (const exercise of session.exercises) {
      const excerpt = exercise.justification.source.excerpt
      const match = chunks.find((chunk) => chunk.content.includes(excerpt))
      if (match) exercise.justification.source.book = match.book

      const span = startObservation(`exercise-justification-${runId}`, {
        input: {
          question: `Pourquoi l'exercice "${exercise.name}" convient-il à la morphologie de l'utilisateur pour ce groupe musculaire ?`,
          contexts: chunks.map((chunk) => chunk.content),
        },
        metadata: {
          exerciseName: exercise.name,
          sessionDay: session.day,
          runId,
        },
      })
      span.update({
        output: {
          answer: `${exercise.justification.reason} Source: ${exercise.justification.source.excerpt}`,
        },
      })
      span.end()
    }
  }

  return result
}

export const generateProgram = async (
  onBoarding: OnBoardingSchema,
  runId: string = crypto.randomUUID(),
  evalMode: boolean = false,
) => {
  initObservability()

  const context = buildOnboardingContext(onBoarding)
  const byTag = await retrieveBookChunks(context.topicQueries)
  return buildAndRunGeneration(onBoarding, context, byTag, runId, evalMode)
}

export const generateProgramAgentic = async (
  onBoarding: OnBoardingSchema,
  runId: string = crypto.randomUUID(),
  evalMode: boolean = false,
) => {
  initObservability()

  const context = buildOnboardingContext(onBoarding)
  const { byTag, topicScores } = await retrieveBookChunksAgentic(
    context.topicQueries,
  )
  const result = await buildAndRunGeneration(
    onBoarding,
    context,
    byTag,
    runId,
    evalMode,
  )
  return { ...result, topicScores }
}
