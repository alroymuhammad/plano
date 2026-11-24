import { Usage } from '@anvia/core'
import type { DocumentResult, QueryUnderstanding, SourceCredibility } from '../types'
import { documentResult, foundFixture } from './fixtures'
import type { FindDocumentsEvalOutput } from './types'

// Outputs for the negative and positive controls, keyed by case id. controls.ts declares every metric
// that fails on each output. Control domains: jdih.surabaya.go.id is official, example.com is open web.

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
  number: '12',
  year: 2019,
  alternateUrls: [],
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
  number: '3',
  year: 2021,
  alternateUrls: [],
}

const undatedExcerpt = 'Pengaturan izin mendirikan bangunan di Kota Surabaya.'

// The number is fabricated: the excerpt shows 3 and the URL shows neither number.
const fabricatedNumber: DocumentResult = {
  ...perwali3,
  sourceUrl: 'https://jdih.surabaya.go.id/control/perwali-izin-bangunan',
  number: '12',
  year: 2021,
}

// The title names no number. The excerpt and URL show 3 and 2021.
const titleOmitsNumber: DocumentResult = {
  ...perwali3,
  title: 'Peraturan Wali Kota Surabaya tentang Izin Mendirikan Bangunan',
}

// No number or year is set, so the result passes.
const numberUnset: DocumentResult = {
  ...perwali3,
  title: 'Izin Mendirikan Bangunan di Kota Surabaya',
  sourceUrl: 'https://jdih.surabaya.go.id/control/izin-bangunan',
  excerpt: undatedExcerpt,
  number: null,
  year: null,
}

const perwaliNumbered = (number: number): DocumentResult => ({
  title: `Peraturan Wali Kota Surabaya Nomor ${number} Tahun 2020 tentang Izin Mendirikan Bangunan`,
  sourceUrl: `https://jdih.surabaya.go.id/control/perwali-${number}-2020`,
  excerpt: `Peraturan Wali Kota Surabaya Nomor ${number} Tahun 2020 mengatur izin mendirikan bangunan.`,
  credibility: 'official',
  jurisdictionLevel: 'city',
  docType: 'Perwali',
  number: String(number),
  year: 2020,
  alternateUrls: [],
})

const sixPerwali = [1, 2, 3, 4, 5, 6].map(perwaliNumbered)
const fivePerwali = sixPerwali.slice(0, 5)

// The download URL is a PDF that no search returned, and the excerpt does not name it.
const unsearchedDownload: DocumentResult = {
  ...perwali3,
  downloadUrl: 'https://jdih.surabaya.go.id/control/perwali-3-2021.pdf',
}

// The download URL came from a province search. A merged copy can carry it into the city level.
const provinceDownloadUrl = 'https://jdih.jatimprov.go.id/control/perda-izin-bangunan-2021.pdf'
const provinceDownload: DocumentResult = { ...perwali3, downloadUrl: provinceDownloadUrl }

const permitControls: Record<string, FindDocumentsEvalOutput> = {
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
  'url-in-source-download-negative': {
    status: 'found',
    levels: { national: [], province: [], city: [unsearchedDownload] },
    understanding: surabayaPermit,
    searched: { city: [perwali3.sourceUrl] },
    usage: Usage.empty(),
  },
  'url-in-source-download-positive': {
    status: 'found',
    levels: { national: [], province: [], city: [provinceDownload] },
    understanding: surabayaPermit,
    searched: { city: [perwali3.sourceUrl], province: [provinceDownloadUrl] },
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

const UU_TITLE = 'UU No. 28 Tahun 2002 tentang Bangunan Gedung'
const UU_URL = 'https://peraturan.go.id/id/uu-no-28-tahun-2002'
const PERDA_URL =
  'https://peraturan.bpk.go.id/Download/76536/PERDA%203-2017%20PENJELASAN%20BANGUNAN%20GEDUNG.pdf'
const PERDA_TITLE = 'PERDA KOTA SURABAYA 3-2017 PENJELASAN BANGUNAN GEDUNG.pdf'
const NO_REGION_TITLE = 'PERDA 3-2017 PENJELASAN BANGUNAN GEDUNG.pdf'
const DOWNLOAD_TITLE = 'WALI KOTA SURABAYA PROVINSI JAWA TIMUR'
const DOWNLOAD_URL = 'https://jdih.surabaya.go.id/peraturan/download/4576'
const PERMEN_TITLE =
  'Peraturan Menteri PUPR No. 19/PRT/M/2018 Tahun 2018 tentang Pedoman Bangunan Gedung'
const PERMEN_URL = 'https://peraturan.go.id/id/permen-pupr-19-prt-m-2018'
const KOTA_TITLE = 'Peraturan Daerah Kota Surabaya Nomor 7 Tahun 2010 tentang Bangunan Gedung'
const KOTA_URL = 'https://peraturan.bpk.go.id/Download/50123/PERDA%20KOTA%20SURABAYA%207%202010.pdf'
const PROVINSI_TITLE = 'Peraturan Daerah Provinsi Jawa Timur Nomor 2 Tahun 2014 tentang Retribusi'
const PROVINSI_URL =
  'https://peraturan.bpk.go.id/Download/50124/PERDA%20PROVINSI%20JAWA%20TIMUR%202%202014.pdf'
const JATIM_URL =
  'https://jdih.jatimprov.go.id/peraturan/peraturan-gubernur/sewa-tanah-dan-bangunan-gedung-milik-propinsi-jawa-timur'
const PERWALI_TITLE =
  'Peraturan Walikota Surabaya PERWALI Nomor 89 Tahun 2024 tentang Pedoman Teknis'
const PERWALI_URL = 'https://jdih.surabaya.go.id/peraturan/perwali-89-2024'
const KEPUTUSAN_TITLE = 'Keputusan Sekretaris Daerah Provinsi Jawa Timur selaku pengelola barang'
const KEPUTUSAN_URL = 'https://jdih.jatimprov.go.id/peraturan/keputusan-sekretaris-daerah/contoh'

// A credibility control is one Perwali result at the given URL, labelled with the credibility to check.
function credibilityFixture(sourceUrl: string, label: SourceCredibility) {
  return foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl,
        level: 'city',
        credibility: label,
      }),
    ],
  })
}

