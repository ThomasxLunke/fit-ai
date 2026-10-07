// Run with: npx tsx scripts/test-generate-program.ts [--run-id <id>]
//
// One real end-to-end call to generateProgram() (lib/ai.ts) with a sample
// onboarding payload — triggers real retrieval + a real gpt-4o-mini call
// (small but real cost). Prints the full structured result so exercise
// diversity/quality can be reviewed after switching from full-dump context
// to the new top-k pgvector retrieval. Throwaway script, not part of the
// pipeline.
//
// --run-id tags every exercise-justification span from this call so
// eval/run_ragas_eval.py --run-id <id> can evaluate just this run instead
// of every such span ever created. Omit it to get a random id (printed
// below either way — copy it from there if you forgot to pass one).

import { loadEnv } from './load-env'

loadEnv()

import { generateProgram } from '../lib/ai'
import { shutdownObservability } from '../lib/observability'
import type { OnBoardingSchema } from '../components/onboarding-form'

const payload: OnBoardingSchema = {
  sessionPerWeek: 4,
  dayAvailable: [1, 2, 4, 5],
  objective: 'gain',
  programPreferences: 'push-pull-legs',
  arm: 0.95,
  leg: 0.6,
  torso: 0.3,
}

function parseRunId(): string {
  const flagIndex = process.argv.indexOf('--run-id')
  // Generated here (not left to generateProgram()'s own default) so this
  // script always knows the exact id to print below, even when --run-id
  // wasn't passed.
  return flagIndex === -1 ? crypto.randomUUID() : process.argv[flagIndex + 1]
}

async function main() {
  const runId = parseRunId()
  console.log(`Run id: ${runId}`)

  console.log('Generating program...')
  const program = await generateProgram(payload, runId)
  console.log(JSON.stringify(program, null, 2))

  console.log(`\n=== Summary ===`)
  console.log(`Program: ${program.name}`)
  for (const session of program.trainingSessions) {
    console.log(`\n  ${session.day} — ${session.name} (${session.exercises.length} exercices)`)
    for (const ex of session.exercises) {
      console.log(`    - ${ex.name} [${ex.justification.source.book}]`)
      console.log(`      raison: ${ex.justification.reason}`)
      console.log(`      extrait: ${ex.justification.source.excerpt}`)
    }
  }

  await shutdownObservability()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
