import type { JurisdictionLevel, SourceCredibility } from '../types'

export const LEVELS: JurisdictionLevel[] = ['national', 'province', 'city']

export const SOURCE_DOMAINS: Record<JurisdictionLevel, string[]> = {
  national: ['peraturan.go.id', 'peraturan.bpk.go.id', 'jdihn.go.id', 'jdih.atrbpn.go.id'],
  province: ['jdih.jatimprov.go.id'],
  city: ['jdih.surabaya.go.id'],
}

// Words that a level's search phrase leaves out. The Jawa Timur index returns nothing for "izin"
// or "perizinan", so the province phrase drops them.
export const PHRASE_OMISSIONS: Partial<Record<JurisdictionLevel, RegExp>> = {
  province: /\b(izin|perizinan)\b/gi,
}

export function searchPhraseOf(level: JurisdictionLevel, phrase: string) {
  const omitted = PHRASE_OMISSIONS[level]

  if (!omitted) return phrase

  return phrase.replace(omitted, ' ').replace(/\s+/g, ' ').trim()
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

// The title's type phrase gives the type. Without one, a type phrase at the start of the excerpt does.
export function typeOf(title: string, excerpt: string) {
  const fromTitle = docTypeOf(title)

  if (fromTitle !== 'Other') return fromTitle

  return docTypeOf(excerpt)
}

// A number and year come from the document's own identifier. The title is read first, then the
// decoded URL path, then the excerpt. An Other document has no type phrase, so only its URL is read.
// A "No." or "Nomor" token names the number, kept whole. The year is the one after "Tahun", else the
// last part of a slashed number. Without that token, the URL path's first "number year" pair is used.
const NUMBER_AFTER_NO = /\b(?:nomor|no)\b[.:\s-]*(\d+(?:[./]\w+)*)/i
const YEAR_AFTER_TAHUN = /\btahun[\s-]*(\d{4})\b/i
const SLASHED_YEAR = /\/(\d{4})$/
const PLAIN_PAIR = /(?<![\w/.])(\d+)[\s-]+(?:tahun[\s-]+)?(\d{4})\b/i

// A typed document's own type phrase opens its title, or a line of its excerpt, in full or as the
// short form. Only region words may come between that phrase and "Nomor".
const OWN_PHRASES: Partial<Record<string, RegExp>> = {
  UU: /^[\s|#*>]*(?:undang[\s-]*undang|uu)\b/im,
  PP: /^[\s|#*>]*(?:peraturan\s+pemerintah|pp)\b/im,
  Perpres: /^[\s|#*>]*(?:peraturan\s+presiden|perpres)\b/im,
  Permen: /^[\s|#*>]*(?:peraturan\s+menteri|permen)\b/im,
  Perda: /^[\s|#*>]*(?:peraturan\s+daerah|perda)\b/im,
  Perwali: /^[\s|#*>]*(?:peraturan\s+wali\s?kota|perwali)\b/im,
  Pergub: /^[\s|#*>]*(?:peraturan\s+gubernur|pergub)\b/im,
}

// The identifier after the phrase: region and issuer words, then "Nomor" or "No.", the number, and an
// optional "Tahun". Any other word, such as "Perubahan atas", ends the match, so an amended document
// is never read.
const OWN_IDENTIFIER =
  /^(?:[\s,.:;|*#>-]*\b(?:kota|walikota|wali|surabaya|provinsi|propinsi|jawa|timur|gubernur|perwali|perda|pergub|pupr)\b)*[\s,.:;|*#>-]*\b(?:nomor|no)\b[.:\s-]*(\d+(?:[./]\w+)*)(?:[\s,.-]*tahun[\s-]*(\d{4})\b)?/i

function anchoredIn(text: string, number: string) {
  const year = YEAR_AFTER_TAHUN.exec(text)?.[1] ?? SLASHED_YEAR.exec(number)?.[1]

  if (!year) return null

  return { number, year: Number(year) }
}

function numberYearIn(text: string) {
  const anchored = NUMBER_AFTER_NO.exec(text)

  if (anchored) return anchoredIn(text, anchored[1])

  const pair = PLAIN_PAIR.exec(text)

  if (!pair) return null

  return { number: pair[1], year: Number(pair[2]) }
}

function decodedPath(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname)
  } catch {
    return ''
  }
}

// The identifier follows the phrase, up to "tentang". A law cited before that phrase, or after
// "tentang", is never read.
function ownIn(docType: string, text: string) {
  const phrase = OWN_PHRASES[docType]?.exec(text)

  if (!phrase) return null

  const after = text.slice(phrase.index + phrase[0].length).split(/\btentang\b/i)[0]
  const identifier = OWN_IDENTIFIER.exec(after)

  if (!identifier) return null

  const number = identifier[1]
  const year = identifier[2] ?? SLASHED_YEAR.exec(number)?.[1]

  if (!year) return null

  return { number, year: Number(year) }
}

export function numberYearOf(
  docType: string,
  title: string,
  excerpt: string,
  url: string,
): { number: string | null; year: number | null } {
  return (
    ownIn(docType, title) ??
    numberYearIn(decodedPath(url)) ??
    ownIn(docType, excerpt) ?? { number: null, year: null }
  )
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

// The issuer sets the level, never the host. A national doc type is national, where the doc type
// is the one typeOf reports. Otherwise the first region phrase in the title decides, then the
// decoded URL path. Any other region has no level.
export function levelOf(docType: string, title: string, url: string): JurisdictionLevel | null {
  if (NATIONAL_DOC_TYPES.includes(docType)) return 'national'

  const region = regionIn(title) ?? regionIn(decodedPath(url))

  if (region === 'city' || region === 'province') return region

  return null
}

// A listing page is a search or category page, not a document. Its URL carries one of these parts.
const LISTING_PARTS = ['?tahun=', '&page=']

export function isListingUrl(url: string) {
  return LISTING_PARTS.some((part) => url.includes(part))
}
