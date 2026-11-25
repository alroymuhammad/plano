import { chunkText } from '@anvia/core/documents'
import type { ExtractedPage, PassageDraft } from '../../types'
import { PASSAGE_MAX_CHARS, PASSAGE_OVERLAP_CHARS, PASSAGE_SEPARATORS } from './constants'

const STANDALONE_HEADING = /^(?:LAMPIRAN\b.*|BAB\s+[IVXLCDM]+|Pasal\s+\d+[A-Z]?)\s*$/gm

export function chunkPages(title: string, pages: ExtractedPage[]): PassageDraft[] {
  const pageStarts: number[] = []
  let text = ''

  for (const page of pages) {
    pageStarts.push(text.length)
    text += `${page.text}\n`
  }

  const pageAt = (offset: number) =>
    pages[pageStarts.filter((start) => start <= offset).length - 1].page

  const sectionStarts = [
    0,
    ...Array.from(text.matchAll(STANDALONE_HEADING), (match) => match.index),
  ]
  const passages: PassageDraft[] = []
  let bab = ''
  let pasal = ''

  for (const [i, start] of sectionStarts.entries()) {
    const end = sectionStarts[i + 1] ?? text.length
    const section = text.slice(start, end)
    const [firstLine, lineBelowHeading = ''] = section.split('\n', 2).map((line) => line.trim())

    if (firstLine.startsWith('LAMPIRAN')) {
      bab = firstLine
      pasal = ''
    }

    if (firstLine.startsWith('BAB')) {
      bab = `${firstLine} ${lineBelowHeading}`
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
