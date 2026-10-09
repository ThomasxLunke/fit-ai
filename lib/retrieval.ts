import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { startActiveObservation } from '@langfuse/tracing'
import { z } from 'zod'
import type { OnBoardingSchema } from '@/components/onboarding-form'
import vectorDb from './vector-db'
import { getLangfuseHandler } from './observability'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const JUDGE_MODEL = 'gpt-4o-mini'

// Below this, a tag's retrieval is judged insufficient — see
// judgeTopicSufficiency() and retrieveBookChunksAgentic().
const SUFFICIENCY_THRESHOLD = 0.6

export interface RetrievedChunk {
  id: number
  book: string
  chunkIndex: number
  content: string
  tokens: number
  distance: number
  tag: string
}

export interface TopicQuery {
  tag: string
  text: string
  k: number
}

interface RawRow {
  id: number
  book: string
  chunkIndex: number
  content: string
  tokens: number
  distance: number
}

// Local copy of components/onboarding-form.tsx's `programs` labels: that
// file is a 'use client' component and can't be imported from here.
const PROGRAM_PREFERENCE_LABELS: Record<
  OnBoardingSchema['programPreferences'],
  string
> = {
  'push-pull-legs': 'Push/Pull/Legs',
  'half-body': 'Half Body',
  'full-body': 'Full Body',
  split: 'Split',
  none: 'Aucune préférence',
}

