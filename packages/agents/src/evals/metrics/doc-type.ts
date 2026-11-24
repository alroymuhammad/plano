import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

// The literal spec table, kept apart from source-map.ts: a title that starts with one of these phrases names that type.
const LEADING_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ['undang undang', 'UU'],
  ['uu', 'UU'],
  ['peraturan pemerintah', 'PP'],
  ['pp', 'PP'],
  ['peraturan presiden', 'Perpres'],
  ['perpres', 'Perpres'],
  ['peraturan menteri', 'Permen'],
  ['permen', 'Permen'],
  ['peraturan daerah', 'Perda'],
  ['perda', 'Perda'],
  ['peraturan wali kota', 'Perwali'],
  ['peraturan walikota', 'Perwali'],
  ['perwali', 'Perwali'],
  ['peraturan gubernur', 'Pergub'],
  ['pergub', 'Pergub'],
]

function normalise(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function expectedDocType(title: string) {
  const words = normalise(title)
  const match = LEADING_PHRASES.find(
    ([phrase]) => words === phrase || words.startsWith(`${phrase} `),
  )

  return match?.[1]
}

export const docType = evalTypes.defineMetric({
  name: 'doc-type',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const results = Object.values(output.levels).flat()
    const typed = results.filter((result) => result.docType !== 'Other')
    const problems: string[] = []

    for (const result of results) {
      const expected = expectedDocType(result.title)

      if (expected && result.docType !== expected)
        problems.push(`"${result.title}" should be ${expected}, got ${result.docType}`)
    }

    if (typed.length * 2 < results.length)
      problems.push(`only ${typed.length} of ${results.length} results have a document type`)

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
