import { EvalOutcome } from '@anvia/core/evals'
import { MAX_RULES } from '../../find-documents/instructions'
import type { DocumentsResult } from '../../types'
import { type ExpectedDocument, evalTypes } from './cases'

type Document = DocumentsResult['documents'][number]

const MAX_DOCUMENTS = 15
const MAX_DURATION_MS = 180_000
const MIN_PDF_BYTES = 20_000

const TYPE_NAMES: Record<ExpectedDocument['type'], string[]> = {
  UU: ['uu', 'undang-undang', 'undang undang'],
  PP: ['pp', 'peraturan pemerintah'],
  Perda: ['perda', 'peraturan daerah'],
  Perwali: ['perwali', 'peraturan wali kota', 'peraturan walikota'],
}

const REGION_NAMES: Partial<Record<Document['level'], string[]>> = {
  province: ['jawa timur', 'jatim'],
  city: ['surabaya'],
}

const documentText = (doc: Document) =>
  `${doc.title} ${doc.url ?? ''} ${doc.pdfUrl ?? ''}`.toLowerCase()

const typeOf = (text: string) => {
  let first: { type: ExpectedDocument['type']; index: number } | undefined

  for (const [type, names] of Object.entries(TYPE_NAMES) as [
    ExpectedDocument['type'],
    string[],
  ][]) {
    for (const name of names) {
      const index = text.search(new RegExp(`(^|[^a-z])${name}([^a-z]|$)`))

      if (index !== -1 && (!first || index < first.index)) first = { type, index }
    }
  }

  return first?.type
}

const numberOf = (text: string) => /\bno(?:mor)?\.?[\s-]*0*(\d+)/.exec(text)?.[1]

const yearOf = (text: string) => /tahun[\s-]*(\d{4})/.exec(text)?.[1]

const matches = (doc: Document, expected: ExpectedDocument) => {
  const text = documentText(doc)

  return (
    typeOf(text) === expected.type &&
    numberOf(text) === expected.number &&
    yearOf(text) === expected.year
  )
}

const result = (problems: string[]) =>
  problems.length === 0
    ? EvalOutcome.pass(true)
    : EvalOutcome.fail(false, { comment: problems.join('; ') })

const status = evalTypes.defineMetric({
  name: 'status',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output, case: testCase }) => {
    if (output.error) return EvalOutcome.fail(false, { comment: output.error })

    const expected = testCase.expected?.status
    const actual = output.output?.status

    return result(actual === expected ? [] : [`expected ${expected}, got ${actual}`])
  },
})

const expectedDocuments = evalTypes.defineMetric({
  name: 'expected-documents',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output, case: testCase }) => {
    const documents = output.output?.documents ?? []
    const missing = (testCase.expected?.documents ?? []).filter(
      (expected) => !documents.some((doc) => matches(doc, expected)),
    )

    return result(missing.map((d) => `missing ${d.type} ${d.number}/${d.year}`))
  },
})

const urlInSource = evalTypes.defineMetric({
  name: 'url-in-source',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    const found = new Set(output.found.match(/https?:\/\/\S+/g))
    const urls = (output.output?.documents ?? []).flatMap((doc) => [doc.url, doc.pdfUrl])
    const untraced = urls.filter((url): url is string => !!url && !found.has(url))

    return result(untraced.map((url) => `not in search results: ${url}`))
  },
})

const levelCoverage = evalTypes.defineMetric({
  name: 'level-coverage',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output, case: testCase }) => {
    if (output.output?.status !== 'found') return EvalOutcome.pass(true)

    const { levels, documents } = output.output
    const problems: string[] = []

    for (const level of ['national', 'province', 'city'] as const) {
      if (!levels.some((l) => l.level === level)) problems.push(`${level} level is missing`)
    }

    for (const level of levels) {
      if (level.needed && !documents.some((doc) => doc.level === level.level))
        problems.push(`needed ${level.level} level has no document`)

      if (!level.needed && level.reason.trim() === '')
        problems.push(`skipped ${level.level} level gives no reason`)
    }

    for (const skipped of testCase.expected?.skippedLevels ?? []) {
      if (levels.find((l) => l.level === skipped)?.needed !== false)
        problems.push(`${skipped} level should be skipped`)
    }

    return result(problems)
  },
})

const sameRegion = evalTypes.defineMetric({
  name: 'same-region',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    const outside = (output.output?.documents ?? []).filter((doc) => {
      const names = REGION_NAMES[doc.level]

      return names && !names.some((name) => documentText(doc).includes(name))
    })

    return result(outside.map((doc) => `${doc.level} document not from the region: ${doc.title}`))
  },
})

const noDuplicates = evalTypes.defineMetric({
  name: 'no-duplicates',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    const seen = new Set<string>()
    const duplicates: string[] = []

    for (const doc of output.output?.documents ?? []) {
      const text = documentText(doc)
      const number = numberOf(text)
      const year = yearOf(text)

      const type = typeOf(text)

      if (!type || !number || !year) continue

      const key = `${type} ${number}/${year}`

      if (seen.has(key)) duplicates.push(`duplicate ${key}`)

      seen.add(key)
    }

    return result(duplicates)
  },
})

const bounded = evalTypes.defineMetric({
  name: 'bounded',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    const problems: string[] = []
    const documents = output.output?.documents.length ?? 0

    if (output.queries.length > MAX_RULES) problems.push(`${output.queries.length} queries`)

    if (output.durationMs > MAX_DURATION_MS) problems.push(`took ${output.durationMs} ms`)

    if (documents > MAX_DOCUMENTS) problems.push(`${documents} documents`)

    return result(problems)
  },
})

const validFiles = evalTypes.defineMetric({
  name: 'valid-files',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output, case: testCase }) => {
    const problems: string[] = []

    for (const doc of output.output?.documents ?? []) {
      if (!doc.pdfUrl) {
        if (testCase.expected?.requireFiles) problems.push(`no file: ${doc.title}`)

        continue
      }

      const probe = output.pdfs[doc.pdfUrl]

      if (!probe || 'error' in probe) {
        problems.push(`file not reachable: ${doc.pdfUrl}`)
        continue
      }

      if (probe.status >= 400 || !probe.isPdf) problems.push(`not a PDF: ${doc.pdfUrl}`)
      else if (probe.bytes !== null && probe.bytes < MIN_PDF_BYTES)
        problems.push(`file too small to hold the rule: ${doc.pdfUrl}`)
    }

    return result(problems)
  },
})

export const deterministicMetrics = [
  status,
  expectedDocuments,
  urlInSource,
  levelCoverage,
  sameRegion,
  noDuplicates,
  bounded,
  validFiles,
]
