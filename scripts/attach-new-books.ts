// Run with: npx tsx scripts/attach-new-books.ts
//
// For every scripts/output/manifest.json entry with an empty fileId (i.e.
// produced by ocr-and-clean-book.ts, never yet attached to the vector
// store): uploads its cleanPath text as a new OpenAI file, attaches it to
// the vector store, and writes the resulting file id back into the
// manifest. Unlike replace-vector-store-files.ts there's nothing to detach
// first — these are brand-new books, not replacements.

// si un book n'est pas deja attahché (on verfie ca dans le manifest.json)attache un book dans open api doc, puis sur le base de donnée vectorielle, puis met dans le manifest que le fichier a bien été mis la bas

import { readFileSync, writeFileSync } from 'node:fs'
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
    if (entry.fileId) {
      console.log(
        `Skipping "${entry.filename}" — already attached (${entry.fileId})`,
      )
      continue
    }

    console.log(`Attaching "${entry.filename}"…`)
    const cleanText = readFileSync(entry.cleanPath, 'utf8')
    const cleanFilename = `${entry.filename.replace(/\.[^.]+$/, '')}.clean.txt`

    const form = new FormData()
    form.append('purpose', 'assistants')
    form.append(
      'file',
      new Blob([cleanText], { type: 'text/plain' }),
      cleanFilename,
    )

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

    entry.fileId = uploaded.id
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
    console.log(`  ✓ attached as ${cleanFilename} (id: ${uploaded.id})`)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
