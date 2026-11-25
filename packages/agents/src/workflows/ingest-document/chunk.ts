import { chunkText } from '@anvia/core/documents'
import { PASSAGE_MAX_CHARS, PASSAGE_OVERLAP_CHARS, PASSAGE_SEPARATORS } from './constants'
import type { ExtractedPage } from './extract'

// A heading alone on its line. A Pasal cited mid-sentence has more text on its line, so it does not split.
const HEADING = /^(?:LAMPIRAN\b.*|BAB\s+[IVXLCDM]+|Pasal\s+\d+[A-Z]?)\s*$/gm

export type PassageDraft = {
  index: number
  heading: string
  text: string
  pageStart: number
  pageEnd: number
}

// Cuts the text before each heading, then sizes every section with Anvia's chunker, so a Passage never
// crosses a Pasal. Offsets in the joined text map each Passage back to its pages.
export function chunkPages(title: string, pages: ExtractedPage[]): PassageDraft[] {
  const pageStarts: number[] = []
  let text = ''

  for (const page of pages) {
    pageStarts.push(text.length)
    text += `${page.text}\n`
  }

  // Page starts ascend, so the count of starts at or before an offset is the index of its page plus one.
  const pageAt = (offset: number) =>
    pages[pageStarts.filter((start) => start <= offset).length - 1].page

  const sectionStarts = [0, ...Array.from(text.matchAll(HEADING), (match) => match.index)]
  const passages: PassageDraft[] = []
  let bab = ''
  let pasal = ''

  for (const [i, start] of sectionStarts.entries()) {
    const end = sectionStarts[i + 1] ?? text.length
    const section = text.slice(start, end)
    const [firstLine, secondLine = ''] = section.split('\n', 2).map((line) => line.trim())

    if (firstLine.startsWith('LAMPIRAN')) {
      bab = firstLine
      pasal = ''
    }

    // The BAB title is on the line under its number.
    if (firstLine.startsWith('BAB')) {
      bab = `${firstLine} ${secondLine}`
      pasal = ''
    }

    if (firstLine.startsWith('Pasal')) pasal = firstLine

    const heading = [title, bab, pasal].filter(Boolean).join(' › ')

    for (const chunk of chunkText({
      text: section,
      maxSize: PASSAGE_MAX_CHARS,
      overlap: PASSAGE_OVERLAP_CHARS,
      separators: PASSAGE_SEPARATORS,
    })) {
      const body = chunk.text.trim()

      if (!body) continue

      // Page spans come from the trimmed text, so a Passage never starts on the page before its first word.
      const bodyStart = start + chunk.start + chunk.text.indexOf(body)

      passages.push({
        index: passages.length,
        heading,
        text: body,
        pageStart: pageAt(bodyStart),
        pageEnd: pageAt(bodyStart + body.length - 1),
      })
    }
  }

  return passages
}