export function buildTopicQueries(
  onBoarding: OnBoardingSchema,
  forearmInterpretation: string,
  torsoLegInterpretation: string,
): TopicQuery[] {
  const programLabel = PROGRAM_PREFERENCE_LABELS[onBoarding.programPreferences]
  const structureText =
    onBoarding.programPreferences === 'none'
      ? `fréquence d'entraînement et structure de programme pour ${onBoarding.sessionPerWeek} séances par semaine`
      : `fréquence d'entraînement et structure de programme pour ${onBoarding.sessionPerWeek} séances par semaine en ${programLabel}`

  return [
    {
      tag: 'pectoraux',
      text: 'exercices pour les pectoraux (développé, écarté, poussée horizontale)',
      k: 6,
    },
    {
      tag: 'pectoraux-morphologie',
      text: "influence de la longueur des bras et de la largeur des épaules sur le choix des exercices de pectoraux, risques de blessure à l'épaule",
      k: 4,
    },
    {
      tag: 'dos-grand_ronds-infra_épineux-petit_rond-rhomboïde-trapèzes',
      text: 'exercices pour le dos (dorsaux, grand ronds,infra épineux, petit rond, rhomboïde, trapèzes)',
      k: 6,
    },
    {
      tag: 'dos-grand_ronds-infra_épineux-petit_rond-rhomboïde-trapèzes-morphologie',
      text: `influence de la longueur des membres et des proportions osseuses sur le choix des exercices de dos (dorsaux, grand ronds,infra épineux, petit rond, rhomboïde, trapèzes), risques de blessure (${torsoLegInterpretation})`,
      k: 4,
    },
    {
      tag: 'jambes-quadriceps-ischio-jambiers-mollet-fessier',
      text: 'exercices pour les jambes (quadriceps, ischio-jambiers, fessiers, mollets)',
      k: 6,
    },
    {
      tag: 'jambes-quadriceps-ischio-jambiers-mollet-fessier-morphologie',
      text: `influence de la longueur du fémur et des proportions des jambes sur le choix des exercices de jambes (squat, presse), risques de blessure au genou (quadriceps, ischio-jambiers, fessiers, mollets)(${torsoLegInterpretation})`,
      k: 4,
    },
    {
      tag: 'epaules-deltoïdes',
      text: 'exercices pour les épaules ou deltoïdes (développé militaire, élévations)',
      k: 6,
    },
    {
      tag: 'epaules-deltoïdes-morphologie',
      text: "influence de la morphologie de l'épaule/deltoïdes (largeur, mobilité articulaire) sur le choix des exercices d'épaules, risques de blessure",
      k: 4,
    },
    {
      tag: 'bras',
      text: 'exercices pour les bras (biceps, triceps, avant-bras)',
      k: 6,
    },
    {
      tag: 'bras-morphologie',
      text: `influence de la morphologie osseuse du coude et de la longueur de l'avant-bras sur le choix des exercices de bras (curl, extension), risques de blessure (${forearmInterpretation})`,
      k: 4,
    },
    {
      tag: 'abdominaux',
      text: 'exercices pour les abdominaux et le gainage',
      k: 6,
    },
    {
      tag: 'abdominaux-morphologie',
      text: 'influence de la morphologie du buste et du bassin sur le choix des exercices abdominaux, risques de blessure lombaire',
      k: 4,
    },
    {
      tag: 'structure',
      text: structureText,
      k: 4,
    },
  ]
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`
}

async function searchTags(
  queries: TopicQuery[],
): Promise<Map<string, RetrievedChunk[]>> {
  const vectors = await startActiveObservation(
    'embed-topic-queries',
    async (embedding) => {
      embedding.update({
        model: EMBEDDING_MODEL,
        input: queries.map((q) => q.text),
      })
      const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL })
      const result = await embeddings.embedDocuments(queries.map((q) => q.text))
      embedding.update({
        output: { count: result.length, dimensions: result[0]?.length },
      })
      return result
    },
    { asType: 'embedding' },
  )

  const results = await Promise.all(
    queries.map(async (query, i) => {
      const vectorLiteral = toVectorLiteral(vectors[i])
      const rows = await vectorDb.$queryRaw<RawRow[]>`
        SELECT id, book, "chunkIndex", content, tokens,
               embedding <=> ${vectorLiteral}::vector AS distance
        FROM "BookChunk"
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${query.k}
      `
      const chunks: RetrievedChunk[] = rows.map((row) => ({
        ...row,
        tag: query.tag,
      }))
      return [query.tag, chunks] as const
    }),
  )

  return new Map(results)
}

export async function retrieveBookChunks(
  queries: TopicQuery[],
): Promise<Map<string, RetrievedChunk[]>> {
  return startActiveObservation(
    'retrieve-book-chunks',
    async (retriever) => {
      retriever.update({ input: { tags: queries.map((q) => q.tag) } })
      const byTag = await searchTags(queries)
      retriever.update({
        output: {
          totalChunks: Array.from(byTag.values()),
        },
      })
      return byTag
    },
    { asType: 'retriever' },
  )
}

async function judgeTopicSufficiency(
  query: TopicQuery,
  chunks: RetrievedChunk[],
): Promise<{ score: number; reason: string; rewrittenQuery: string | null }> {
  const judgeSchema = z.object({
    score: z.number().min(0).max(1),
    reason: z.string(),
    rewrittenQuery: z.string().nullable(),
  })
  const judge = new ChatOpenAI({ model: JUDGE_MODEL }).withStructuredOutput(
    judgeSchema,
  )

  return judge.invoke(
    [
      {
        role: 'user',
        content: `Requête de retrieval : "${query.text}"\n\nExtraits retrouvés :\n${chunks.map((c) => c.content).join('\n\n')}\n\nNote de 0 à 1 à quel point ces extraits contiennent de la matière concrète (longueur de membre, angle articulaire, proportion, risque de blessure précis) suffisante pour écrire une justification spécifique et non générique en lien avec cette requête — une justification qui resterait incompréhensible si on la copiait-collait sur une autre requête. Si la note est inférieure à ${SUFFICIENCY_THRESHOLD}, propose aussi une reformulation de cette requête qui pourrait trouver de meilleurs extraits (sinon, rewrittenQuery doit être null).`,
      },
    ],
    { callbacks: [getLangfuseHandler()] },
  )
}

function mergeTourResults(
  previous: RetrievedChunk[],
  found: RetrievedChunk[],
  k: number,
): RetrievedChunk[] {
  const byId = new Map<number, RetrievedChunk>()
  for (const chunk of [...previous, ...found]) {
    const existing = byId.get(chunk.id)
    if (!existing || chunk.distance < existing.distance) {
      byId.set(chunk.id, chunk)
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k)
}

export interface TopicScore {
  tag: string
  score: number
  tours: number
  reason: string
}

export async function retrieveBookChunksAgentic(
  queries: TopicQuery[],
): Promise<{
  byTag: Map<string, RetrievedChunk[]>
  topicScores: TopicScore[]
}> {
  return startActiveObservation(
    'retrieve-book-chunks-agentic',
    async (retriever) => {
      retriever.update({ input: { tags: queries.map((q) => q.tag) } })

      const byTag = await searchTags(queries)
      const verdicts = new Map(
        await Promise.all(
          queries.map(
            async (query) =>
              [
                query.tag,
                await judgeTopicSufficiency(query, byTag.get(query.tag) ?? []),
              ] as const,
          ),
        ),
      )
      const tours = new Map(queries.map((query) => [query.tag, 1]))

      const needsSecondTour = queries.filter((query) => {
        const verdict = verdicts.get(query.tag)!
        return verdict.score < SUFFICIENCY_THRESHOLD && verdict.rewrittenQuery
      })

      if (needsSecondTour.length > 0) {
        const rewrittenQueries = needsSecondTour.map((query) => ({
          ...query,
          text: verdicts.get(query.tag)!.rewrittenQuery!,
        }))
        const secondTourResults = await searchTags(rewrittenQueries)

        for (const query of needsSecondTour) {
          byTag.set(
            query.tag,
            mergeTourResults(
              byTag.get(query.tag) ?? [],
              secondTourResults.get(query.tag) ?? [],
              query.k,
            ),
          )
          tours.set(query.tag, 2)
        }

        const secondVerdicts = await Promise.all(
          rewrittenQueries.map(
            async (query) =>
              [
                query.tag,
                await judgeTopicSufficiency(query, byTag.get(query.tag)!),
              ] as const,
          ),
        )
        for (const [tag, verdict] of secondVerdicts) verdicts.set(tag, verdict)
      }

      const topicScores: TopicScore[] = queries.map((query) => {
        const verdict = verdicts.get(query.tag)!
        return {
          tag: query.tag,
          score: verdict.score,
          tours: tours.get(query.tag)!,
          reason: verdict.reason,
        }
      })

      retriever.update({ output: { topicScores } })
      return { byTag, topicScores }
    },
    { asType: 'retriever' },
  )
}

export function mergeChunksWithinBudget(
  byTag: Map<string, RetrievedChunk[]>,
  tokenBudget: number,
): RetrievedChunk[] {
  const queues = Array.from(byTag.values()).map((chunks) => [...chunks])
  const seenIds = new Set<number>()
  const merged: RetrievedChunk[] = []
  let totalTokens = 0

  let addedInLastPass = true
  while (addedInLastPass) {
    addedInLastPass = false
    for (const queue of queues) {
      while (queue.length > 0 && seenIds.has(queue[0].id)) queue.shift()
      if (queue.length === 0) continue

      const chunk = queue.shift()!
      if (totalTokens + chunk.tokens > tokenBudget) continue

      seenIds.add(chunk.id)
      merged.push(chunk)
      totalTokens += chunk.tokens
      addedInLastPass = true
    }
  }

  return merged
}

const MUSCLE_GROUP_ORDER = [
  'pectoraux',
  'dos-grand_ronds-infra_épineux-petit_rond-rhomboïde-trapèzes',
  'jambes-quadriceps-ischio-jambiers-mollet-fessier',
  'epaules-deltoïdes',
  'bras',
  'abdominaux',
  'structure',
]

function baseTag(tag: string): string {
  return tag.replace(/-morphologie$/, '')
}

function categoryLabel(tag: string): string {
  if (tag === 'structure') return 'structure de programme'
  if (tag.endsWith('-morphologie')) return 'morphologie/blessure'
  return 'description exercice'
}

export function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  const sorted = [...chunks].sort((a, b) => {
    const orderA = MUSCLE_GROUP_ORDER.indexOf(baseTag(a.tag))
    const orderB = MUSCLE_GROUP_ORDER.indexOf(baseTag(b.tag))
    if (orderA !== orderB) return orderA - orderB

    const aIsMorpho = a.tag.endsWith('-morphologie')
    const bIsMorpho = b.tag.endsWith('-morphologie')
    return aIsMorpho === bIsMorpho ? 0 : aIsMorpho ? 1 : -1
  })

  return sorted
    .map(
      (chunk) =>
        `[Source : ${chunk.book} — ${categoryLabel(chunk.tag)} — extrait n°${chunk.chunkIndex}]\n${chunk.content}`,
    )
    .join('\n\n')
}
