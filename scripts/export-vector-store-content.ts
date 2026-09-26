// Run with: npx tsx scripts/export-vector-store-content.ts
//
// Phase 1 of moving the book-context cleanup out of the request path (see
// lib/ai.ts) and into a one-time offline pass: fetch every file currently
// in the vector store, clean it with the same model that used to run on
// every single generateProgram call, and write BOTH the raw and cleaned
// text to disk under scripts/output/ so you can actually read what came
// out of each book — and check nothing important got stripped — before
// touching the vector store itself.
//
// Read-only against OpenAI: this never deletes or uploads anything. Once
// you're happy with scripts/output/clean/*.txt (hand-edit any of them if
// needed), run replace-vector-store-files.ts to swap them into the store.

//  permet de récupérer en local les fichiers dans la base de données vectoriel, les documents vectoriels (qui sont brut et pas encore upgrader) et de les clean, et ensuite de les mettre en local (le raw ET le clean). Pas de repost derrière dans la base de donnée vectoriel

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from './load-env'
import { cleanBookText } from '../lib/context-cleanup'

loadEnv()

const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!VECTOR_STORE_ID || !OPENAI_API_KEY) {
  console.error('Missing VECTOR_STORE_ID or OPENAI_API_KEY in .env')
  process.exit(1)
}

const authHeaders = {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
}

interface VectorStoreFileEntry {
  id: string
}

interface OpenAiFile {
  id: string
  filename: string
}

interface VectorStoreFileContentPart {
  type: string
  text: string
}

interface ManifestEntry {
  fileId: string
  filename: string
  rawPath: string
  cleanPath: string
  rawLength: number
  cleanLength: number
}

const safeName = (name: string) => name.replace(/[^a-z0-9._-]/gi, '_')

async function main() {
  const listRes = await fetch(
    `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
    { headers: authHeaders },
  )
  const listJson = await listRes.json()
  const entries: VectorStoreFileEntry[] = listJson.data ?? []

  if (entries.length === 0) {
    console.log('No files found in this vector store.')
    return
  }

  const outDir = resolve(process.cwd(), 'scripts/output')
  mkdirSync(resolve(outDir, 'raw'), { recursive: true })
  mkdirSync(resolve(outDir, 'clean'), { recursive: true })

  const manifest: ManifestEntry[] = []

  for (const entry of entries) {
    // The underlying File object carries the human-readable filename — the
    // vector-store-file entry itself doesn't.
    const fileRes = await fetch(`https://api.openai.com/v1/files/${entry.id}`, {
      headers: authHeaders,
    })
    const fileJson: OpenAiFile = await fileRes.json()
    const filename = fileJson.filename ?? entry.id

    const contentRes = await fetch(
      `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files/${entry.id}/content`,
      { headers: authHeaders },
    )
    const contentJson = await contentRes.json()
    const parts: VectorStoreFileContentPart[] = contentJson.data ?? []
    const rawText = parts.map((part) => part.text).join('\n\n')

    console.log(`Cleaning "${filename}" (${rawText.length} chars)…`)
    const cleanText = await cleanBookText(rawText)

    const baseName = safeName(filename.replace(/\.[^.]+$/, '')) || entry.id
    const rawPath = resolve(outDir, 'raw', `${baseName}.txt`)
    const cleanPath = resolve(outDir, 'clean', `${baseName}.txt`)
    writeFileSync(rawPath, rawText, 'utf8')
    writeFileSync(cleanPath, cleanText, 'utf8')

    manifest.push({
      fileId: entry.id,
      filename,
      rawPath,
      cleanPath,
      rawLength: rawText.length,
      cleanLength: cleanText.length,
    })

    const reduction = rawText.length
      ? Math.round((1 - cleanText.length / rawText.length) * 100)
      : 0
    console.log(
      `  → ${rawText.length} → ${cleanText.length} chars (-${reduction}%) — ${cleanPath}`,
    )
  }

  writeFileSync(
    resolve(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  )

  console.log(`\nDone. Review scripts/output/clean/*.txt, then run:`)
  console.log(`  npx tsx scripts/replace-vector-store-files.ts`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
