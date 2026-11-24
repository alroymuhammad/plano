import { EvalOutcome } from '@anvia/core/evals'
import type { SourceCredibility } from '../../types'
import { evalTypes } from '../types'

// The spec for a source's credibility. It copies the host rule rather than importing it, so the metric
// checks the output and not the code. A host is official when it is one of the official portals or a
// subdomain of one. Any other .go.id host is government. Every other URL, and any text that is not a
// URL, is open web.
const OFFICIAL_HOSTS = [
  'peraturan.go.id',
  'peraturan.bpk.go.id',
  'jdihn.go.id',
  'jdih.atrbpn.go.id',
  'jdih.jatimprov.go.id',
  'jdih.surabaya.go.id',
]

function credibilityOf(url: string): SourceCredibility {
  let host: string

  try {
    host = new URL(url).hostname
  } catch {
    return 'open_web'
  }

  if (OFFICIAL_HOSTS.some((official) => host === official || host.endsWith(`.${official}`)))
    return 'official'

  if (host.endsWith('.go.id')) return 'government'

  return 'open_web'
}

export const credibility = evalTypes.defineMetric({
  name: 'credibility',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const expected = credibilityOf(result.sourceUrl)

      if (result.credibility !== expected)
        problems.push(`"${result.title}" is ${result.credibility}, expected ${expected}`)
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
