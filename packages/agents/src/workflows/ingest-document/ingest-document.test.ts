import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'
import type { EmbeddingModel } from '@anvia/core/embeddings'
import { createDb, createLibraryStore, type Db, type LibraryStore } from '@plano/db'
import type { IngestDocumentResult } from '../../types'
import { ingestDocument } from './index'
import { fakeEmbeddingModel, OCR_DATA_DIR, qdrant } from '../../test-helpers'

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
type Points = { id: string; payload: Record<string, unknown> }[]
type IngestOverrides = { model?: EmbeddingModel; number?: string | null; year?: number | null }

const embeddingModel = fakeEmbeddingModel()
const failingEmbeddingModel = fakeEmbeddingModel({ fail: true })

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
    const bareAnalystId = randomUUID()
    const retryAnalystId = randomUUID()
    const reindexAnalystId = randomUUID()
    const unsavedAnalystId = randomUUID()
    // A collection of its own, so these tests never write to the dev `passages` collection.
    const collectionName = `plano-test-passages-${randomUUID()}`
    let db: Db
    let library: LibraryStore
    let sourceDir: string
    let storageDir: string
    let first: IngestDocumentResult

    const ingest = (analyst: string, { model = embeddingModel, ...card }: IngestOverrides = {}) =>
      ingestDocument(
        { path: FIXTURE, ...METADATA, ...card },
        {
          library,
          analystId: analyst,
          storageDir,
          ocrDataDir: OCR_DATA_DIR,
          collectionName,
          embeddingModel: model,
        },
      )

    // Points in the test collection whose payload field equals the value.
    const pointsWhere = async (field: string, value: string): Promise<Points> => {
      const { points } = await qdrant('POST', `/collections/${collectionName}/points/scroll`, {
        filter: { must: [{ key: field, match: { value } }] },
        limit: 10000,
        with_payload: true,
        with_vector: false,
      })

      return points
    }

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
      points: (await pointsWhere('documentId', first.documentId)).length,
      files: readdirSync(storageDir).length,
    })

    before(async () => {
      const url = process.env.DATABASE_URL

      if (!url) throw new Error('Set DATABASE_URL in .env (see .env.example) to run these tests')

      db = createDb(url)
      library = createLibraryStore(db)
      sourceDir = await mkdtemp(join(tmpdir(), 'plano-ingest-src-'))
      storageDir = await mkdtemp(join(tmpdir(), 'plano-ingest-'))
      first = await ingest(analystId)
    })

    after(async () => {
      const analysts = [
        analystId,
        otherAnalystId,
        bareAnalystId,
        retryAnalystId,
        reindexAnalystId,
        unsavedAnalystId,
      ]
      await db.$client`delete from "document" where "analystId" = any(${analysts})`
      await qdrant('DELETE', `/collections/${collectionName}`)
      await db.$client.end()
      await rm(sourceDir, { recursive: true, force: true })
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

      const again = await ingest(analystId)

      assert.deepEqual(again, { documentId: first.documentId, skipped: true })
      assert.deepEqual(await libraryCounts(), countsBefore)
    })

    it('ingests the same file again for another Analyst', async () => {
      const other = await ingest(otherAnalystId)

      assert.ok(!other.skipped)
      assert.equal((await documentsOf(otherAnalystId)).length, 1)
    })

    it('marks the document indexed and writes one Qdrant point per Passage with its payload', async () => {
      const [row] = await documentsOf(analystId)
      assert.ok(row.indexedAt)

      const passages = await passagesOf(first.documentId)
      const points = await pointsWhere('documentId', first.documentId)
      assert.equal(points.length, passages.length)

      for (const passage of passages) {
        const point = points.find((item) => item.payload.__anvia_document_id === passage.id)
        assert.ok(point, `no point for Passage ${passage.id}`)

        const fields = Object.fromEntries(
          Object.entries(point.payload).filter(([key]) => !key.startsWith('__anvia_')),
        )
        assert.deepEqual(fields, {
          analystId,
          documentId: first.documentId,
          confirmed: true,
          status: 'active',
          title: METADATA.title,
          type: METADATA.type,
          number: METADATA.number,
          year: METADATA.year,
          heading: passage.heading,
          pageStart: passage.pageStart,
          pageEnd: passage.pageEnd,
        })
        // The copy of the Passage text is the embedded text: its heading, a newline, then the text.
        assert.equal(
          JSON.parse(String(point.payload.__anvia_document)).text,
          `${passage.heading}\n${passage.text}`,
        )
      }
    })

    it('leaves number and year out of the payload when the Metadata Card has none', async () => {
      const bare = await ingest(bareAnalystId, { number: null, year: null })
      assert.ok(!bare.skipped)

      const points = await pointsWhere('documentId', bare.documentId)
      assert.equal(points.length, bare.passageCount)

      for (const point of points) {
        assert.equal('number' in point.payload, false)
        assert.equal('year' in point.payload, false)
      }
    })

    it('leaves one document and one set of points when a run fails before indexing and is run again', async () => {
      await assert.rejects(
        ingest(retryAnalystId, { model: failingEmbeddingModel }),
        /Embedding failed/,
      )

      const [failed] = await documentsOf(retryAnalystId)
      assert.equal(failed.indexedAt, null)
      assert.equal((await pointsWhere('analystId', retryAnalystId)).length, 0)
      // The row exists, so its file stays until the retry discards the row and the file together.
      assert.equal(existsSync(fileURLToPath(failed.storageUri)), true)

      const again = await ingest(retryAnalystId)
      assert.ok(!again.skipped)

      const documents = await documentsOf(retryAnalystId)
      assert.deepEqual(
        documents.map((row) => row.id),
        [again.documentId],
      )
      assert.ok(documents[0].indexedAt)
      assert.equal(existsSync(fileURLToPath(failed.storageUri)), false)
      assert.equal((await pointsWhere('analystId', retryAnalystId)).length, again.passageCount)
    })

    it('removes the stored PDF when a run fails before saving, so no file is left without a row', async () => {
      const notPdf = join(sourceDir, 'not-a-pdf.pdf')
      await writeFile(notPdf, 'This file is not a PDF.')
      const filesBefore = readdirSync(storageDir)

      await assert.rejects(
        ingestDocument(
          { path: notPdf, ...METADATA },
          {
            library,
            analystId,
            storageDir,
            ocrDataDir: OCR_DATA_DIR,
            collectionName,
            embeddingModel,
          },
        ),
        /Invalid PDF/,
      )

      assert.deepEqual(readdirSync(storageDir), filesBefore)
    })

    it('removes the stored PDF when saving the document fails', async () => {
      const filesBefore = readdirSync(storageDir)
      const failingLibrary = {
        ...library,
        saveDocument: async () => {
          throw new Error('Save failed (test)')
        },
      }

      await assert.rejects(
        ingestDocument(
          { path: FIXTURE, ...METADATA },
          {
            library: failingLibrary,
            analystId: unsavedAnalystId,
            storageDir,
            ocrDataDir: OCR_DATA_DIR,
            collectionName,
            embeddingModel,
          },
        ),
        /Save failed/,
      )

      assert.deepEqual(readdirSync(storageDir), filesBefore)
    })

    it('leaves one point per Passage when the same document is indexed twice', async () => {
      const once = await ingest(reindexAnalystId)
      assert.ok(!once.skipped)

      // A run that wrote its points but stopped before it marked the document indexed.
      await db.$client`update "document" set "indexedAt" = null where "id" = ${once.documentId}`

      const twice = await ingest(reindexAnalystId)
      assert.ok(!twice.skipped)
      assert.deepEqual(
        (await documentsOf(reindexAnalystId)).map((row) => row.id),
        [twice.documentId],
      )
      assert.equal((await pointsWhere('documentId', once.documentId)).length, 0)
      assert.equal((await pointsWhere('analystId', reindexAnalystId)).length, twice.passageCount)
    })
  },
)
