import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  runEvalCli,
} from '@anvia/core/evals'
import { controlOutputs } from './control-outputs'
import { credibility } from './metrics/credibility'
import { docType } from './metrics/doc-type'
import { level } from './metrics/level'
import { listingUrls } from './metrics/listing-urls'
import { maxFivePerLevel } from './metrics/max-five-per-level'
import { merge } from './metrics/merge'
import {
  noDeadDownloadLinksControl,
  noDeadDownloadLinksControlExpectations,
} from './metrics/no-dead-download-links'
import { numberAndYear } from './metrics/number-and-year'
import { numberYear } from './metrics/number-year'
import { officialAboveUnofficial } from './metrics/official-above-unofficial'
import { outOfScopeRejected } from './metrics/out-of-scope-rejected'
import { region } from './metrics/region'
import { urlInSource } from './metrics/url-in-source'

const malangQuery = 'dokumen terkait izin pembangunan di Malang'
const surabayaQuery = 'dokumen terkait izin pembangunan di Surabaya'

const inScope = <const Id extends string>(id: Id) => ({
  id,
  input: surabayaQuery,
  expected: { status: 'found' as const },
})

const outOfScope = <const Id extends string>(id: Id) => ({
  id,
  input: malangQuery,
  expected: { status: 'out_of_scope' as const },
})

// Negative controls must make their metric fail. Positive controls must pass.
// Undeclared metrics default to pass, so a metric that fails by accident shows up
// as a mismatch on every control it touches.
const cases = defineEvalCases([
  outOfScope('out-of-scope-rejected-negative'),
  outOfScope('out-of-scope-rejected-positive'),
  inScope('official-above-unofficial-negative'),
  inScope('official-above-unofficial-positive'),
  inScope('url-in-source-negative'),
  inScope('url-in-source-positive'),
  inScope('url-in-source-download-negative'),
  inScope('url-in-source-download-positive'),
  inScope('number-and-year-negative'),
  inScope('number-and-year-positive'),
  inScope('max-five-per-level-negative'),
  inScope('max-five-per-level-positive'),
  inScope('uu-number-from-url'),
  inScope('uu-number-from-excerpt'),
  inScope('uu-number-missing'),
  inScope('uu-year-wrong'),
  inScope('perda-number-from-url'),
  inScope('download-without-number'),
  inScope('slashed-number-from-excerpt'),
  inScope('slashed-number-taken-as-year'),
  inScope('slashed-number-without-tahun'),
  inScope('law-cited-first'),
  inScope('title-only-blank'),
  inScope('other-type-blank'),
  inScope('province-region-words'),
  inScope('cited-after-tentang'),
  inScope('perda-typed-as-other'),
  inScope('perda-typed-as-perda'),
  inScope('perwali-typed-as-pergub'),
  inScope('uu-typed-as-other'),
  inScope('excerpt-perwali-typed-perwali'),
  inScope('excerpt-perwali-typed-other'),
  inScope('excerpt-perwali-typed-pergub'),
  inScope('genuine-other-kept'),
  inScope('mostly-typed'),
  inScope('national-type-in-national'),
  inScope('kota-surabaya-in-national'),
  inScope('kota-surabaya-in-city'),
  inScope('provinsi-in-city'),
  inScope('province-from-url-path'),
  inScope('no-level-skipped'),
  inScope('uu-kept'),
  inScope('kota-surabaya-kept'),
  inScope('leftmost-surabaya-kept'),
  inScope('kabupaten-dropped'),
  inScope('provinsi-barat-dropped'),
  inScope('leftmost-other-region-dropped'),
  inScope('path-other-region-dropped'),
  inScope('no-region-dropped'),
  inScope('document-kept'),
  inScope('tahun-listing-dropped'),
  inScope('page-listing-dropped'),
  inScope('alternate-listing-dropped'),
  inScope('same-document-twice'),
  inScope('different-documents'),
  inScope('go-id-lookalike'),
  inScope('surabaya-go-id-subdomain'),
  inScope('uppercase-host'),
  inScope('not-a-url'),
  inScope('bare-go-id'),
  inScope('official-marked-open-web'),
  inScope('regression-4301-number-from-title'),
  inScope('regression-4232-number-from-title'),
  inScope('regression-4241-number-from-title'),
  inScope('regression-bpk-272069-number-from-title'),
  inScope('regression-ddtc-number-from-title'),
  inScope('regression-4301-reference-number'),
  inScope('regression-4232-amended-number'),
  inScope('regression-4241-blank'),
  inScope('regression-bpk-272069-amended-number'),
  inScope('regression-ddtc-reference-number'),
  inScope('excerpt-nomor-tahun-tentang'),
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
    credibility,
    docType,
    level,
    listingUrls,
    merge,
    numberYear,
    region,
  ],
})

