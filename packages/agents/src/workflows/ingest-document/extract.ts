import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createWorker } from 'tesseract.js'
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf'
import type { ExtractedPage } from '../../types'
import { OCR_LANG, OCR_LANG_SHA256, OCR_LANG_URL, OCR_MIN_PAGE_CHARS, OCR_SCALE } from './constants'

// Reads each page's text layer. A page with almost none is scanned: it is rendered and OCR'd (product 0011), and marked `ocr`.
export async function extractPages(
  bytes: Uint8Array,
  ocrDataDir: string,
): Promise<ExtractedPage[]> {
  // pdf.js detaches the buffer it is given, so give it a copy.
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: false })
  const pages = text.map((pageText, index) => ({ page: index + 1, text: pageText, ocr: false }))
  const scanned = pages.filter((page) => page.text.trim().length < OCR_MIN_PAGE_CHARS)

  if (scanned.length === 0) return pages

  await ensureLanguageFile(ocrDataDir)
  // tesseract.js throws a failed job out of its message handler, which would crash the process. The awaited calls
  // below still reject, so the handler only stops that throw.
  const worker = await createWorker(OCR_LANG, undefined, {
    cachePath: ocrDataDir,
    errorHandler: () => {},
  })

  try {
    for (const page of scanned) {
      const image = await renderPageAsImage(pdf, page.page, {
        canvasImport: () => import('@napi-rs/canvas'),
        scale: OCR_SCALE,
      })
      const { data } = await worker.recognize(Buffer.from(image))

      page.text = data.text.trim()
      page.ocr = true
    }
  } finally {
    await worker.terminate()
  }

  return pages
}

// tesseract.js leaves createWorker pending when its own download fails, so fetch the file here, where a failure rejects.
async function ensureLanguageFile(ocrDataDir: string) {
  const file = join(ocrDataDir, `${OCR_LANG}.traineddata`)

  if (!existsSync(file)) {
    const url = `${OCR_LANG_URL}/${OCR_LANG}.traineddata.gz`
    const response = await fetch(url).catch(() => null)

    if (!response?.ok) throw new Error(`Could not download the OCR language from ${url}`)

    await mkdir(ocrDataDir, { recursive: true })
    // Written under another name first, so an interrupted download never leaves a truncated language file.
    const partial = `${file}.partial`

    await writeFile(partial, gunzipSync(Buffer.from(await response.arrayBuffer())))
    await rename(partial, file)
  }

  // Checked before every use, downloaded or cached, so tesseract never reads a file other than the pinned one.
  const sha256 = createHash('sha256')
    .update(await readFile(file))
    .digest('hex')

  if (sha256 !== OCR_LANG_SHA256) {
    await rm(file, { force: true })
    throw new Error(
      `OCR language file ${file} has sha256 ${sha256}, not ${OCR_LANG_SHA256}. It was deleted; run again to download it.`,
    )
  }
}
