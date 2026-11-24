import type { JurisdictionLevel, SourceCredibility } from '../types'

export const LEVELS: JurisdictionLevel[] = ['national', 'province', 'city']

export const SOURCE_DOMAINS: Record<JurisdictionLevel, string[]> = {
  national: ['peraturan.go.id', 'peraturan.bpk.go.id', 'jdihn.go.id', 'jdih.atrbpn.go.id'],
  province: ['jdih.jatimprov.go.id'],
  city: ['jdih.surabaya.go.id'],
}

export function credibilityOf(url: string): SourceCredibility {
  let host: string

  try {
    host = new URL(url).hostname
  } catch {
    return 'open_web'
  }

  const officialDomains = Object.values(SOURCE_DOMAINS).flat()

  if (officialDomains.some((domain) => host === domain || host.endsWith(`.${domain}`)))
    return 'official'

  if (host.endsWith('.go.id')) return 'government'

  return 'open_web'
}

const DOC_TYPES: Array<[RegExp, string]> = [
  [/^(undang undang|uu)\b/, 'UU'],
  [/^(peraturan pemerintah|pp)\b/, 'PP'],
  [/^(peraturan presiden|perpres)\b/, 'Perpres'],
  [/^(peraturan menteri|permen)\b/, 'Permen'],
  [/^(peraturan daerah|perda)\b/, 'Perda'],
  [/^(peraturan wali ?kota|perwali)\b/, 'Perwali'],
  [/^(peraturan gubernur|pergub)\b/, 'Pergub'],
]

export function docTypeOf(title: string) {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const match = DOC_TYPES.find(([pattern]) => pattern.test(words))

  return match?.[1] ?? 'Other'
}

// The first "number year" pair in the title names the document. When the title has none, the
// decoded URL path is the fallback. The excerpt is never read, because it can cite other documents.
const NUMBER_YEAR = /\b(\d+) (?:tahun |th )?(\d{4})\b/

function numberYearIn(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const match = NUMBER_YEAR.exec(words)

  if (!match) return null

  return { number: match[1], year: Number(match[2]) }
}

function decodedPath(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname)
  } catch {
    return ''
  }
}

export function numberYearOf(
  title: string,
  url: string,
): { number: string | null; year: number | null } {
  return numberYearIn(title) ?? numberYearIn(decodedPath(url)) ?? { number: null, year: null }
}

const NATIONAL_DOC_TYPES = ['UU', 'PP', 'Perpres', 'Permen']

// Kota Surabaya is city and Provinsi Jawa Timur is province. Any other region comes back as other.
const REGION =
  /\b(?:((?:wali ?kota|kota) surabaya)|((?:provinsi|propinsi|gubernur) jawa timur)|kabupaten|kota|provinsi|propinsi)\b/

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function regionIn(text: string): JurisdictionLevel | 'other' | null {
  const match = REGION.exec(normalise(text))

  if (!match) return null

  if (match[1]) return 'city'

  if (match[2]) return 'province'

  return 'other'
}

// The issuer sets the level, never the host. A national type is national. Otherwise the first
// region phrase in the title decides, then the decoded URL path. Any other region has no level.
export function levelOf(title: string, url: string): JurisdictionLevel | null {
  if (NATIONAL_DOC_TYPES.includes(docTypeOf(title))) return 'national'

  const region = regionIn(title) ?? regionIn(decodedPath(url))

  if (region === 'city' || region === 'province') return region

  return null
}
