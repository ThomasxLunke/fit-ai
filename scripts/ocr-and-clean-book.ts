// Run with: npx tsx scripts/ocr-and-clean-book.ts <path/to/book.pdf> [more.pdf ...]
//
// For a scanned PDF with no embedded text layer — confirmed for these books
// by both pdf-parse locally and OpenAI's vector store ingestion reporting
// "could not be parsed because it is empty" — there is no shortcut: this
// rasterizes every page locally with Poppler (pdftoppm), OCRs each page
// image with Tesseract (French), stitches the pages back into one raw text
// file, runs the deterministic pre-clean (lib/rule-based-cleanup.ts), then
// cleans what's left with the LLM pass (lib/context-cleanup.ts) in a single
// call — gpt-6-sol's 1.05M-token input / 128k-token output window comfortably
// fits even our biggest book, so unlike the old gpt-4o-mini version this
// doesn't need to chunk the book across several isolated calls. Writes both
// raw and cleaned versions to scripts/output/ — then appends a manifest.json
// entry with `fileId` left blank: this never touches the vector store
// itself, so there's nothing to detach yet. Run attach-new-books.ts
// afterwards to actually attach the cleaned text.
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
import { ruleBasedClean } from '../lib/rule-based-cleanup'

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

// Safety margin well under gpt-6-sol's 1.05M-token input limit (~4 chars/
// token for French text) — a clear error here beats a cryptic API failure
// if a future book turns out to be far bigger than anything seen so far
// (our biggest today, Blessures, is ~640k raw chars / 184k tokens).
const MAX_CLEAN_INPUT_CHARS = 3_500_000

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

// cleanBookText()'s prompt shows a `"""`-wrapped worked example — a model
// can echo that wrapper (as ``` too, not just """) around its answer.
// Never observed on a whole-book single call, only when the same prompt
// was run per-chunk against a smaller model, but cheap enough to keep as a
// no-op safety net either way.
const stripFenceLines = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(```|""")\s*$/.test(line))
    .join('\n')
    .trim()

async function processOne(pdfPath: string, manifest: ManifestEntry[]) {
  const filename = basename(pdfPath)
  console.log(`\n=== ${filename} ===`)

  const rawText = await ocrPdf(pdfPath)
  console.log(`  → ${rawText.length} chars extracted`)

  const { text: preCleanedText } = ruleBasedClean(rawText)
  if (preCleanedText.length > MAX_CLEAN_INPUT_CHARS) {
    throw new Error(
      `${filename}: pre-cleaned text is ${preCleanedText.length} chars, over the ${MAX_CLEAN_INPUT_CHARS} safety margin for a single cleaning call — needs chunking again, revisit this script.`,
    )
  }

  console.log('  Cleaning (single call)…')
  const cleanText = stripFenceLines(await cleanBookText(preCleanedText))

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
