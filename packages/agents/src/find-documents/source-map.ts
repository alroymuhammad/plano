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
