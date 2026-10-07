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

export const generateProgram = async (onBoarding: OnBoardingSchema) => {
  // Must happen before retrieveBookChunks() — its manual spans need the
  // OTel tracer provider already registered, and getLangfuseHandler()'s
  // lazy init only runs later when building the model.invoke() options,
  // which is too late for them.
  initObservability()

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

  // Fetched live from Langfuse's prompt registry (seeded by
  // scripts/push-prompt-to-langfuse.ts) instead of an inline template —
  // the prompt is production data, editable from Langfuse's UI without a
  // code deploy. No local fallback on purpose: if Langfuse is
  // unreachable this should fail loudly, not silently mask whether the
  // integration actually works.
  const langfusePrompt = await getLangfuseClient().prompt.get(
    'program-generation',
  )
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
