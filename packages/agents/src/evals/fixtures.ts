import { Usage } from '@anvia/core'
import { LEVELS } from '../find-documents/source-map'
import type {
  DocumentResult,
  JurisdictionLevel,
  QueryUnderstanding,
  SourceCredibility,
} from '../types'
import type { FindDocumentsEvalOutput } from './types'

const understanding: QueryUnderstanding = {
  inScope: true,
  topic: 'bangunan gedung',
  documentTypes: ['UU', 'Perda', 'Perwali'],
  city: 'Surabaya',
  province: 'Jawa Timur',
  searchPhrases: {
    national: 'Undang-Undang bangunan gedung',
    province: 'Peraturan Daerah Jawa Timur bangunan gedung',
    city: 'Peraturan Wali Kota Surabaya bangunan gedung',
  },
}

export function documentResult(fields: {
  title: string
  docType: string
  sourceUrl: string
  level: JurisdictionLevel
  credibility?: SourceCredibility
  excerpt?: string
  number?: string
  year?: number
}): DocumentResult {
  return {
    title: fields.title,
    sourceUrl: fields.sourceUrl,
    excerpt: fields.excerpt ?? 'Ringkasan fixture untuk kontrol metrik.',
    credibility: fields.credibility ?? 'official',
    jurisdictionLevel: fields.level,
    docType: fields.docType,
    number: fields.number ?? null,
    year: fields.year ?? null,
    alternateUrls: [],
  }
}

// Each level's searched URLs are the source URLs of its own results, so url-in-source traces every
// result. No model or search ran, so usage is empty.
export function foundFixture(
  levels: Partial<Record<JurisdictionLevel, DocumentResult[]>>,
): FindDocumentsEvalOutput {
  const buckets: Record<JurisdictionLevel, DocumentResult[]> = {
    national: levels.national ?? [],
    province: levels.province ?? [],
    city: levels.city ?? [],
  }
  const searched: FindDocumentsEvalOutput['searched'] = {}

  for (const level of LEVELS) searched[level] = buckets[level].map((result) => result.sourceUrl)

  return { status: 'found', levels: buckets, understanding, searched, usage: Usage.empty() }
}
