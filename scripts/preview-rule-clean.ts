// Run with: npx tsx scripts/preview-rule-clean.ts
//
// Applies the deterministic (non-LLM) cleaning pass to every raw OCR file
// already on disk and writes the result to scripts/output/rule-clean/, so
// it can be reviewed on its own before deciding anything about the LLM
// cleaning step (model, single-call vs chunked). No network/LLM calls here.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ruleBasedClean } from '../lib/rule-based-cleanup'

const rawDir = resolve(process.cwd(), 'scripts/output/raw')
const outDir = resolve(process.cwd(), 'scripts/output/rule-clean')
mkdirSync(outDir, { recursive: true })

const files = readdirSync(rawDir).filter((f) => f.endsWith('.txt'))

if (files.length === 0) {
  console.log(`No .txt files found in ${rawDir}`)
  process.exit(0)
}

for (const file of files) {
  const rawPath = resolve(rawDir, file)
  const rawText = readFileSync(rawPath, 'utf8')
  const { text, removedPageNumberLines } = ruleBasedClean(rawText)

  const outPath = resolve(outDir, file)
  writeFileSync(outPath, text, 'utf8')

  const reduction = rawText.length
    ? Math.round((1 - text.length / rawText.length) * 100)
    : 0
  console.log(`\n=== ${file} ===`)
  console.log(`  ${rawText.length} -> ${text.length} chars (-${reduction}%)`)
  console.log(`  Removed ${removedPageNumberLines} isolated page-number line(s)`)
}

console.log(`\nDone. Review scripts/output/rule-clean/*.txt.`)