const expectations = defineEvalExpectations(suite, {
  outcomes: {
    'out-of-scope-rejected-negative': { 'out-of-scope-rejected': 'fail' },
    'out-of-scope-rejected-positive': { 'out-of-scope-rejected': 'pass' },
    'official-above-unofficial-negative': { 'official-above-unofficial': 'fail', merge: 'fail' },
    'official-above-unofficial-positive': { 'official-above-unofficial': 'pass', merge: 'fail' },
    'url-in-source-negative': { 'url-in-source': 'fail' },
    'url-in-source-positive': { 'url-in-source': 'pass' },
    'url-in-source-download-negative': { 'url-in-source': 'fail' },
    'url-in-source-download-positive': { 'url-in-source': 'pass' },
    'number-and-year-negative': { 'number-and-year': 'fail', 'number-year': 'fail' },
    'number-and-year-positive': { 'number-and-year': 'pass', 'number-year': 'pass' },
    'max-five-per-level-negative': { 'max-five-per-level': 'fail' },
    'max-five-per-level-positive': { 'max-five-per-level': 'pass' },
    'uu-number-from-url': { 'number-year': 'pass' },
    'uu-number-from-excerpt': { 'number-year': 'fail' },
    'uu-number-missing': { 'number-year': 'fail' },
    'uu-year-wrong': { 'number-year': 'fail', 'number-and-year': 'fail' },
    'perda-number-from-url': { 'number-year': 'pass', region: 'fail' },
    'download-without-number': { 'number-year': 'pass' },
    'slashed-number-from-excerpt': { 'number-year': 'pass' },
    'slashed-number-taken-as-year': { 'number-year': 'fail' },
    'slashed-number-without-tahun': { 'number-year': 'pass' },
    'law-cited-first': { 'number-year': 'pass' },
    'title-only-blank': { 'number-year': 'pass' },
    'other-type-blank': { 'number-year': 'pass' },
    'province-region-words': { 'number-year': 'pass' },
    'cited-after-tentang': { 'number-year': 'pass' },
    'perda-typed-as-other': { 'doc-type': 'fail' },
    'perda-typed-as-perda': { 'doc-type': 'pass' },
    'perwali-typed-as-pergub': { 'doc-type': 'fail' },
    'uu-typed-as-other': { 'doc-type': 'fail' },
    'excerpt-perwali-typed-perwali': { 'doc-type': 'pass', 'number-year': 'pass' },
    'excerpt-perwali-typed-other': { 'doc-type': 'fail' },
    'excerpt-perwali-typed-pergub': { 'doc-type': 'fail' },
    'genuine-other-kept': { 'doc-type': 'pass' },
    'mostly-typed': { 'doc-type': 'pass' },
    'national-type-in-national': { level: 'pass' },
    'kota-surabaya-in-national': { level: 'fail' },
    'kota-surabaya-in-city': { level: 'pass' },
    'provinsi-in-city': { level: 'fail' },
    'province-from-url-path': { level: 'pass' },
    'no-level-skipped': { level: 'pass', region: 'fail' },
    'uu-kept': { region: 'pass' },
    'kota-surabaya-kept': { region: 'pass' },
    'leftmost-surabaya-kept': { region: 'pass' },
    'kabupaten-dropped': { region: 'fail' },
    'provinsi-barat-dropped': { region: 'fail' },
    'leftmost-other-region-dropped': { region: 'fail' },
    'path-other-region-dropped': { region: 'fail' },
    'no-region-dropped': { region: 'fail' },
    'document-kept': { 'listing-urls': 'pass' },
    'tahun-listing-dropped': { 'listing-urls': 'fail' },
    'page-listing-dropped': { 'listing-urls': 'fail' },
    'alternate-listing-dropped': { 'listing-urls': 'fail' },
    'same-document-twice': { merge: 'fail' },
    'different-documents': { merge: 'pass' },
    'go-id-lookalike': { credibility: 'pass' },
    'surabaya-go-id-subdomain': { credibility: 'pass' },
    'uppercase-host': { credibility: 'pass' },
    'not-a-url': { credibility: 'pass' },
    'bare-go-id': { credibility: 'pass' },
    'official-marked-open-web': { credibility: 'fail' },
    'regression-4301-number-from-title': { 'number-year': 'pass', 'number-and-year': 'pass' },
    'regression-4232-number-from-title': { 'number-year': 'pass', 'number-and-year': 'pass' },
    'regression-4241-number-from-title': { 'number-year': 'pass', 'number-and-year': 'pass' },
    'regression-bpk-272069-number-from-title': { 'number-year': 'pass', 'number-and-year': 'pass' },
    'regression-ddtc-number-from-title': { 'number-year': 'pass', 'number-and-year': 'pass' },
    'regression-4301-reference-number': { 'number-year': 'fail' },
    'regression-4232-amended-number': { 'number-year': 'fail' },
    'regression-4241-blank': { 'number-year': 'fail' },
    'regression-bpk-272069-amended-number': { 'number-year': 'fail' },
    'regression-ddtc-reference-number': { 'number-year': 'fail' },
    'excerpt-nomor-tahun-tentang': { 'number-year': 'pass' },
  },
})

await runEvalCli({ ...suite, expectations, exitCode: true })

// The dead-link controls fetch real URLs, so they need network access.
await runEvalCli({
  ...noDeadDownloadLinksControl,
  expectations: noDeadDownloadLinksControlExpectations,
  exitCode: true,
})
