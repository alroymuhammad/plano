import { defineEvalCases, defineEvalSuite, EvalOutcome } from '@anvia/core/evals'
import { findDocuments } from '../index'
import { LEVELS } from '../find-documents/source-map'
import type { DocumentResult, JurisdictionLevel } from '../types'
import { docType } from './metrics/doc-type'
import { level } from './metrics/level'
import { listingUrls } from './metrics/listing-urls'
import { noDeadDownloadLinks } from './metrics/no-dead-download-links'
import { numberYear } from './metrics/number-year'
import { region } from './metrics/region'
import { types } from './types'

const cases = defineEvalCases([
  {
    id: 'surabaya-permit',
    input: 'dokumen terkait izin pembangunan di Surabaya',
    expected: { status: 'found' },
  },
  {
    id: 'malang-out-of-scope',
    input: 'dokumen terkait izin pembangunan di Malang',
    expected: { status: 'out_of_scope' },
  },
  {
    id: 'off-topic-out-of-scope',
    input: 'resep rendang yang enak',
    expected: { status: 'out_of_scope' },
  },
])

const scope = types.defineMetric({
  name: 'scope',
  dataType: 'BOOLEAN',
  evaluate: ({ output, case: testCase }) => {
    if (output.status === testCase.expected?.status) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, {
      comment: `expected ${testCase.expected?.status}, got ${output.status}`,
    })
  },
})

function resultProblems(level: JurisdictionLevel, result: DocumentResult) {
  const problems: string[] = []
  const fields = ['title', 'sourceUrl', 'excerpt', 'credibility', 'docType'] as const

  for (const field of fields) {
    if (!result[field]) problems.push(`${level} result is missing ${field}`)
  }

  if (result.jurisdictionLevel !== level)
    problems.push(`${level} result is tagged ${result.jurisdictionLevel}`)

  return problems
}

const documents = types.defineMetric({
  name: 'documents',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    if (!LEVELS.some((level) => output.levels[level].length > 0))
      problems.push('no level has any Document Results')

    for (const level of LEVELS) {
      const results = output.levels[level]

      for (const result of results) problems.push(...resultProblems(level, result))
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

const understanding = types.defineMetric({
  name: 'understanding',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    const { understanding: read } = output
    const problems: string[] = []
    const emptyPhrases = LEVELS.filter((level) => read.searchPhrases[level].trim() === '')

    if (read.inScope !== (output.status === 'found'))
      problems.push('understanding inScope does not match the status')

    if (read.topic.trim() === '') problems.push('understanding has no topic')

    if (read.inScope && read.documentTypes.length === 0)
      problems.push('understanding has no documentTypes')

    if (read.inScope && emptyPhrases.length > 0)
      problems.push(`empty search phrases: ${emptyPhrases.join(', ')}`)

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

export const findDocumentsSuite = defineEvalSuite({
  name: 'find-documents',
  cases,
  target: (input) => findDocuments(input),
  metrics: [
    scope,
    documents,
    understanding,
    docType,
    numberYear,
    level,
    region,
    noDeadDownloadLinks,
    listingUrls,
  ],
})
