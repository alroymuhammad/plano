import { docTypeOf } from '../find-documents/source-map'

// Number and year as printed in a regulation title, e.g. "Nomor 12 Tahun 2019".
export const numberAndYearOf = (title: string): { number: string; year: string } | null => {
  const match = title.match(/\bNomor\s+(\d+)\s+Tahun\s+(\d{4})/i)

  if (!match) return null

  return { number: match[1], year: match[2] }
}

// Copies of one regulation share a type, number and year. A title that does not
// name all three has no identity, so it is never matched against another copy.
export const documentIdentity = (title: string): string | null => {
  const docType = docTypeOf(title)
  const numbered = numberAndYearOf(title)

  if (docType === 'Other' || !numbered) return null

  return `${docType}|${numbered.number}|${numbered.year}`
}