const metricControls: Record<string, FindDocumentsEvalOutput> = {
  'uu-number-from-url': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2002,
      }),
    ],
  }),
  'uu-number-from-excerpt': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        excerpt: 'Mencabut Peraturan Walikota Nomor 13 Tahun 2018',
        number: '13',
        year: 2018,
      }),
    ],
  }),
  'uu-number-missing': foundFixture({
    national: [
      documentResult({ title: UU_TITLE, docType: 'UU', sourceUrl: UU_URL, level: 'national' }),
    ],
  }),
  'uu-year-wrong': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2018,
      }),
    ],
  }),
  'perda-number-from-url': foundFixture({
    city: [
      documentResult({
        title: 'Penjelasan Bangunan Gedung',
        docType: 'Other',
        sourceUrl: PERDA_URL,
        level: 'city',
        number: '3',
        year: 2017,
      }),
    ],
  }),
  'download-without-number': foundFixture({
    city: [
      documentResult({
        title: DOWNLOAD_TITLE,
        docType: 'Other',
        sourceUrl: DOWNLOAD_URL,
        level: 'city',
      }),
    ],
  }),
  'slashed-number-from-excerpt': foundFixture({
    national: [
      documentResult({
        title: PERMEN_TITLE,
        docType: 'Permen',
        sourceUrl: PERMEN_URL,
        level: 'national',
        excerpt: 'Peraturan Menteri PUPR Nomor 19/PRT/M/2018 Tahun 2018 mengatur bangunan gedung.',
        number: '19/PRT/M/2018',
        year: 2018,
      }),
    ],
  }),
  'slashed-number-taken-as-year': foundFixture({
    national: [
      documentResult({
        title: PERMEN_TITLE,
        docType: 'Permen',
        sourceUrl: PERMEN_URL,
        level: 'national',
        excerpt: 'Peraturan Menteri PUPR Nomor 19/PRT/M/2018 Tahun 2018 mengatur bangunan gedung.',
        number: '2018',
        year: 2018,
      }),
    ],
  }),
  'slashed-number-without-tahun': foundFixture({
    national: [
      documentResult({
        title: 'Peraturan Menteri PUPR No. 14/PRT/M/2017 tentang Persyaratan Teknis',
        docType: 'Permen',
        sourceUrl: 'https://peraturan.go.id/id/permen-pupr-14-prt-m-2017',
        level: 'national',
        excerpt: 'Peraturan Menteri PUPR No. 14/PRT/M/2017 tentang Persyaratan Teknis.',
        number: '14/PRT/M/2017',
        year: 2017,
      }),
    ],
  }),
  'law-cited-first': foundFixture({
    national: [
      documentResult({
        title: 'Peraturan Pemerintah tentang Bangunan Gedung',
        docType: 'PP',
        sourceUrl: 'https://peraturan.go.id/id/bangunan-gedung',
        level: 'national',
        excerpt:
          'Berdasarkan Undang-Undang Nomor 28 Tahun 2002, Peraturan Pemerintah Nomor 16 Tahun 2021 mengatur bangunan gedung.',
        number: '16',
        year: 2021,
      }),
    ],
  }),
  'title-only-blank': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: 'https://peraturan.go.id/id/bangunan-gedung',
        level: 'national',
      }),
    ],
  }),
  'other-type-blank': foundFixture({
    city: [
      documentResult({
        title: 'Keputusan Wali Kota Surabaya Nomor 5 Tahun 2019 tentang Bangunan Gedung',
        docType: 'Other',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/4301',
        level: 'city',
      }),
    ],
  }),
  'province-region-words': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Provinsi Jawa Timur tentang Bangunan Gedung',
        docType: 'Perda',
        sourceUrl: 'https://jdih.jatimprov.go.id/peraturan/bangunan-gedung',
        level: 'province',
        excerpt:
          'Peraturan Daerah Provinsi Jawa Timur Nomor 5 Tahun 2019 mengatur bangunan gedung.',
        number: '5',
        year: 2019,
      }),
    ],
  }),
  'cited-after-tentang': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Provinsi Jawa Timur tentang Bangunan Gedung',
        docType: 'Perda',
        sourceUrl: 'https://jdih.jatimprov.go.id/peraturan/bangunan-gedung',
        level: 'province',
        excerpt:
          'Peraturan Daerah tentang Pajak Daerah Nomor 5 Tahun 2011 mengatur bangunan gedung.',
      }),
    ],
  }),
  'perda-typed-as-other': foundFixture({
    city: [
      documentResult({
        title: PERDA_TITLE,
        docType: 'Other',
        sourceUrl: PERDA_URL,
        level: 'city',
        number: '3',
        year: 2017,
      }),
    ],
  }),
  'perda-typed-as-perda': foundFixture({
    city: [
      documentResult({
        title: PERDA_TITLE,
        docType: 'Perda',
        sourceUrl: PERDA_URL,
        level: 'city',
        number: '3',
        year: 2017,
      }),
    ],
  }),
  'perwali-typed-as-pergub': foundFixture({
    city: [
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Pergub',
        sourceUrl: PERWALI_URL,
        level: 'city',
        number: '89',
        year: 2024,
      }),
    ],
  }),
  'uu-typed-as-other': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'Other',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2002,
      }),
    ],
    city: [
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Perwali',
        sourceUrl: PERWALI_URL,
        level: 'city',
        number: '89',
        year: 2024,
      }),
    ],
  }),
  'mostly-other': foundFixture({
    city: [
      documentResult({
        title: DOWNLOAD_TITLE,
        docType: 'Other',
        sourceUrl: DOWNLOAD_URL,
        level: 'city',
      }),
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Perwali',
        sourceUrl: PERWALI_URL,
        level: 'city',
        number: '89',
        year: 2024,
      }),
    ],
    province: [
      documentResult({
        title: KEPUTUSAN_TITLE,
        docType: 'Other',
        sourceUrl: KEPUTUSAN_URL,
        level: 'province',
      }),
    ],
  }),
  'mostly-typed': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2002,
      }),
    ],
    city: [
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Perwali',
        sourceUrl: PERWALI_URL,
        level: 'city',
        number: '89',
        year: 2024,
      }),
      documentResult({
        title: DOWNLOAD_TITLE,
        docType: 'Other',
        sourceUrl: DOWNLOAD_URL,
        level: 'city',
      }),
    ],
  }),
  'national-type-in-national': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2002,
      }),
    ],
  }),
  'kota-surabaya-in-national': foundFixture({
    national: [
      documentResult({
        title: KOTA_TITLE,
        docType: 'Perda',
        sourceUrl: KOTA_URL,
        level: 'national',
        number: '7',
        year: 2010,
      }),
    ],
  }),
  'kota-surabaya-in-city': foundFixture({
    city: [
      documentResult({
        title: KOTA_TITLE,
        docType: 'Perda',
        sourceUrl: KOTA_URL,
        level: 'city',
        number: '7',
        year: 2010,
      }),
    ],
  }),
  'provinsi-in-city': foundFixture({
    city: [
      documentResult({
        title: PROVINSI_TITLE,
        docType: 'Perda',
        sourceUrl: PROVINSI_URL,
        level: 'city',
        number: '2',
        year: 2014,
      }),
    ],
  }),
  'province-from-url-path': foundFixture({
    province: [
      documentResult({
        title: 'SEWA TANAH DAN BANGUNAN GEDUNG ...',
        docType: 'Other',
        sourceUrl: JATIM_URL,
        level: 'province',
      }),
    ],
  }),
  'no-level-skipped': foundFixture({
    national: [
      documentResult({
        title: NO_REGION_TITLE,
        docType: 'Perda',
        sourceUrl: PERDA_URL,
        level: 'national',
        number: '3',
        year: 2017,
      }),
    ],
  }),
  'uu-kept': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2002,
      }),
    ],
  }),
  'kota-surabaya-kept': foundFixture({
    city: [
      documentResult({
        title: KOTA_TITLE,
        docType: 'Perda',
        sourceUrl: KOTA_URL,
        level: 'city',
        number: '7',
        year: 2010,
      }),
    ],
  }),
  'leftmost-surabaya-kept': foundFixture({
    city: [
      documentResult({
        title: DOWNLOAD_TITLE,
        docType: 'Other',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/4576',
        level: 'city',
      }),
    ],
  }),
  'kabupaten-dropped': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Daerah Kabupaten Sidoarjo Nomor 2 Tahun 2019 tentang Bangunan Gedung',
        docType: 'Perda',
        sourceUrl:
          'https://peraturan.bpk.go.id/Download/50125/PERDA%20KABUPATEN%20SIDOARJO%202%202019.pdf',
        level: 'city',
        number: '2',
        year: 2019,
      }),
    ],
  }),
  'provinsi-barat-dropped': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Provinsi Jawa Barat Nomor 1 Tahun 2020 tentang Bangunan Gedung',
        docType: 'Perda',
        sourceUrl:
          'https://peraturan.bpk.go.id/Download/50126/PERDA%20PROVINSI%20JAWA%20BARAT%201%202020.pdf',
        level: 'province',
        number: '1',
        year: 2020,
      }),
    ],
  }),
  'leftmost-other-region-dropped': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Kabupaten Malang tentang Kerja Sama dengan Provinsi Jawa Timur',
        docType: 'Perda',
        sourceUrl: 'https://peraturan.bpk.go.id/Download/50127/PERDA%20KABUPATEN%20MALANG.pdf',
        level: 'province',
      }),
    ],
  }),
  'path-other-region-dropped': foundFixture({
    city: [
      documentResult({
        title: 'PERATURAN DAERAH',
        docType: 'Perda',
        sourceUrl:
          'https://peraturan.bpk.go.id/Download/50128/PERDA%20KABUPATEN%20SIDOARJO%202010.pdf',
        level: 'city',
      }),
    ],
  }),
  'no-region-dropped': foundFixture({
    national: [
      documentResult({
        title: NO_REGION_TITLE,
        docType: 'Perda',
        sourceUrl: PERDA_URL,
        level: 'national',
        number: '3',
        year: 2017,
      }),
    ],
  }),
  'document-kept': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 33 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/perwali-33-2023',
        level: 'city',
        number: '33',
        year: 2023,
      }),
    ],
  }),
  'tahun-listing-dropped': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Provinsi Jawa Timur',
        docType: 'Perda',
        sourceUrl: 'https://jdih.jatimprov.go.id/peraturan/peraturan-daerah?tahun=2023',
        level: 'province',
      }),
    ],
  }),
  'page-listing-dropped': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan?kategori=perwali&page=2',
        level: 'city',
      }),
    ],
  }),
  'alternate-listing-dropped': foundFixture({
    national: [
      {
        ...documentResult({
          title: UU_TITLE,
          docType: 'UU',
          sourceUrl: UU_URL,
          level: 'national',
          number: '28',
          year: 2002,
        }),
        alternateUrls: ['https://jdihn.go.id/search?tahun=2002'],
      },
    ],
  }),
  'same-document-twice': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 118 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/perwali-118-2023',
        level: 'city',
        number: '118',
        year: 2023,
      }),
      documentResult({
        title: 'Peraturan Walikota Surabaya No. 118 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://example.com/perwali-118-2023',
        level: 'city',
        credibility: 'open_web',
        number: '118',
        year: 2023,
      }),
    ],
  }),
  'different-documents': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 118 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/perwali-118-2023',
        level: 'city',
        number: '118',
        year: 2023,
      }),
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 33 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/perwali-33-2023',
        level: 'city',
        number: '33',
        year: 2023,
      }),
    ],
  }),
  'go-id-lookalike': credibilityFixture('https://go.id.example.com/peraturan/118', 'open_web'),
  'surabaya-go-id-subdomain': credibilityFixture(
    'https://xjdih.surabaya.go.id/peraturan/118',
    'government',
  ),
  'uppercase-host': credibilityFixture('https://JDIH.SURABAYA.GO.ID/peraturan/4301', 'official'),
  'not-a-url': credibilityFixture('not a url', 'open_web'),
  'bare-go-id': credibilityFixture('https://surabaya.go.id/peraturan/118', 'government'),
  'official-marked-open-web': credibilityFixture(
    'https://jdih.surabaya.go.id/peraturan/4301',
    'open_web',
  ),
}

export const controlOutputs: Record<string, FindDocumentsEvalOutput> = {
  ...permitControls,
  ...metricControls,
}
