import { OpenAIEmbeddings } from '@langchain/openai'
import type { OnBoardingSchema } from '@/components/onboarding-form'
import vectorDb from './vector-db'

const EMBEDDING_MODEL = 'text-embedding-3-small'

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
const PROGRAM_PREFERENCE_LABELS: Record<OnBoardingSchema['programPreferences'], string> = {
  'push-pull-legs': 'Push/Pull/Legs',
  'half-body': 'Half Body',
  'full-body': 'Full Body',
  split: 'Split',
  none: 'Aucune préférence',
}

// A fixed muscle-group taxonomy, independent of programPreferences — every
// split (PPL, half-body, full-body, split, or none) ends up needing chest,
// back, legs, shoulders, arms and core exercises on some day, so basing the
// query set on programPreferences instead would risk under-covering
// whichever groups don't map cleanly onto the chosen split name. `securite`
// exists specifically so the "Blessures en musculation et sports de force"
// book gets consulted at all — no other query targets it.
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
      tag: 'dos',
      text: 'exercices pour le dos (tirage, rowing, dorsaux)',
      k: 6,
    },
    {
      tag: 'jambes',
      text: 'exercices pour les jambes (quadriceps, ischio-jambiers, fessiers, mollets)',
      k: 6,
    },
    {
      tag: 'epaules',
      text: 'exercices pour les épaules (développé militaire, élévations)',
      k: 6,
    },
    {
      tag: 'bras',
      text: 'exercices pour les bras (biceps, triceps, avant-bras)',
      k: 6,
    },
    {
      tag: 'abdominaux',
      text: 'exercices pour les abdominaux et le gainage',
      k: 6,
    },
    {
      tag: 'securite',
      text: 'prévention des blessures et sécurité en musculation selon la morphologie',
      k: 4,
    },
    {
      tag: 'morphologie',
      text: `choix d'exercices adaptés à une morphologie : ${forearmInterpretation}, ${torsoLegInterpretation}`,
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

export async function retrieveBookChunks(
  queries: TopicQuery[],
): Promise<Map<string, RetrievedChunk[]>> {
  const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL })
  const vectors = await embeddings.embedDocuments(queries.map((q) => q.text))

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

// Round-robins across tags (one chunk per tag per pass, skipping ids
// already included via another tag) rather than a flat sort by distance —
// a flat sort would let a tag with unusually distinctive vocabulary (e.g.
// "morphologie") dominate the budget and crowd out muscle groups whose
// chunks score less extremely but are just as necessary for a complete
// program.
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

export function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk) =>
        `[Source : ${chunk.book} — extrait n°${chunk.chunkIndex}]\n${chunk.content}`,
    )
    .join('\n\n')
}
