import { createEvalTypes, type EvalCase } from '@anvia/core/evals'
import type { DocumentsResult, RulePlan } from '../../types'

type Level = DocumentsResult['levels'][number]['level']

export type ExpectedDocument = {
  type: 'UU' | 'PP' | 'Perda' | 'Perwali'
  number: string
  year: string
}

export type FindDocumentsExpected = {
  status: DocumentsResult['status']
  documents?: ExpectedDocument[]
  skippedLevels?: Level[]
  requireFiles?: boolean
}

export type PdfProbe = { status: number; isPdf: boolean; bytes: number | null } | { error: string }

export type Recording = {
  caseId: string
  prompt: string
  recordedAt: string
  durationMs: number
  error: string | null
  output: DocumentsResult | null
  plan: RulePlan | null
  queries: string[]
  found: string
  pdfs: Record<string, PdfProbe>
}

export const recordingsDir = new URL('./recordings/', import.meta.url)

export const evalTypes = createEvalTypes<string, Recording, FindDocumentsExpected>()

const surabayaPermit: ExpectedDocument[] = [
  { type: 'UU', number: '28', year: '2002' },
  { type: 'PP', number: '16', year: '2021' },
  { type: 'Perwali', number: '89', year: '2024' },
  { type: 'Perwali', number: '66', year: '2025' },
  { type: 'Perwali', number: '14', year: '2018' },
  { type: 'Perda', number: '3', year: '2025' },
  { type: 'Perda', number: '8', year: '2018' },
]

export const cases: EvalCase<string, FindDocumentsExpected>[] = [
  {
    id: 'surabaya-pbg',
    input: 'dokumen terkait izin pembangunan di Surabaya',
    expected: { status: 'found', documents: surabayaPermit, skippedLevels: ['province'] },
  },
  {
    id: 'surabaya-location',
    input: 'dokumen lokasi dan zonasi untuk membangun rumah di Surabaya',
    expected: {
      status: 'found',
      documents: [
        { type: 'Perda', number: '3', year: '2025' },
        { type: 'Perda', number: '8', year: '2018' },
      ],
      requireFiles: true,
    },
  },
  {
    id: 'surabaya-generic',
    input: 'dokumen tata ruang Surabaya',
    expected: { status: 'found', documents: [{ type: 'Perda', number: '3', year: '2025' }] },
  },
  {
    id: 'surabaya-specific',
    input: 'aturan garis sempadan bangunan di Perwali Surabaya 89 tahun 2024',
    expected: { status: 'found', documents: [{ type: 'Perwali', number: '89', year: '2024' }] },
  },
  {
    id: 'province-owned',
    input: 'izin pembangunan gedung kantor milik Pemprov Jawa Timur di Surabaya',
    expected: { status: 'found' },
  },
  {
    id: 'english',
    input: 'building permit documents for Surabaya',
    expected: { status: 'found', documents: surabayaPermit.slice(0, 3) },
  },
  {
    id: 'slf',
    input: 'dokumen sertifikat laik fungsi bangunan di Surabaya',
    expected: { status: 'found', documents: [{ type: 'Perwali', number: '14', year: '2018' }] },
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
