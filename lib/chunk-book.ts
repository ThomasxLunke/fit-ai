import { encode } from 'gpt-tokenizer/model/gpt-4o'

// Target size for a merged chunk. Paragraph sizes in this corpus vary a lot
// (a one-line "Attention :" remark next to a 1000+ token explanation), so a
// single fixed-token split (OpenAI's vector store default: 800/400 overlap)
// would ignore that structure. Instead this groups whole paragraphs — never
// splitting one in half — until it's about this big.
const TARGET_CHUNK_TOKENS = 400

// A chunk under this size is too small to embed well on its own — most
// often a short title/heading paragraph (e.g. "PROGRAMME AVANCÉ SUR 4
// JOURS") that got separated by a blank line from the paragraph after it
// (its own body). Below this floor, keep accumulating past the target
// rather than flush a near-empty chunk cut off from the content it labels.
const MIN_CHUNK_TOKENS = 50

export interface BookChunk {
  text: string
  tokens: number
}

// cleanBookText() (lib/context-cleanup.ts) always separates the content it
// keeps with exactly one blank line, so splitting on blank lines recovers
// the same paragraph units the LLM cleaning pass already identified as
// coherent (one exercise description, one morphology passage, one workout
// example block) — chunking on top of that structure rather than against it.
export function chunkBookText(text: string): BookChunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: BookChunk[] = []
  let currentParagraphs: string[] = []
  let currentTokens = 0

  const flush = () => {
    if (currentParagraphs.length === 0) return
    chunks.push({
      text: currentParagraphs.join('\n\n'),
      tokens: currentTokens,
    })
    currentParagraphs = []
    currentTokens = 0
  }

  for (const paragraph of paragraphs) {
    const paragraphTokens = encode(paragraph).length

    if (
      currentTokens >= MIN_CHUNK_TOKENS &&
      currentTokens + paragraphTokens > TARGET_CHUNK_TOKENS
    ) {
      flush()
    }

    currentParagraphs.push(paragraph)
    currentTokens += paragraphTokens

    // A single paragraph already over target becomes its own chunk — never
    // split mid-paragraph, so this just closes it out immediately instead
    // of trying to attach more content to an already-oversized chunk.
    if (currentTokens > TARGET_CHUNK_TOKENS) {
      flush()
    }
  }
  flush()

  return chunks
}
