import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  runEvalCli,
} from '@anvia/core/evals'
import { controlOutputs } from './control-outputs'
import { maxFivePerLevel } from './metrics/max-five-per-level'
import {
  noDeadDownloadLinksControl,
  noDeadDownloadLinksControlExpectations,
} from './metrics/no-dead-download-links'
import { numberAndYear } from './metrics/number-and-year'
import { officialAboveUnofficial } from './metrics/official-above-unofficial'
import { outOfScopeRejected } from './metrics/out-of-scope-rejected'
import { urlInSource } from './metrics/url-in-source'

const malangQuery = 'dokumen terkait izin pembangunan di Malang'
const surabayaQuery = 'dokumen terkait izin pembangunan di Surabaya'

// Negative controls must make their metric fail. Positive controls must pass.
// Undeclared metrics default to pass, so a metric that fails by accident shows up
// as a mismatch on every control it touches.
const cases = defineEvalCases([
  {
    id: 'out-of-scope-rejected-negative',
    input: malangQuery,
    expected: { status: 'out_of_scope' },
  },
  {
    id: 'out-of-scope-rejected-positive',
    input: malangQuery,
    expected: { status: 'out_of_scope' },
  },
  { id: 'official-above-unofficial-negative', input: surabayaQuery, expected: { status: 'found' } },
  { id: 'official-above-unofficial-positive', input: surabayaQuery, expected: { status: 'found' } },
  { id: 'url-in-source-negative', input: surabayaQuery, expected: { status: 'found' } },
  { id: 'url-in-source-positive', input: surabayaQuery, expected: { status: 'found' } },
  {
    id: 'url-in-source-download-negative',
    input: surabayaQuery,
    expected: { status: 'found' },
  },
  {
    id: 'url-in-source-download-positive',
    input: surabayaQuery,
    expected: { status: 'found' },
  },
  { id: 'number-and-year-negative', input: surabayaQuery, expected: { status: 'found' } },
  { id: 'number-and-year-positive', input: surabayaQuery, expected: { status: 'found' } },
  { id: 'max-five-per-level-negative', input: surabayaQuery, expected: { status: 'found' } },
  { id: 'max-five-per-level-positive', input: surabayaQuery, expected: { status: 'found' } },
])

const suite = defineEvalSuite({
  name: 'find-documents-controls',
  cases,
  target: (_input, testCase) => {
    const output = controlOutputs[testCase.id]

    if (!output) throw new Error(`No control output for ${testCase.id}`)

    return output
  },
  metrics: [
    outOfScopeRejected,
    officialAboveUnofficial,
    urlInSource,
    numberAndYear,
    maxFivePerLevel,
  ],
})

const expectations = defineEvalExpectations(suite, {
  outcomes: {
    'out-of-scope-rejected-negative': { 'out-of-scope-rejected': 'fail' },
    'out-of-scope-rejected-positive': { 'out-of-scope-rejected': 'pass' },
    'official-above-unofficial-negative': { 'official-above-unofficial': 'fail' },
    'official-above-unofficial-positive': { 'official-above-unofficial': 'pass' },
    'url-in-source-negative': { 'url-in-source': 'fail' },
    'url-in-source-positive': { 'url-in-source': 'pass' },
    'url-in-source-download-negative': { 'url-in-source': 'fail' },
    'url-in-source-download-positive': { 'url-in-source': 'pass' },
    'number-and-year-negative': { 'number-and-year': 'fail' },
    'number-and-year-positive': { 'number-and-year': 'pass' },
    'max-five-per-level-negative': { 'max-five-per-level': 'fail' },
    'max-five-per-level-positive': { 'max-five-per-level': 'pass' },
  },
})

await runEvalCli({ ...suite, expectations, exitCode: true })

// The dead-link controls fetch real URLs, so they need network access.
await runEvalCli({
  ...noDeadDownloadLinksControl,
  expectations: noDeadDownloadLinksControlExpectations,
  exitCode: true,
})
