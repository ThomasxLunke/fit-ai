// Run with: npx tsx scripts/reclean-books.ts
//
// Re-runs rule-based pre-clean + LLM clean (gpt-6-sol, single call — see
// lib/context-cleanup.ts and lib/rule-based-cleanup.ts) over every book
// already listed in scripts/output/manifest.json, reading its existing raw
// OCR text (rawPath) instead of redoing the slow OCR step. Overwrites each
// entry's cleanPath and updates cleanLength in the manifest. Does NOT touch
// the vector store — fileId is left as-is; run replace-vector-store-files.ts
// separately once the new scripts/output/clean/*.txt have been reviewed.
//
// Real OpenAI API calls, real cost (a few dollars for the whole corpus at
// gpt-6-sol's rates) — not a dry run like preview-rule-clean.ts.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from './load-env'
import { cleanBookText } from '../lib/context-cleanup'
import { ruleBasedClean } from '../lib/rule-based-cleanup'

loadEnv()

const stripFenceLines = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(```|""")\s*$/.test(line))
    .join('\n')
    .trim()

interface ManifestEntry {
  fileId: string
  filename: string
  rawPath: string
  cleanPath: string
  rawLength: number
  cleanLength: number
}

async function main() {
  const manifestPath = resolve(process.cwd(), 'scripts/output/manifest.json')
  const manifest: ManifestEntry[] = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  )

  for (const entry of manifest) {
    console.log(`\n=== ${entry.filename} ===`)

    const rawText = readFileSync(entry.rawPath, 'utf8')
    const { text: preCleanedText } = ruleBasedClean(rawText)

    console.log('  Cleaning (single call)…')
    const cleanText = stripFenceLines(await cleanBookText(preCleanedText))

    writeFileSync(entry.cleanPath, cleanText, 'utf8')
    entry.cleanLength = cleanText.length
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

    const reduction = rawText.length
      ? Math.round((1 - cleanText.length / rawText.length) * 100)
      : 0
    console.log(
      `  → ${rawText.length} → ${cleanText.length} chars (-${reduction}%) — ${entry.cleanPath}`,
    )
  }

  console.log(`\nDone. Review scripts/output/clean/*.txt.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
