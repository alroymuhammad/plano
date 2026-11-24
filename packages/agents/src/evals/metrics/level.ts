import { EvalOutcome } from '@anvia/core/evals'
import type { JurisdictionLevel } from '../../types'
import { evalTypes } from '../types'

// The spec for a level, kept apart from source-map.ts. A national type (UU, PP, Perpres, Permen) is
// national. The type is the title's, else the excerpt's, as typeOf reads it. Otherwise the first
// region phrase in the title decides, then the decoded URL path. Kota Surabaya is city and Provinsi
// Jawa Timur is province. Any other region, or none, has no level.
const NATIONAL_TYPES = [
  /^(undang undang|uu)\b/,
  /^(peraturan pemerintah|pp)\b/,
  /^(peraturan presiden|perpres)\b/,
  /^(peraturan menteri|permen)\b/,
]
const LOCAL_TYPES = [
  /^(peraturan daerah|perda)\b/,
  /^(peraturan wali ?kota|perwali)\b/,
  /^(peraturan gubernur|pergub)\b/,
]
const REGION =
  /\b(?:((?:wali ?kota|kota) surabaya)|((?:provinsi|propinsi|gubernur) jawa timur)|kabupaten|kota|provinsi|propinsi)\b/

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function pathOf(sourceUrl: string) {
  try {
    return decodeURIComponent(new URL(sourceUrl).pathname)
  } catch {
    return ''
  }
}

function regionIn(text: string): JurisdictionLevel | 'other' | null {
  const match = REGION.exec(normalise(text))

  if (!match) return null

  if (match[1]) return 'city'

  if (match[2]) return 'province'

  return 'other'
}

// The type a text opens with, as typeOf reads it: national, local, or none.
function typeNamedBy(text: string) {
  const normalised = normalise(text)

  if (NATIONAL_TYPES.some((pattern) => pattern.test(normalised))) return 'national'

  if (LOCAL_TYPES.some((pattern) => pattern.test(normalised))) return 'local'

  return null
}

export function expectedLevel(
  title: string,
  excerpt: string,
  sourceUrl: string,
): JurisdictionLevel | null {
  if ((typeNamedBy(title) ?? typeNamedBy(excerpt)) === 'national') return 'national'

  const region = regionIn(title) ?? regionIn(pathOf(sourceUrl))

  if (region === 'city' || region === 'province') return region

  return null
}

export const level = evalTypes.defineMetric({
  name: 'level',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const [bucket, results] of Object.entries(output.levels)) {
      for (const result of results) {
        const expected = expectedLevel(result.title, result.excerpt, result.sourceUrl)

        // A result with no level is a region problem, which the region metric reports.
        if (expected !== null && expected !== bucket)
          problems.push(`"${result.title}" should be ${expected} but is under ${bucket}`)
      }
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
