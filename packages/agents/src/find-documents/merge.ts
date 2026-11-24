import type { DocumentResult, SourceCredibility } from '../types'
import { downloadUrlOf } from './download-check'

// Official first, then other .go.id, then Open Web.
export const CREDIBILITY_RANK: Record<SourceCredibility, number> = {
  official: 0,
  government: 1,
  open_web: 2,
}

// Two results at one level with the same type, number and year are one document. A result with no
// type, number or year is never a duplicate.
function duplicateKeyOf(result: DocumentResult) {
  if (result.docType === 'Other' || result.number === null || result.year === null) return null

  const number = result.number.toLowerCase()

  return [result.jurisdictionLevel, result.docType, number, result.year].join('|')
}

function linksOf(result: DocumentResult): string[] {
  return [result.sourceUrl, result.officialUrl].filter((url): url is string => url !== undefined)
}

function urlsOf(result: DocumentResult): string[] {
  return [...linksOf(result), ...result.alternateUrls]
}

// The base is the copy with the best credibility. Copies of one rank keep their search order. The
// official link is the first official copy. Every other URL of the copies becomes an alternate.
function mergeCopies(copies: DocumentResult[]): DocumentResult {
  const ranked = [...copies].sort(
    (a, b) => CREDIBILITY_RANK[a.credibility] - CREDIBILITY_RANK[b.credibility],
  )
  const [base] = ranked

  if (ranked.length === 1) return base

  const officialUrl = ranked.find((copy) => copy.credibility === 'official')?.sourceUrl
  const chosen = [base.sourceUrl, officialUrl]
  const alternateUrls = [...new Set(ranked.flatMap(urlsOf))].filter((url) => !chosen.includes(url))

  return {
    ...base,
    officialUrl,
    alternateUrls,
    downloadUrl: downloadUrlOf(ranked.flatMap(linksOf)),
  }
}

// A result with no duplicate passes through unchanged. A merged result takes the place of its first copy.
export function mergeDuplicates(results: DocumentResult[]): DocumentResult[] {
  const groups: DocumentResult[][] = []
  const byKey = new Map<string, DocumentResult[]>()

  for (const result of results) {
    const key = duplicateKeyOf(result)

    if (key === null) {
      groups.push([result])
      continue
    }

    const group = byKey.get(key)

    if (group) {
      group.push(result)
      continue
    }

    const created = [result]

    byKey.set(key, created)
    groups.push(created)
  }

  return groups.map(mergeCopies)
}
