import { extractText, getDocumentProxy } from 'unpdf'

export type ExtractedPage = { page: number; text: string; ocr: boolean }

// Reads the text layer only. Scanned-page OCR (product 0011) will replace the text of pages with almost none and set `ocr`.
export async function extractPages(bytes: Uint8Array): Promise<ExtractedPage[]> {
  // pdf.js detaches the buffer it is given, so give it a copy.
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: false })

  return text.map((pageText, index) => ({ page: index + 1, text: pageText, ocr: false }))
}
