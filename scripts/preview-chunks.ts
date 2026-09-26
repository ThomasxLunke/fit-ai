// Run with: npx tsx scripts/preview-chunks.ts
//
// Applies chunkBookText() (lib/chunk-book.ts) to every book in
// scripts/output/clean/ and writes a human-reviewable preview to
// scripts/output/chunks-preview/ — no network calls, no cost, so this can
// be reviewed before touching the database or spending anything on
// embeddings.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chunkBookText } from '../lib/chunk-book'

const cleanDir = resolve(process.cwd(), 'scripts/output/clean')
const outDir = resolve(process.cwd(), 'scripts/output/chunks-preview')
mkdirSync(outDir, { recursive: true })

const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]

const files = readdirSync(cleanDir).filter((f) => f.endsWith('.txt'))

for (const file of files) {
  const text = readFileSync(resolve(cleanDir, file), 'utf8')
  const chunks = chunkBookText(text)

  const preview = chunks
    .map(
      (chunk, i) =>
        `===== chunk ${i + 1}/${chunks.length} (${chunk.tokens} tokens) =====\n${chunk.text}`,
    )
    .join('\n\n')
  writeFileSync(resolve(outDir, file), preview, 'utf8')

  const sizes = chunks.map((c) => c.tokens).sort((a, b) => a - b)
  console.log(`\n=== ${file} ===`)
  console.log(`  ${chunks.length} chunks`)
  console.log(
    `  tokens: min=${sizes[0]} p25=${percentile(sizes, 0.25)} median=${percentile(sizes, 0.5)} p75=${percentile(sizes, 0.75)} p90=${percentile(sizes, 0.9)} max=${sizes[sizes.length - 1]}`,
  )
}

console.log(`\nDone. Review scripts/output/chunks-preview/*.txt.`)
