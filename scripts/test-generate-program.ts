// Run with: npx tsx scripts/test-generate-program.ts [--run-id <id>] [--agentic]
//
// One real end-to-end call to generateProgram() (lib/ai.ts) with a sample
// onboarding payload — triggers real retrieval + a real gpt-4o-mini call
// (small but real cost). Prints the full structured result so exercise
// diversity/quality can be reviewed after switching from full-dump context
// to the new top-k pgvector retrieval. Throwaway script, not part of the
// pipeline.
//
// --run-id tags every exercise-justification AND topic-retrieval span from
// this call so eval/run_ragas_eval.py --run-id <id> --target <exercise|topic>
// can evaluate just this run instead of every such span ever created. Omit
// it to get a random id (printed below either way — copy it from there if
// you forgot to pass one).
//
// --agentic calls generateProgramAgentic() instead of generateProgram() —
// the judge-and-retry retrieval loop (see lib/retrieval.ts's
// retrieveBookChunksAgentic()). Lets the two modes be compared on the same
// --run-id workflow: generate once with --agentic and once without, then
// run eval/run_ragas_eval.py --target topic against each run id.
//
// Always runs with evalMode: true (see lib/ai.ts) — on top of the real
// generation call, this also fires one extra gpt-4o-mini call per retrieval
// tag (~13) to record the topic-retrieval spans. Real, if small, added cost.

import { loadEnv } from './load-env'

loadEnv()

import { generateProgram, generateProgramAgentic } from '../lib/ai'
import { shutdownObservability } from '../lib/observability'
import type { OnBoardingSchema } from '../components/onboarding-form'

const payload: OnBoardingSchema = {
  sessionPerWeek: 3,
  dayAvailable: [2, 4, 5],
  objective: 'gain',
  programPreferences: 'split',
  arm: 0.95,
  leg: 0.6,
  torso: 0.3,
}

function parseRunId(): string {
  const flagIndex = process.argv.indexOf('--run-id')
  return flagIndex === -1 ? crypto.randomUUID() : process.argv[flagIndex + 1]
}

function printProgram(program: Awaited<ReturnType<typeof generateProgram>>) {
  console.log(JSON.stringify(program, null, 2))

  console.log(`\n=== Summary ===`)
  console.log(`Program: ${program.name}`)
  for (const session of program.trainingSessions) {
    console.log(
      `\n  ${session.day} — ${session.name} (${session.exercises.length} exercices)`,
    )
    for (const ex of session.exercises) {
      console.log(`    - ${ex.name} [${ex.justification.source.book}]`)
      console.log(`      raison: ${ex.justification.reason}`)
      console.log(`      extrait: ${ex.justification.source.excerpt}`)
    }
  }
}

async function main() {
  const runId = parseRunId()
  const agentic = process.argv.includes('--agentic')

  console.log('Generating program...')
  if (agentic) {
    const { topicScores, ...program } = await generateProgramAgentic(
      payload,
      runId,
      true,
    )
    printProgram(program)

    console.log(`\n=== Topic scores ===`)
    for (const { tag, score, tours, reason } of topicScores) {
      console.log(`  [${tag}] score=${score.toFixed(2)} tours=${tours}`)
      console.log(`    ${reason}`)
    }
  } else {
    printProgram(await generateProgram(payload, runId, true))
  }

  await shutdownObservability()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
