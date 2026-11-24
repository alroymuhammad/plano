// Synthetic Document Results for the negative controls. Titles and URLs are modelled
// on the baseline runs. Metrics that fall back to the URL path read the URLs.
import type {
  DocumentResult,
  DocumentsResult,
  JurisdictionLevel,
  QueryUnderstanding,
  SourceCredibility,
} from '../types'

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

export function foundFixture(
  levels: Partial<Record<JurisdictionLevel, DocumentResult[]>>,
): DocumentsResult {
  return {
    status: 'found',
    levels: {
      national: levels.national ?? [],
      province: levels.province ?? [],
      city: levels.city ?? [],
    },
    understanding,
  }
}
