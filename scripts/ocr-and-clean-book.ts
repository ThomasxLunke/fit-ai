// Run with: npx tsx scripts/ocr-and-clean-book.ts <path/to/book.pdf> [more.pdf ...]
//
// For a scanned PDF with no embedded text layer — confirmed for these books
// by both pdf-parse locally and OpenAI's vector store ingestion reporting
// "could not be parsed because it is empty" — there is no shortcut: this
// rasterizes every page locally with Poppler (pdftoppm), OCRs each page
// image with Tesseract (French), stitches the pages back into one raw text
// file, cleans it with the same pass as the rest of the pipeline
// (lib/context-cleanup.ts, chunked — a 300+ page OCR dump is too large for
// one gpt-4o-mini call), and writes both versions to scripts/output/ — then
// appends a manifest.json entry with `fileId` left blank: this never
// touches the vector store itself, so there's nothing to detach yet. Run
// attach-new-books.ts afterwards to actually attach the cleaned text.
//
// Needs Poppler + Tesseract installed locally (done via winget for this
// project) and a French language pack in scripts/tessdata/fra.traineddata
// (Tesseract's default install only ships English — downloaded separately
// from github.com/tesseract-ocr/tessdata since writing into the Tesseract
// Program Files install needs admin rights).

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { loadEnv } from './load-env'
import { cleanBookText } from '../lib/context-cleanup'

const execFileAsync = promisify(execFile)

loadEnv()

function findBinary(envVar: string, candidates: string[], fallback: string) {
  if (process.env[envVar] && existsSync(process.env[envVar]!)) {
    return process.env[envVar]!
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return fallback // hope it's on PATH
}

const localAppData = process.env.LOCALAPPDATA ?? ''

const PDFTOPPM = findBinary(
  'PDFTOPPM_PATH',
  [
    join(
      localAppData,
      'Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin/pdftoppm.exe',
    ),
  ],
  'pdftoppm',
)

const TESSERACT = findBinary(
  'TESSERACT_PATH',
  ['C:/Program Files/Tesseract-OCR/tesseract.exe'],
  'tesseract',
)

const TESSDATA_DIR = resolve(process.cwd(), 'scripts/tessdata')
const MAX_CLEAN_CHUNK_CHARS = 90000 // headroom under gpt-4o-mini's context per call

const safeName = (name: string) => name.replace(/[^a-z0-9._-]/gi, '_')

interface ManifestEntry {
  fileId: string
  filename: string
  rawPath: string
  cleanPath: string
  rawLength: number
  cleanLength: number
}

async function ocrPdf(pdfPath: string): Promise<string> {
  const workDir = mkdtempSync(join(tmpdir(), 'fitai-ocr-'))
  try {
    console.log('  Rasterizing pages (pdftoppm, 300dpi)…')
    await execFileAsync(PDFTOPPM, [
      '-png',
      '-r',
      '300',
      pdfPath,
      join(workDir, 'page'),
    ])

    const pages = readdirSync(workDir)
      .filter((f) => f.endsWith('.png'))
      .sort()
    console.log(`  ${pages.length} pages to OCR…`)

    const texts: string[] = new Array(pages.length)
    const concurrency = 4
    let nextIndex = 0
    let done = 0

    async function worker() {
      while (nextIndex < pages.length) {
        const i = nextIndex++
        const pagePath = join(workDir, pages[i])
        const outBase = join(workDir, `ocr-${i}`)
        await execFileAsync(TESSERACT, [
          pagePath,
          outBase,
          '-l',
          'fra',
          '--tessdata-dir',
          TESSDATA_DIR,
        ])
        texts[i] = readFileSync(`${outBase}.txt`, 'utf8')
        done++
        if (done % 10 === 0 || done === pages.length) {
          process.stdout.write(`\r  OCR: ${done}/${pages.length}`)
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    console.log('')

    return texts
      .map((text, i) => `-- page ${i + 1}/${pages.length} --\n${text}`)
      .join('\n\n')
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

// Splits on blank lines (paragraph boundaries) so a chunk cut never lands
// mid-paragraph, which would otherwise give cleanBookText() a truncated
// sentence at a chunk edge and risk it being misread as noise and dropped.
function chunkText(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxChars) {
      chunks.push(current)
      current = ''
    }
    current += (current ? '\n\n' : '') + paragraph
  }
  if (current) chunks.push(current)
  return chunks
}

// cleanBookText()'s prompt shows a `"""`-wrapped worked example — cleaning
// per-chunk (instead of the whole book in one call) makes the model treat
// each chunk like that example and echo the wrapper on some of them (as
// ``` too, not just """, and not necessarily only at the very start/end of
// a chunk — sometimes around a sub-section in the middle). Strip any line
// that's just a wrapper marker rather than touch the shared prompt, since
// whole-book calls don't exhibit this.
const stripFenceLines = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(```|""")\s*$/.test(line))
    .join('\n')
    .trim()

async function cleanLongText(rawText: string): Promise<string> {
  const chunks = chunkText(rawText, MAX_CLEAN_CHUNK_CHARS)
  console.log(`  Cleaning ${chunks.length} chunk(s)…`)
  const cleaned: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\r  Cleaning: ${i + 1}/${chunks.length}`)
    cleaned.push(stripFenceLines(await cleanBookText(chunks[i])))
  }
  console.log('')
  return cleaned.filter(Boolean).join('\n\n')
}

async function processOne(pdfPath: string, manifest: ManifestEntry[]) {
  const filename = basename(pdfPath)
  console.log(`\n=== ${filename} ===`)

  const rawText = await ocrPdf(pdfPath)
  console.log(`  → ${rawText.length} chars extracted`)

  const cleanText = await cleanLongText(rawText)

  const outDir = resolve(process.cwd(), 'scripts/output')
  mkdirSync(resolve(outDir, 'raw'), { recursive: true })
  mkdirSync(resolve(outDir, 'clean'), { recursive: true })

  const baseName = safeName(filename.replace(/\.[^.]+$/, ''))
  const rawPath = resolve(outDir, 'raw', `${baseName}.ocr.txt`)
  const cleanPath = resolve(outDir, 'clean', `${baseName}.txt`)
  writeFileSync(rawPath, rawText, 'utf8')
  writeFileSync(cleanPath, cleanText, 'utf8')

  const reduction = rawText.length
    ? Math.round((1 - cleanText.length / rawText.length) * 100)
    : 0
  console.log(
    `  → ${rawText.length} → ${cleanText.length} chars (-${reduction}%) — ${cleanPath}`,
  )

  manifest.push({
    fileId: '',
    filename,
    rawPath,
    cleanPath,
    rawLength: rawText.length,
    cleanLength: cleanText.length,
  })
}

async function main() {
  const pdfPaths = process.argv.slice(2)
  if (pdfPaths.length === 0) {
    console.error(
      'Usage: npx tsx scripts/ocr-and-clean-book.ts <path/to/book.pdf> [more.pdf ...]',
    )
    process.exit(1)
  }
  if (!existsSync(join(TESSDATA_DIR, 'fra.traineddata'))) {
    console.error(`Missing ${TESSDATA_DIR}/fra.traineddata`)
    process.exit(1)
  }

  const manifestPath = resolve(process.cwd(), 'scripts/output/manifest.json')
  const manifest: ManifestEntry[] = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : []

  for (const pdfPath of pdfPaths) {
    await processOne(resolve(pdfPath), manifest)
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  }

  console.log(`\nDone. Review scripts/output/clean/*.txt.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
