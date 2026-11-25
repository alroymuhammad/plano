import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'
import { createCanvas } from '@napi-rs/canvas'
import { createDb, createLibraryStore, type Db } from '@plano/db'
import type { IngestDocumentResult } from '../../types'
import { extractPages } from './extract'
import { ingestDocument } from './index'
import { fakeEmbeddingModel, qdrant } from '../../test-helpers'

// Gitignored, so a fresh checkout skips the RTRW test instead of failing it.
const RTRW = fileURLToPath(new URL('../../../data/2025perda3578003.pdf', import.meta.url))
const SCAN_WIDTH = 1240
const SCAN_HEIGHT = 1754
const SCANNED_LINES = [
  'Pasal 2',
  'Wilayah Kota Surabaya terdiri atas kecamatan',
  'dan kelurahan sesuai dengan peta batas wilayah.',
]
// Page 1's content stream: a text layer. Page 2 is a JPEG of a scanned page, with no text layer.
const TEXT_PAGE_CONTENT = `BT /F1 14 Tf 72 760 Td (PERATURAN DAERAH KOTA SURABAYA) Tj 0 -28 Td (Pasal 1) Tj 0 -20 Td (Dalam Peraturan Daerah ini yang dimaksud dengan Kota adalah Kota Surabaya.) Tj ET`

async function scannedPageJpeg(): Promise<Buffer> {
  const canvas = createCanvas(SCAN_WIDTH, SCAN_HEIGHT)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, SCAN_WIDTH, SCAN_HEIGHT)
  ctx.fillStyle = '#000'
  ctx.font = '40px sans-serif'
  SCANNED_LINES.forEach((line, i) => ctx.fillText(line, 120, 200 + i * 60))

  return canvas.encode('jpeg', 92)
}

// Writes the PDF by hand, so the test needs no PDF library.
async function buildScannedPdf(): Promise<Buffer> {
  const jpeg = await scannedPageJpeg()
  const stream = (dict: string, data: Buffer | string) => {
    const bytes = Buffer.from(data)

    return Buffer.concat([
      Buffer.from(`<< ${dict} /Length ${bytes.length} >>\nstream\n`),
      bytes,
      Buffer.from('\nendstream'),
    ])
  }
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    stream('', TEXT_PAGE_CONTENT),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 8 0 R >> >> /Contents 7 0 R >>',
    stream('', 'q 595 0 0 842 0 0 cm /Im1 Do Q'),
    stream(
      `/Type /XObject /Subtype /Image /Width ${SCAN_WIDTH} /Height ${SCAN_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      jpeg,
    ),
  ]

  const chunks: Buffer[] = []
  const offsets: number[] = []
  let length = 0
  const push = (chunk: Buffer) => {
    chunks.push(chunk)
    length += chunk.length
  }

  push(Buffer.from('%PDF-1.4\n'))
  objects.forEach((body, i) => {
    offsets.push(length)
    push(
      Buffer.concat([
        Buffer.from(`${i + 1} 0 obj\n`),
        Buffer.from(body),
        Buffer.from('\nendobj\n'),
      ]),
    )
  })

  const xrefAt = length
  let table = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) table += `${String(offset).padStart(10, '0')} 00000 n \n`
  push(
    Buffer.from(
      `${table}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`,
    ),
  )

  return Buffer.concat(chunks)
}

const SCANNED_PDF = await buildScannedPdf()

describe('extractPages', () => {
  it('reads the text layer of a page with text and OCRs only the scanned page', async () => {
    const pages = await extractPages(SCANNED_PDF)

    assert.deepEqual(
      pages.map((page) => page.page),
      [1, 2],
    )
    assert.equal(pages[0].ocr, false)
    assert.ok(pages[0].text.includes('Pasal 1'), pages[0].text)
    assert.equal(pages[1].ocr, true)
    for (const word of ['Pasal 2', 'Surabaya', 'kelurahan']) {
      assert.ok(pages[1].text.includes(word), `OCR text is missing "${word}": ${pages[1].text}`)
    }
  })
})

describe(
  'extractPages on the RTRW fixture',
  {
    skip: existsSync(RTRW)
      ? false
      : `RTRW fixture not found at ${RTRW}: copy Perda Surabaya 3/2025 there to run this test`,
  },
  () => {
    it('OCRs no page, since every page has a text layer', async () => {
      const pages = await extractPages(readFileSync(RTRW))

      assert.equal(pages.length, 305)
      assert.deepEqual(
        pages.filter((page) => page.ocr).map((page) => page.page),
        [],
      )
    })
  },
)

describe('ingestDocument with a scanned page', () => {
  const analystId = randomUUID()
  const collectionName = `plano-test-passages-${randomUUID()}`
  let db: Db
  let sourceDir: string
  let storageDir: string
  let result: IngestDocumentResult

  before(async () => {
    const url = process.env.DATABASE_URL

    if (!url) throw new Error('Set DATABASE_URL in .env (see .env.example) to run these tests')

    db = createDb(url)
    sourceDir = await mkdtemp(join(tmpdir(), 'plano-ocr-source-'))
    storageDir = await mkdtemp(join(tmpdir(), 'plano-ocr-storage-'))

    const path = join(sourceDir, 'scanned.pdf')
    await writeFile(path, SCANNED_PDF)
    result = await ingestDocument(
      { path, title: 'Peraturan Uji OCR', type: 'Perda', area: 'Kota Surabaya' },
      {
        library: createLibraryStore(db),
        analystId,
        storageDir,
        collectionName,
        embeddingModel: fakeEmbeddingModel(),
      },
    )
  })

  after(async () => {
    await db.$client`delete from "document" where "analystId" = ${analystId}`
    await qdrant('DELETE', `/collections/${collectionName}`)
    await db.$client.end()
    await rm(sourceDir, { recursive: true, force: true })
    await rm(storageDir, { recursive: true, force: true })
  })

  it("marks only the scanned page as OCR'd in the result", () => {
    assert.ok(!result.skipped)
    assert.equal(result.pageCount, 2)
    assert.deepEqual(result.ocrPages, [2])
  })

  it('stores each page with its ocr flag and the recognised text of the scanned page', async () => {
    const pages = await db.query.documentPage.findMany({
      where: (t, { eq }) => eq(t.documentId, result.documentId),
      orderBy: (t, { asc }) => [asc(t.page)],
    })

    assert.deepEqual(
      pages.map((page) => page.ocr),
      [false, true],
    )
    assert.ok(pages[0].text.includes('Pasal 1'))
    assert.ok(pages[1].text.includes('kelurahan'), pages[1].text)
  })

  it('saves the Passage of the scanned page with its text and page span', async () => {
    const passages = await db.query.passage.findMany({
      where: (t, { eq }) => eq(t.documentId, result.documentId),
    })
    const scanned = passages.find((passage) => passage.heading.endsWith(' › Pasal 2'))

    assert.ok(scanned, `no Passage under "Pasal 2": ${passages.map((p) => p.heading).join(' | ')}`)
    assert.equal(scanned.pageStart, 2)
    assert.equal(scanned.pageEnd, 2)
    assert.ok(scanned.text.includes('kelurahan'), scanned.text)
  })
})
