import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'
import { createDb, createLibraryStore, type Db, type LibraryStore } from '@plano/db'
import type { IngestDocumentResult } from '../../types'
import { ingestDocument } from './index'

// Gitignored, so a fresh checkout skips this suite instead of failing it.
const FIXTURE = fileURLToPath(new URL('../../../data/2025perda3578003.pdf', import.meta.url))
const PAGE_COUNT = 305
const PASAL_HEADING = /^Pasal \d+[A-Z]?$/
const BAB_OR_LAMPIRAN = /^(BAB [IVXLCDM]+|LAMPIRAN\b.*)$/
const METADATA = {
  title: 'Rencana Tata Ruang Wilayah Kota Surabaya 2025-2045',
  type: 'Perda',
  number: '3',
  year: 2025,
  area: 'Kota Surabaya',
}

describe(
  'ingestDocument',
  {
    skip: existsSync(FIXTURE)
      ? false
      : `RTRW fixture not found at ${FIXTURE}: copy Perda Surabaya 3/2025 there to run these tests`,
  },
  () => {
    const analystId = randomUUID()
    const otherAnalystId = randomUUID()
    let db: Db
    let library: LibraryStore
    let storageDir: string
    let first: IngestDocumentResult

    const documentsOf = (analyst: string) =>
      db.query.document.findMany({ where: (t, { eq }) => eq(t.analystId, analyst) })

    const pagesOf = (documentId: string) =>
      db.query.documentPage.findMany({
        where: (t, { eq }) => eq(t.documentId, documentId),
        orderBy: (t, { asc }) => [asc(t.page)],
      })

    const passagesOf = (documentId: string) =>
      db.query.passage.findMany({
        where: (t, { eq }) => eq(t.documentId, documentId),
        orderBy: (t, { asc }) => [asc(t.index)],
      })

    const libraryCounts = async () => ({
      documents: (await documentsOf(analystId)).length,
      pages: (await pagesOf(first.documentId)).length,
      passages: (await passagesOf(first.documentId)).length,
      files: readdirSync(storageDir).length,
    })

    before(async () => {
      const url = process.env.DATABASE_URL

      if (!url) throw new Error('Set DATABASE_URL in .env (see .env.example) to run these tests')

      db = createDb(url)
      library = createLibraryStore(db)
      storageDir = await mkdtemp(join(tmpdir(), 'plano-ingest-'))
      first = await ingestDocument(
        { path: FIXTURE, ...METADATA },
        { library, analystId, storageDir },
      )
    })

    after(async () => {
      await db.$client`delete from "document" where "analystId" in (${analystId}, ${otherAnalystId})`
      await db.$client.end()
      await rm(storageDir, { recursive: true, force: true })
    })

    it('stores one confirmed document with its metadata, file, and page count', async () => {
      const documents = await documentsOf(analystId)
      assert.equal(documents.length, 1)

      const [row] = documents
      assert.equal(row.id, first.documentId)
      assert.equal(row.confirmed, true)
      assert.equal(row.status, 'active')
      assert.equal(row.title, METADATA.title)
      assert.equal(row.type, METADATA.type)
      assert.equal(row.number, METADATA.number)
      assert.equal(row.year, METADATA.year)
      assert.equal(row.area, METADATA.area)
      assert.equal(row.pageCount, PAGE_COUNT)
      assert.equal(row.fileHash, createHash('sha256').update(readFileSync(FIXTURE)).digest('hex'))

      assert.ok(row.storageUri.startsWith('file://'))
      const stored = fileURLToPath(row.storageUri)
      assert.ok(stored.startsWith(storageDir))
      assert.ok(readFileSync(stored).equals(readFileSync(FIXTURE)))
    })

    it('reports the page and Passage counts of a new document', async () => {
      assert.ok(!first.skipped)
      assert.equal(first.pageCount, PAGE_COUNT)
      assert.deepEqual(first.ocrPages, [])
      assert.equal(first.passageCount, (await passagesOf(first.documentId)).length)
    })

    it('stores one page row per PDF page, each read from the text layer', async () => {
      const pages = await pagesOf(first.documentId)
      assert.deepEqual(
        pages.map((page) => page.page),
        Array.from({ length: PAGE_COUNT }, (_, i) => i + 1),
      )
      assert.ok(pages.every((page) => page.text.trim().length > 0))
      assert.ok(pages.every((page) => !page.ocr))
    })

    it('keeps every Passage inside the text of the pages it spans', async () => {
      const pages = await pagesOf(first.documentId)
      const passages = await passagesOf(first.documentId)
      // The RTRW has 221 Pasal headings, and each starts a Passage.
      assert.ok(passages.length >= 221)

      for (const passage of passages) {
        assert.ok(
          passage.pageStart >= 1 &&
            passage.pageStart <= passage.pageEnd &&
            passage.pageEnd <= PAGE_COUNT,
        )
        const spanText = pages
          .filter((page) => page.page >= passage.pageStart && page.page <= passage.pageEnd)
          .map((page) => page.text)
          .join('\n')
        assert.ok(
          spanText.includes(passage.text),
          `Passage ${passage.index} is not in pages ${passage.pageStart}-${passage.pageEnd}`,
        )

        // The first and last lines pin the span exactly: a line never crosses a page break.
        const lines = passage.text.split('\n')
        const pageTextOf = (page: number) => pages[page - 1].text
        assert.ok(pageTextOf(passage.pageStart).includes(lines[0]))
        assert.ok(pageTextOf(passage.pageEnd).includes(lines[lines.length - 1]))
      }
    })

    it('never puts a Pasal heading inside a Passage, except at its start', async () => {
      const passages = await passagesOf(first.documentId)

      for (const passage of passages) {
        const headingLines = passage.text
          .split('\n')
          .flatMap((line, index) => (PASAL_HEADING.test(line.trim()) ? [index] : []))
        assert.ok(
          headingLines.every((index) => index === 0),
          `Passage ${passage.index} has a Pasal heading mid-text`,
        )
      }
    })

    it('names in each Passage heading the Pasal it sits in, if any', async () => {
      const pages = await pagesOf(first.documentId)
      const passages = await passagesOf(first.documentId)
      const documentText = pages.map((page) => page.text).join('\n')

      for (const passage of passages) {
        // Headings from the document's start through the Passage's first line. The last Pasal among them is the one
        // the Passage sits in, unless a BAB or LAMPIRAN heading came after it.
        const start = documentText.indexOf(passage.text)
        const headings = documentText
          .slice(0, start + passage.text.split('\n')[0].length)
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => PASAL_HEADING.test(line) || BAB_OR_LAMPIRAN.test(line))
        const last = headings.at(-1) ?? ''

        if (last.startsWith('Pasal')) {
          assert.ok(passage.heading.endsWith(` › ${last}`), passage.heading)
        } else {
          assert.ok(!passage.heading.includes(' › Pasal '), passage.heading)
        }
      }
    })

    it('names the BAB and Pasal of a Passage in its heading', async () => {
      const passages = await passagesOf(first.documentId)
      const pasal5 = passages.find((passage) => passage.text.startsWith('Pasal 5\n'))

      assert.equal(
        pasal5?.heading,
        `${METADATA.title} › BAB IV TUJUAN, KEBIJAKAN DAN STRATEGI PENATAAN RUANG WILAYAH KOTA › Pasal 5`,
      )
    })

    it('gives each Passage the id <documentId>:<index>', async () => {
      const passages = await passagesOf(first.documentId)

      assert.deepEqual(
        passages.map((passage) => passage.index),
        passages.map((_, i) => i),
      )
      assert.deepEqual(
        passages.map((passage) => passage.id),
        passages.map((passage) => `${first.documentId}:${passage.index}`),
      )
    })

    it('returns skipped and writes nothing when the same file is ingested again', async () => {
      const countsBefore = await libraryCounts()

      const again = await ingestDocument(
        { path: FIXTURE, ...METADATA },
        { library, analystId, storageDir },
      )

      assert.deepEqual(again, { documentId: first.documentId, skipped: true })
      assert.deepEqual(await libraryCounts(), countsBefore)
    })

    it('ingests the same file again for another Analyst', async () => {
      const other = await ingestDocument(
        { path: FIXTURE, ...METADATA },
        { library, analystId: otherAnalystId, storageDir },
      )

      assert.ok(!other.skipped)
      assert.equal((await documentsOf(otherAnalystId)).length, 1)
    })
  },
)
