// Deterministic, non-LLM pass over raw OCR text — handles the noise that's
// purely mechanical (justified-text hyphenation, stray whitespace, isolated
// page numbers) before any semantic/LLM cleaning happens. Deliberately
// leaves alone anything that needs to see a paragraph's meaning to judge —
// e.g. telling a real sentence-case subheading apart from an isolated
// figure caption of the same shape turned out to have real false
// positives when tried here (a Volume 1 test run dropped genuine
// subheadings like "Aspects pratiques de l'entraînement à domicile"), and
// unlike the LLM pass this one can't recover from a wrong call — the line
// is just gone. That distinction stays with lib/context-cleanup.ts, which
// sees full paragraphs and can actually reason about it.

// Our own page-boundary markers (scripts/ocr-and-clean-book.ts's ocrPdf())
// — never noise, always kept, so a future citation feature can still know
// which page a kept paragraph came from.
const PAGE_MARKER_RE = /^-- page \d+\/\d+ --$/

export interface RuleBasedCleanResult {
  text: string
  removedPageNumberLines: number
}

export function ruleBasedClean(rawText: string): RuleBasedCleanResult {
  // 1. Rejoin words split by an end-of-line hyphen or soft hyphen — a
  // justified-text typesetting artifact ("diffé­\nrences" -> "différences"),
  // not a real word boundary.
  let text = rawText.replace(/([a-zà-ÿ])[-­]\n([a-zà-ÿ])/gi, '$1$2')

  // 2. Collapse repeated spaces/tabs, strip trailing whitespace per line.
  text = text.replace(/[ \t]+/g, ' ').replace(/[ \t]+$/gm, '')

  // 3. Isolated page-number-only line (the actual number printed on the
  // scanned page — not our own marker, which is whitelisted).
  let removedPageNumberLines = 0
  const kept = text.split('\n').filter((line) => {
    const trimmed = line.trim()
    if (PAGE_MARKER_RE.test(trimmed)) return true
    if (/^\d{1,4}$/.test(trimmed)) {
      removedPageNumberLines++
      return false
    }
    return true
  })

  // 4. Collapse 3+ consecutive blank lines down to a single paragraph
  // separator.
  text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return { text, removedPageNumberLines }
}
