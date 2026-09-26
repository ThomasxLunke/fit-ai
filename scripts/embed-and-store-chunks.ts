// Run with: npx tsx scripts/embed-and-store-chunks.ts
//
// For each book in scripts/output/manifest.json: reads its cleaned text,
// chunks it with chunkBookText() (lib/chunk-book.ts, validated via
// scripts/preview-chunks.ts), embeds every chunk with OpenAI's
// text-embedding-3-small, and stores them in the "BookChunk" pgvector
// table — replacing that book's existing rows so this is safe to rerun
// after a book is re-cleaned.
//
// Uses its own plain PrismaClient rather than lib/db.ts's
// withAccelerate()-wrapped one: that wrapper targets Prisma Accelerate,
// unrelated to this direct Postgres connection, and unnecessary for a
// one-shot script.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from './load-env'
import { chunkBookText } from '../lib/chunk-book'

loadEnv()

import { OpenAIEmbeddings } from '@langchain/openai'
import { PrismaClient } from '../lib/generated/prisma'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100

interface ManifestEntry {
  fileId: string
  filename: string
  rawPath: string
  cleanPath: string
  rawLength: number
  cleanLength: number
}

const prisma = new PrismaClient()
const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL })

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`
}

async function embedBook(entry: ManifestEntry) {
  const book = entry.filename.replace(/\.pdf$/i, '')
  const text = readFileSync(entry.cleanPath, 'utf8')
  const chunks = chunkBookText(text)

  console.log(`\n=== ${book} ===`)
  console.log(`  ${chunks.length} chunks to embed`)

  const vectors: number[][] = []
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const batchVectors = await embeddings.embedDocuments(
      batch.map((c) => c.text),
    )
    vectors.push(...batchVectors)
    console.log(`  embedded ${vectors.length}/${chunks.length}`)
  }

  await prisma.$executeRaw`DELETE FROM "BookChunk" WHERE book = ${book}`

  for (let i = 0; i < chunks.length; i++) {
    const vectorLiteral = toVectorLiteral(vectors[i])
    await prisma.$executeRaw`
      INSERT INTO "BookChunk" (book, "chunkIndex", content, tokens, embedding)
      VALUES (${book}, ${i}, ${chunks[i].text}, ${chunks[i].tokens}, ${vectorLiteral}::vector)
    `
  }

  console.log(`  inserted ${chunks.length} rows`)
  return chunks.length
}

async function main() {
  const manifestPath = resolve(process.cwd(), 'scripts/output/manifest.json')
  const manifest: ManifestEntry[] = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  )

  let total = 0
  for (const entry of manifest) {
    total += await embedBook(entry)
  }

  console.log(`\nDone. ${total} chunks embedded and stored across ${manifest.length} books.`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
