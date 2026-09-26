// Run with: npx tsx scripts/test-retrieval.ts
//
// Sanity-checks the multi-query pgvector retrieval (lib/retrieval.ts)
// against a few representative onboarding payloads, without ever calling
// the generation LLM — only embedding calls (negligible cost). Prints
// per-tag results (book, chunk index, distance) and the merged token
// count, so retrieval quality can be eyeballed before wiring it into
// lib/ai.ts's generateProgram().

import { loadEnv } from './load-env'

loadEnv()

import type { OnBoardingSchema } from '../components/onboarding-form'
import {
  buildTopicQueries,
  retrieveBookChunks,
  mergeChunksWithinBudget,
} from '../lib/retrieval'

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

const samples: { label: string; payload: OnBoardingSchema }[] = [
  {
    label: 'push-pull-legs / 4 jours',
    payload: {
      sessionPerWeek: 4,
      dayAvailable: [1, 2, 4, 5],
      objective: 'gain',
      programPreferences: 'push-pull-legs',
      arm: 0.95,
      leg: 0.6,
      torso: 0.3,
    },
  },
  {
    label: 'half-body / 3 jours',
    payload: {
      sessionPerWeek: 3,
      dayAvailable: [1, 3, 5],
      objective: 'lose',
      programPreferences: 'half-body',
      arm: 1.2,
      leg: 0.55,
      torso: 0.35,
    },
  },
  {
    label: 'full-body / 3 jours',
    payload: {
      sessionPerWeek: 3,
      dayAvailable: [2, 4, 6],
      objective: 'maintain',
      programPreferences: 'full-body',
      arm: 1.0,
      leg: 0.5,
      torso: 0.32,
    },
  },
  {
    label: 'split / 5 jours',
    payload: {
      sessionPerWeek: 5,
      dayAvailable: [1, 2, 3, 4, 5],
      objective: 'gain',
      programPreferences: 'split',
      arm: 0.8,
      leg: 0.62,
      torso: 0.28,
    },
  },
  {
    label: 'aucune préférence / 3 jours',
    payload: {
      sessionPerWeek: 3,
      dayAvailable: [1, 4, 6],
      objective: 'maintain',
      programPreferences: 'none',
      arm: 1.05,
      leg: 0.5,
      torso: 0.5,
    },
  },
]

async function main() {
  for (const sample of samples) {
    console.log(`\n=== ${sample.label} ===`)

    const torsoLegRatio = sample.payload.torso / sample.payload.leg
    const forearmInterpretation = interpretForearmRatio(sample.payload.arm)
    const torsoLegInterpretation = interpretTorsoLegRatio(torsoLegRatio)

    const queries = buildTopicQueries(
      sample.payload,
      forearmInterpretation,
      torsoLegInterpretation,
    )
    const byTag = await retrieveBookChunks(queries)

    for (const [tag, chunks] of byTag) {
      console.log(`  [${tag}]`)
      for (const chunk of chunks) {
        console.log(
          `    ${chunk.book} #${chunk.chunkIndex} (distance=${chunk.distance.toFixed(3)}, tokens=${chunk.tokens})`,
        )
      }
    }

    const merged = mergeChunksWithinBudget(byTag, 6000)
    const totalTokens = merged.reduce((sum, c) => sum + c.tokens, 0)
    const bookCounts = merged.reduce<Record<string, number>>((acc, c) => {
      acc[c.book] = (acc[c.book] ?? 0) + 1
      return acc
    }, {})
    console.log(
      `  → merged: ${merged.length} chunks, ${totalTokens} tokens, books: ${JSON.stringify(bookCounts)}`,
    )
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
