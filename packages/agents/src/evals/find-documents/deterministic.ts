import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentsResult } from '../../types'
import { type Anchor, evalTypes } from './cases'

type Document = DocumentsResult['documents'][number]

const MIN_PDF_BYTES = 20_000

const TYPE_NAMES: Record<Anchor['type'], string[]> = {
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
  let first: { type: Anchor['type']; index: number } | undefined

  for (const [type, names] of Object.entries(TYPE_NAMES) as [Anchor['type'], string[]][]) {
    for (const name of names) {
      const index = text.search(new RegExp(`(^|[^a-z])${name}([^a-z]|$)`))

      if (index !== -1 && (!first || index < first.index)) first = { type, index }
    }
  }

  return first?.type
}

const numberOf = (text: string) => /\bno(?:mor)?\.?[\s-]*0*(\d+)/.exec(text)?.[1]

const yearOf = (text: string) => /tahun[\s-]*(\d{4})/.exec(text)?.[1]

const matches = (doc: Document, anchor: Anchor) => {
  const text = documentText(doc)

  return (
    typeOf(text) === anchor.type && numberOf(text) === anchor.number && yearOf(text) === anchor.year
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

const anchors = evalTypes.defineMetric({
  name: 'anchors',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output, case: testCase }) => {
    const documents = output.output?.documents ?? []
    const missing = (testCase.expected?.anchors ?? []).filter(
      (anchor) => !documents.some((doc) => matches(doc, anchor)),
    )

    return result(missing.map((a) => `missing ${a.type} ${a.number}/${a.year}`))
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

const validFiles = evalTypes.defineMetric({
  name: 'valid-files',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    const problems: string[] = []

    for (const doc of output.output?.documents ?? []) {
      if (!doc.pdfUrl) {
        problems.push(`no file: ${doc.title}`)
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

export const deterministicMetrics = [status, anchors, urlInSource, sameRegion, validFiles]
