import { Usage } from '@anvia/core'
import type { DocumentResult, QueryUnderstanding } from '../types'
import type { FindDocumentsEvalOutput, IdentifiedDocumentResult } from './types'

// Literal outputs for the negative and positive controls. Each fixture is
// built so only the metric under test can fail: every other metric must pass.
// Control domains: jdih.surabaya.go.id is official, example.com is open web.

const surabayaPermit: QueryUnderstanding = {
  inScope: true,
  topic: 'izin mendirikan bangunan',
  documentTypes: ['Perwali'],
  city: 'Surabaya',
  province: 'Jawa Timur',
  searchPhrases: {
    national: 'Undang-Undang izin mendirikan bangunan',
    province: 'Peraturan Daerah Jawa Timur bangunan gedung',
    city: 'Peraturan Wali Kota Surabaya izin mendirikan bangunan',
  },
}

const malangPermit: QueryUnderstanding = {
  inScope: false,
  topic: 'izin mendirikan bangunan',
  documentTypes: [],
  city: 'Malang',
  province: 'Jawa Timur',
  searchPhrases: { national: '', province: '', city: '' },
}

const perwali12: DocumentResult = {
  title: 'Peraturan Wali Kota Surabaya Nomor 12 Tahun 2019 tentang Izin Mendirikan Bangunan',
  sourceUrl: 'https://jdih.surabaya.go.id/control/perwali-12-2019',
  excerpt: 'Peraturan Wali Kota Surabaya Nomor 12 Tahun 2019 mengatur izin mendirikan bangunan.',
  credibility: 'official',
  jurisdictionLevel: 'city',
  docType: 'Perwali',
}

const perwali12Copy: DocumentResult = {
  ...perwali12,
  sourceUrl: 'https://example.com/control/perwali-12-2019',
  credibility: 'open_web',
}

const perwali3: DocumentResult = {
  title: 'Peraturan Wali Kota Surabaya Nomor 3 Tahun 2021 tentang Izin Mendirikan Bangunan',
  sourceUrl: 'https://jdih.surabaya.go.id/control/perwali-3-2021',
  excerpt: 'Peraturan Wali Kota Surabaya Nomor 3 Tahun 2021 mengatur izin mendirikan bangunan.',
  credibility: 'official',
  jurisdictionLevel: 'city',
  docType: 'Perwali',
}

const undatedExcerpt = 'Pengaturan izin mendirikan bangunan di Kota Surabaya.'

// The number is fabricated: the excerpt shows 3 and the URL shows neither number.
const fabricatedNumber: IdentifiedDocumentResult = {
  ...perwali3,
  sourceUrl: 'https://jdih.surabaya.go.id/control/perwali-izin-bangunan',
  number: '12',
  year: '2021',
}

// The number and year are shown in the excerpt, but the title does not name them.
const titleOmitsNumber: IdentifiedDocumentResult = {
  ...perwali3,
  title: 'Peraturan Wali Kota Surabaya tentang Izin Mendirikan Bangunan',
  excerpt: 'Peraturan Wali Kota Surabaya Nomor 3 Tahun 2021 mengatur izin mendirikan bangunan.',
  number: '3',
  year: '2021',
}

// No number or year is set, so the result passes.
const numberUnset: DocumentResult = {
  ...perwali3,
  title: 'Izin Mendirikan Bangunan di Kota Surabaya',
  sourceUrl: 'https://jdih.surabaya.go.id/control/izin-bangunan',
  excerpt: undatedExcerpt,
}

const perwaliNumbered = (number: number): DocumentResult => ({
  title: `Peraturan Wali Kota Surabaya Nomor ${number} Tahun 2020 tentang Izin Mendirikan Bangunan`,
  sourceUrl: `https://jdih.surabaya.go.id/control/perwali-${number}-2020`,
  excerpt: `Peraturan Wali Kota Surabaya Nomor ${number} Tahun 2020 mengatur izin mendirikan bangunan.`,
  credibility: 'official',
  jurisdictionLevel: 'city',
  docType: 'Perwali',
})

const sixPerwali = [1, 2, 3, 4, 5, 6].map(perwaliNumbered)
const fivePerwali = sixPerwali.slice(0, 5)

export const controlOutputs: Record<string, FindDocumentsEvalOutput> = {
  'out-of-scope-rejected-negative': {
    status: 'found',
    levels: { national: [], province: [], city: [perwali12] },
    understanding: surabayaPermit,
    searched: { city: [perwali12.sourceUrl] },
    usage: Usage.empty(),
  },
  'out-of-scope-rejected-positive': {
    status: 'out_of_scope',
    reply:
      'Find Documents only covers Surabaya development and permit documents. Ask about a Surabaya Case, or use web search for other topics.',
    understanding: malangPermit,
    searched: {},
    usage: Usage.empty(),
  },
  'official-above-unofficial-negative': {
    status: 'found',
    levels: { national: [], province: [], city: [perwali12Copy, perwali12] },
    understanding: surabayaPermit,
    searched: { city: [perwali12Copy.sourceUrl, perwali12.sourceUrl] },
    usage: Usage.empty(),
  },
  'official-above-unofficial-positive': {
    status: 'found',
    levels: { national: [], province: [], city: [perwali12, perwali12Copy] },
    understanding: surabayaPermit,
    searched: { city: [perwali12.sourceUrl, perwali12Copy.sourceUrl] },
    usage: Usage.empty(),
  },
  'url-in-source-negative': {
    status: 'found',
    levels: { national: [], province: [], city: [perwali3] },
    understanding: surabayaPermit,
    searched: { city: ['https://jdih.surabaya.go.id/control/perwali-4-2021'] },
    usage: Usage.empty(),
  },
  'url-in-source-positive': {
    status: 'found',
    levels: { national: [], province: [], city: [perwali3] },
    understanding: surabayaPermit,
    searched: { city: [perwali3.sourceUrl] },
    usage: Usage.empty(),
  },
  'number-and-year-negative': {
    status: 'found',
    levels: { national: [], province: [], city: [fabricatedNumber] },
    understanding: surabayaPermit,
    searched: { city: [fabricatedNumber.sourceUrl] },
    usage: Usage.empty(),
  },
  'number-and-year-positive': {
    status: 'found',
    levels: { national: [], province: [], city: [titleOmitsNumber, numberUnset] },
    understanding: surabayaPermit,
    searched: { city: [titleOmitsNumber.sourceUrl, numberUnset.sourceUrl] },
    usage: Usage.empty(),
  },
  'max-five-per-level-negative': {
    status: 'found',
    levels: { national: [], province: [], city: sixPerwali },
    understanding: surabayaPermit,
    searched: { city: sixPerwali.map((result) => result.sourceUrl) },
    usage: Usage.empty(),
  },
  'max-five-per-level-positive': {
    status: 'found',
    levels: { national: [], province: [], city: fivePerwali },
    understanding: surabayaPermit,
    searched: { city: fivePerwali.map((result) => result.sourceUrl) },
    usage: Usage.empty(),
  },
}
