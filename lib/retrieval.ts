import { OpenAIEmbeddings } from '@langchain/openai'
import { startActiveObservation } from '@langfuse/tracing'
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

// A fixed muscle-group taxonomy, independent of programPreferences — every
// split (PPL, half-body, full-body, split, or none) ends up needing chest,
// back, legs, shoulders, arms and core exercises on some day, so basing the
// query set on programPreferences instead would risk under-covering
// whichever groups don't map cleanly onto the chosen split name.
//
// Each muscle group has a companion "-morphologie" query alongside its
// exercise query. The corpus genuinely contains morphology-influence
// passages (limb length, bone proportions, injury risk — protected
// verbatim during cleaning, see lib/context-cleanup.ts's second content
// category), but a single generic query detached from any muscle group
// never linked that content to the specific exercise being justified —
// the model had a "dos" chunk and an unrelated generic "morphologie"
// chunk, nothing connecting the two, so justification.reason fell back on
// vague boilerplate ("morphologie qui favorise un bon équilibre") instead
// of citing something real. Pairing each muscle group with its own
// morphology/injury-risk query gives the model an actual grounded passage
// for that specific muscle group. This also folds in what a dedicated
// `securite` tag used to cover ("Blessures en musculation et sports de
// force") — if that book stops showing up in scripts/test-retrieval.ts
// output, widen these queries' k rather than reintroducing a standalone tag.
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
      tag: 'dos',
      text: 'exercices pour le dos (tirage, rowing, dorsaux)',
      k: 6,
    },
    {
      tag: 'dos-morphologie',
      text: `influence de la longueur des membres et des proportions osseuses sur le choix des exercices de dos, risques de blessure (${torsoLegInterpretation})`,
      k: 4,
    },
    {
      tag: 'jambes',
      text: 'exercices pour les jambes (quadriceps, ischio-jambiers, fessiers, mollets)',
      k: 6,
    },
    {
      tag: 'jambes-morphologie',
      text: `influence de la longueur du fémur et des proportions des jambes sur le choix des exercices de jambes (squat, presse), risques de blessure au genou (${torsoLegInterpretation})`,
      k: 4,
    },
    {
      tag: 'epaules',
      text: 'exercices pour les épaules (développé militaire, élévations)',
      k: 6,
    },
    {
      tag: 'epaules-morphologie',
      text: "influence de la morphologie de l'épaule (largeur, mobilité articulaire) sur le choix des exercices d'épaules, risques de blessure",
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

export async function retrieveBookChunks(
  queries: TopicQuery[],
): Promise<Map<string, RetrievedChunk[]>> {
  return startActiveObservation(
    'retrieve-book-chunks',
    async (retriever) => {
      retriever.update({ input: { tags: queries.map((q) => q.tag) } })

      // embedDocuments() has no callbacks/config param (unlike chat model
      // .invoke()), so this can't be traced via LangChain's callback
      // system — a manual embedding-type span instead.
      const vectors = await startActiveObservation(
        'embed-topic-queries',
        async (embedding) => {
          embedding.update({
            model: EMBEDDING_MODEL,
            input: queries.map((q) => q.text),
          })
          const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL })
          const result = await embeddings.embedDocuments(
            queries.map((q) => q.text),
          )
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

      const byTag = new Map(results)
      retriever.update({
        output: {
          totalChunks: Array.from(byTag.values()).reduce(
            (sum, chunks) => sum + chunks.length,
            0,
          ),
        },
      })
      return byTag
    },
    { asType: 'retriever' },
  )
}

// Round-robins across tags (one chunk per tag per pass, skipping ids
// already included via another tag) rather than a flat sort by distance —
// a flat sort would let a tag with unusually distinctive vocabulary (e.g.
// "dos-morphologie") dominate the budget and crowd out muscle groups whose
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

const MUSCLE_GROUP_ORDER = [
  'pectoraux',
  'dos',
  'jambes',
  'epaules',
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

// Groups chunks by muscle group (an exercise chunk next to its
// morphology/injury companion) instead of mergeChunksWithinBudget's
// round-robin insertion order — that order is about fair SELECTION under
// budget, this is about presentation. Putting each muscle group's two
// chunk types next to each other, explicitly labeled, is what lets the
// prompt (lib/ai.ts) instruct the model to prefer the morphologie/blessure
// extract over the generic exercise one when both exist for the same
// group, instead of leaving it to pick whichever comes first.
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
