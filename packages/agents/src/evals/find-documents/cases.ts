import { createEvalTypes, type EvalCase, type EvalTraceRef } from '@anvia/core/evals'
import type { DocumentsResult } from '../../types'

export type Anchor = {
  type: 'UU' | 'PP' | 'Perda' | 'Perwali'
  number: string
  year: string
}

export type FindDocumentsExpected = {
  status: DocumentsResult['status']
  anchors?: Anchor[]
}

export type PdfProbe = { status: number; isPdf: boolean; bytes: number | null } | { error: string }

export type FindDocumentsRun = {
  error: string | null
  output: DocumentsResult | null
  found: string
  pdfs: Record<string, PdfProbe>
  trace?: EvalTraceRef
}

export const evalTypes = createEvalTypes<string, FindDocumentsRun, FindDocumentsExpected>()

export const cases: EvalCase<string, FindDocumentsExpected>[] = [
  {
    id: 'surabaya-pembangunan',
    input: 'dokumen terkait izin pembangunan di Surabaya',
    expected: {
      status: 'found',
      anchors: [
        { type: 'PP', number: '16', year: '2021' },
        { type: 'Perda', number: '3', year: '2025' },
      ],
    },
  },
  {
    id: 'surabaya-location',
    input: 'dokumen lokasi dan zonasi untuk membangun rumah di Surabaya',
    expected: {
      status: 'found',
      anchors: [
        { type: 'Perda', number: '3', year: '2025' },
        { type: 'Perda', number: '8', year: '2018' },
      ],
    },
  },
  {
    id: 'surabaya-generic',
    input: 'dokumen tata ruang Surabaya',
    expected: { status: 'found', anchors: [{ type: 'Perda', number: '3', year: '2025' }] },
  },
  {
    id: 'surabaya-specific',
    input: 'aturan garis sempadan bangunan di Perwali Surabaya 89 tahun 2024',
    expected: { status: 'found', anchors: [{ type: 'Perwali', number: '89', year: '2024' }] },
  },
  {
    id: 'province-owned',
    input: 'izin pembangunan gedung kantor milik Pemprov Jawa Timur di Surabaya',
    expected: { status: 'found' },
  },
  {
    id: 'english',
    input: 'building permit documents for Surabaya',
    expected: { status: 'found', anchors: [{ type: 'PP', number: '16', year: '2021' }] },
  },
  {
    id: 'slf',
    input: 'dokumen sertifikat laik fungsi bangunan di Surabaya',
    expected: { status: 'found', anchors: [{ type: 'Perwali', number: '14', year: '2018' }] },
  },
  {
    id: 'other-city',
    input: 'dokumen izin pembangunan di Sidoarjo',
    expected: { status: 'out_of_scope' },
  },
  {
    id: 'fictional',
    input: 'dokumen izin pembangunan di Gotham City',
    expected: { status: 'out_of_scope' },
  },
  {
    id: 'off-topic',
    input: 'resep nasi goreng',
    expected: { status: 'out_of_scope' },
  },
]
