// Run with: npx tsx scripts/replace-vector-store-files.ts
//
// Phase 2 — DESTRUCTIVE. Only run this after reviewing
// scripts/output/clean/*.txt (hand-edit any of them if something important
// got stripped, or noise survived). For every entry in
// scripts/output/manifest.json (written by export-vector-store-content.ts):
// uploads the cleaned .txt as a new OpenAI file, attaches it to the vector
// store, then detaches the original noisy file from the store.
//
// "Detach" only removes the file FROM THE VECTOR STORE — it does not delete
// the underlying file from your OpenAI account. Once you're confident you
// won't need to redo this differently, remove the old files yourself from
// the OpenAI dashboard (or via DELETE /v1/files/{id}) to stop paying for
// their storage.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from './load-env'

loadEnv()

const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!VECTOR_STORE_ID || !OPENAI_API_KEY) {
  console.error('Missing VECTOR_STORE_ID or OPENAI_API_KEY in .env')
  process.exit(1)
}

const authHeaders = { Authorization: `Bearer ${OPENAI_API_KEY}` }

interface ManifestEntry {
  fileId: string
  filename: string
  cleanPath: string
}

async function main() {
  const manifestPath = resolve(process.cwd(), 'scripts/output/manifest.json')
  const manifest: ManifestEntry[] = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  )

  for (const entry of manifest) {
    console.log(`Replacing "${entry.filename}"…`)

    const cleanText = readFileSync(entry.cleanPath, 'utf8')
    const cleanFilename = `${entry.filename.replace(/\.[^.]+$/, '')}.clean.txt`

    // 1. Upload the cleaned text as a new file.
    const form = new FormData()
    form.append('purpose', 'assistants')
    form.append('file', new Blob([cleanText], { type: 'text/plain' }), cleanFilename)

    const uploadRes = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: authHeaders,
      body: form,
    })
    const uploaded = await uploadRes.json()
    if (!uploaded.id) {
      console.error('  ✗ upload failed:', uploaded)
      continue
    }

    // 2. Attach it to the vector store.
    const attachRes = await fetch(
      `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
      {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: uploaded.id }),
      },
    )
    if (!attachRes.ok) {
      console.error('  ✗ attach failed:', await attachRes.json())
      continue
    }

    // 3. Detach the original (noisy) file from the vector store.
    const detachRes = await fetch(
      `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files/${entry.fileId}`,
      { method: 'DELETE', headers: authHeaders },
    )
    if (!detachRes.ok) {
      console.error('  ✗ detach of original failed:', await detachRes.json())
      continue
    }

    console.log(`  ✓ replaced with ${cleanFilename} (new id: ${uploaded.id})`)
  }

  console.log('\nDone. The vector store now serves the cleaned text.')
  console.log(
    'The old (noisy) files are detached but still exist in your OpenAI account — delete them from the dashboard once you no longer need them.',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
