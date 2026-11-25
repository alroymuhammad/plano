import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createWorker } from 'tesseract.js'
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf'
import type { ExtractedPage } from '../../types'
import {
  OCR_LANG,
  OCR_LANG_SHA256,
  OCR_LANG_URL,
  OCR_MIN_PAGE_CHARS,
  OCR_RENDER_SCALE,
} from './constants'

export async function extractPages(
  bytes: Uint8Array,
  ocrDataDir: string,
): Promise<ExtractedPage[]> {
  const pdfJsCopy = new Uint8Array(bytes)
  const pdf = await getDocumentProxy(pdfJsCopy)
  const { text } = await extractText(pdf, { mergePages: false })
  const pages = text.map((pageText, index) => ({ page: index + 1, text: pageText, ocr: false }))
  const scanned = pages.filter((page) => page.text.trim().length < OCR_MIN_PAGE_CHARS)

  if (scanned.length === 0) return pages

  await ensureLanguageFile(ocrDataDir)
  const ignoreWorkerErrors = () => {}
  const worker = await createWorker(OCR_LANG, undefined, {
    cachePath: ocrDataDir,
    errorHandler: ignoreWorkerErrors,
  })

  try {
    for (const page of scanned) {
      const image = await renderPageAsImage(pdf, page.page, {
        canvasImport: () => import('@napi-rs/canvas'),
        scale: OCR_RENDER_SCALE,
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

async function ensureLanguageFile(ocrDataDir: string) {
  const file = join(ocrDataDir, `${OCR_LANG}.traineddata`)

  if (!existsSync(file)) {
    const url = `${OCR_LANG_URL}/${OCR_LANG}.traineddata.gz`
    const response = await fetch(url).catch(() => null)

    if (!response?.ok) throw new Error(`Could not download the OCR language from ${url}`)

    await mkdir(ocrDataDir, { recursive: true })
    const partial = `${file}.partial`

    await writeFile(partial, gunzipSync(Buffer.from(await response.arrayBuffer())))
    await rename(partial, file)
  }

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
