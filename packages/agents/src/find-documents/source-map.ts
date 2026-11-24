import type { JurisdictionLevel, SourceCredibility } from '../types'

export const LEVELS: JurisdictionLevel[] = ['national', 'province', 'city']

export const SOURCE_DOMAINS: Record<JurisdictionLevel, string[]> = {
  national: ['peraturan.go.id', 'peraturan.bpk.go.id', 'jdihn.go.id', 'jdih.atrbpn.go.id'],
  province: ['jdih.jatimprov.go.id'],
  city: ['jdih.surabaya.go.id'],
}

export function credibilityOf(url: string): SourceCredibility {
  const host = new URL(url).hostname
  const officialDomains = Object.values(SOURCE_DOMAINS).flat()

  if (officialDomains.some((domain) => host === domain || host.endsWith(`.${domain}`)))
    return 'official'

  if (host.endsWith('.go.id')) return 'government'

  return 'open_web'
}

const DOC_TYPES: Array<[RegExp, string]> = [
  [/^undang-undang\b/i, 'UU'],
  [/^peraturan pemerintah\b/i, 'PP'],
  [/^peraturan presiden\b/i, 'Perpres'],
  [/^peraturan menteri\b/i, 'Permen'],
  [/^peraturan daerah\b/i, 'Perda'],
  [/^peraturan wali ?kota\b/i, 'Perwali'],
  [/^peraturan gubernur\b/i, 'Pergub'],
]

export function docTypeOf(title: string) {
  const match = DOC_TYPES.find(([pattern]) => pattern.test(title))

  return match?.[1] ?? 'Other'
}
