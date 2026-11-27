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
import type { IngestDocumentResult, PassageEnricher } from '../../types'
import { ingestDocument } from './index'
import {
  fakeEmbeddingModel,
  fakeEnricher,
  OCR_DATA_DIR,
  qdrantRest,
  textPdf,
} from '../../test-helpers'

const FIXTURE = fileURLToPath(new URL('../../../data/2025perda3578003.pdf', import.meta.url))
const PAGE_COUNT = 305
const PASAL_HEADING_COUNT = 221
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
type IngestOverrides = {
  model?: EmbeddingModel
  enricher?: PassageEnricher
  number?: string | null
  year?: number | null
}

const embeddingModel = fakeEmbeddingModel()
const failingEmbeddingModel = fakeEmbeddingModel({ fail: true })
const defaultEnricher = fakeEnricher({
  topics: ['substansi_teknis'],
  tags: ['kdb', 'klb'],
})

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
    const enrichCasesAnalystId = randomUUID()
    const enrichFailAnalystId = randomUUID()
    const enrichConcurrencyAnalystId = randomUUID()
    const enrichRetryAnalystId = randomUUID()
    const enrichPermanentAnalystId = randomUUID()
    const enrichRerunAnalystId = randomUUID()
    const collectionName = `plano-test-passages-${randomUUID()}`
    let db: Db
    let library: LibraryStore
    let sourceDir: string
    let storageDir: string
    let first: IngestDocumentResult

    const ingest = (
      analyst: string,
      { model = embeddingModel, enricher = defaultEnricher, ...card }: IngestOverrides = {},
    ) =>
      ingestDocument(
        { path: FIXTURE, ...METADATA, ...card },
        {
          library,
          analystId: analyst,
          storageDir,
          ocrDataDir: OCR_DATA_DIR,
          collectionName,
          embeddingModel: model,
          enricher,
        },
      )

    const pointsWhere = async (field: string, value: string): Promise<Points> => {
      const { points } = await qdrantRest('POST', `/collections/${collectionName}/points/scroll`, {
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
        enrichCasesAnalystId,
        enrichFailAnalystId,
        enrichConcurrencyAnalystId,
        enrichRetryAnalystId,
        enrichPermanentAnalystId,
        enrichRerunAnalystId,
      ]
      await db.$client`delete from "document" where "analystId" = any(${analysts})`
      await qdrantRest('DELETE', `/collections/${collectionName}`)
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
      assert.ok(passages.length >= PASAL_HEADING_COUNT)

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
        const start = documentText.indexOf(passage.text)
        const headingsBefore = documentText
          .slice(0, start + passage.text.split('\n')[0].length)
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => PASAL_HEADING.test(line) || BAB_OR_LAMPIRAN.test(line))
        const lastHeading = headingsBefore.at(-1) ?? ''

        if (lastHeading.startsWith('Pasal')) {
          assert.ok(passage.heading.endsWith(` › ${lastHeading}`), passage.heading)
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

    it('returns skipped and writes nothing without calling enricher when the same file is ingested again', async () => {
      const countsBefore = await libraryCounts()
      let enricherCalls = 0
      const spyEnricher: PassageEnricher = async (passages, context) => {
        enricherCalls += 1
        return defaultEnricher(passages, context)
      }

      const again = await ingest(analystId, { enricher: spyEnricher })

      assert.deepEqual(again, { documentId: first.documentId, skipped: true })
      assert.equal(enricherCalls, 0)
      assert.deepEqual(await libraryCounts(), countsBefore)
    })

    it('ingests the same file again for another Analyst', async () => {
      const other = await ingest(otherAnalystId)

      assert.ok(!other.skipped)
      assert.equal((await documentsOf(otherAnalystId)).length, 1)
    })

    it('marks the document indexed and writes one Qdrant point per Passage with its payload and keyword indexes', async () => {
      const [row] = await documentsOf(analystId)
      assert.ok(row.indexedAt)

      const collection = await qdrantRest('GET', `/collections/${collectionName}`)
      assert.equal(collection.payload_schema?.topics?.data_type, 'keyword')
      assert.equal(collection.payload_schema?.tags?.data_type, 'keyword')

      const passages = await passagesOf(first.documentId)
      const points = await pointsWhere('documentId', first.documentId)
      assert.equal(points.length, passages.length)

      for (const passage of passages) {
        assert.equal(passage.text.includes('\nTopik:'), false)
        assert.equal(passage.text.includes('\nTag:'), false)

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
          topics: ['substansi_teknis'],
          tags: ['kdb', 'klb'],
        })
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
            enricher: defaultEnricher,
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
            enricher: defaultEnricher,
          },
        ),
        /Save failed/,
      )

      assert.deepEqual(readdirSync(storageDir), filesBefore)
    })

    it('leaves one point per Passage when the same document is indexed twice', async () => {
      const once = await ingest(reindexAnalystId)
      assert.ok(!once.skipped)

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

    it('omits Topik and Tag lines from embedded text when topics and tags are empty', async () => {
      const pdfPath = join(sourceDir, 'empty-enrichment.pdf')
      await writeFile(pdfPath, textPdf([['Pasal 1', 'Ketentuan umum zonasi perkotaan.']]))

      const savedKey = process.env.GATEWAY_API_KEY
      const savedBaseUrl = process.env.GATEWAY_BASE_URL
      delete process.env.GATEWAY_API_KEY
      delete process.env.GATEWAY_BASE_URL

      try {
        const res = await ingestDocument(
          { path: pdfPath, ...METADATA, title: 'Perda Uji Kosong' },
          {
            library,
            analystId: enrichCasesAnalystId,
            storageDir,
            ocrDataDir: OCR_DATA_DIR,
            collectionName,
            embeddingModel,
            enricher: fakeEnricher({ topics: [], tags: [] }),
          },
        )
        assert.ok(!res.skipped)

        const passages = await passagesOf(res.documentId)
        const points = await pointsWhere('documentId', res.documentId)
        assert.equal(points.length, passages.length)

        for (const passage of passages) {
          const point = points.find((item) => item.payload.__anvia_document_id === passage.id)
          assert.ok(point)
          assert.deepEqual(point.payload.topics, [])
          assert.deepEqual(point.payload.tags, [])
          assert.equal(
            JSON.parse(String(point.payload.__anvia_document)).text,
            `${passage.heading}\n${passage.text}`,
          )
        }
      } finally {
        if (savedKey !== undefined) process.env.GATEWAY_API_KEY = savedKey

        if (savedBaseUrl !== undefined) process.env.GATEWAY_BASE_URL = savedBaseUrl
      }
    })

    it('normalizes tags and topics before indexing in Qdrant while keeping Postgres verbatim', async () => {
      const pdfPath = join(sourceDir, 'normalize-enrichment.pdf')
      await writeFile(
        pdfPath,
        textPdf([['Pasal 2', 'Koefisien dasar bangunan ditetapkan paling tinggi 60 persen.']]),
      )

      const res = await ingestDocument(
        { path: pdfPath, ...METADATA, title: 'Perda Uji Normalisasi' },
        {
          library,
          analystId: enrichCasesAnalystId,
          storageDir,
          ocrDataDir: OCR_DATA_DIR,
          collectionName,
          embeddingModel,
          enricher: async (passages) =>
            passages.map((passage) => ({
              index: passage.index,
              topics: [
                'substansi_teknis',
                'substansi_teknis',
                'prosedur',
                'kewenangan',
                'lampiran',
              ],
              tags: [
                '  KDB ',
                'kdb',
                '',
                '   ',
                'PBG',
                'Izin Bangunan',
                'KLB',
                'GSB',
                'Sempadan',
                'extra',
              ],
            })),
        },
      )
      assert.ok(!res.skipped)

      const [passage] = await passagesOf(res.documentId)
      assert.equal(
        passage.text,
        'Pasal 2\nKoefisien dasar bangunan ditetapkan paling tinggi 60 persen.',
      )

      const [point] = await pointsWhere('documentId', res.documentId)
      assert.deepEqual(point.payload.topics, ['substansi_teknis', 'prosedur', 'kewenangan'])
      assert.deepEqual(point.payload.tags, [
        'kdb',
        'pbg',
        'izin bangunan',
        'klb',
        'gsb',
        'sempadan',
      ])
      assert.equal(
        JSON.parse(String(point.payload.__anvia_document)).text,
        `${passage.heading}\n${passage.text}`,
      )
    })

    it('removes stored PDF and writes no Postgres or Qdrant rows when enrichment fails', async () => {
      const pdfPath = join(sourceDir, 'failing-enrichment.pdf')
      await writeFile(pdfPath, textPdf([['Pasal 3', 'Aturan sempadan sungai.']]))
      const filesBefore = readdirSync(storageDir)

      await assert.rejects(
        ingestDocument(
          { path: pdfPath, ...METADATA, title: 'Perda Uji Gagal Enrich' },
          {
            library,
            analystId: enrichFailAnalystId,
            storageDir,
            ocrDataDir: OCR_DATA_DIR,
            collectionName,
            embeddingModel,
            enricher: async () => {
              throw new Error('Enrichment failed (test)')
            },
          },
        ),
        /Enrichment failed/,
      )

      assert.deepEqual(readdirSync(storageDir), filesBefore)
      assert.equal((await documentsOf(enrichFailAnalystId)).length, 0)
      assert.equal((await pointsWhere('analystId', enrichFailAnalystId)).length, 0)
    })

    it('enriches passages in batches of 8 with bounded concurrency of 3 and maps results by index', async () => {
      const batchSizes: number[] = []
      let inFlight = 0
      let maxInFlight = 0

      const res = await ingest(enrichConcurrencyAnalystId, {
        enricher: async (passages) => {
          batchSizes.push(passages.length)
          inFlight += 1

          if (inFlight > maxInFlight) maxInFlight = inFlight

          try {
            const delayMs = passages[0]?.index === 0 ? 60 : 20
            await new Promise((resolve) => setTimeout(resolve, delayMs))

            return [...passages].reverse().map((passage) => ({
              index: passage.index,
              topics: ['substansi_teknis'],
              tags: [`idx-${passage.index}`],
            }))
          } finally {
            inFlight -= 1
          }
        },
      })

      assert.ok(!res.skipped)
      assert.ok(res.passageCount > 24)
      assert.ok(batchSizes.length > 3)
      assert.ok(batchSizes.slice(0, -1).every((size) => size === 8))
      assert.ok(batchSizes[batchSizes.length - 1] >= 1 && batchSizes[batchSizes.length - 1] <= 8)
      assert.equal(maxInFlight, 3)

      const passages = await passagesOf(res.documentId)
      const points = await pointsWhere('documentId', res.documentId)
      assert.equal(points.length, passages.length)

      for (const passage of passages) {
        const point = points.find((item) => item.payload.__anvia_document_id === passage.id)
        assert.ok(point, `no point for Passage ${passage.id}`)
        assert.deepEqual(point.payload.tags, [`idx-${passage.index}`])
        assert.equal(
          JSON.parse(String(point.payload.__anvia_document)).text,
          `${passage.heading}\n${passage.text}`,
        )
      }
    })

    it('retries a batch once when enrichment throws on the first attempt and completes ingestion', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => [
        `Pasal ${i + 1}`,
        `Ketentuan teknis zonasi nomor ${i + 1}.`,
      ]).flat()
      const pdfPath = join(sourceDir, 'transient-error-enrichment.pdf')
      await writeFile(pdfPath, textPdf([lines]))

      const callsPerBatch = new Map<number, number>()
      const res = await ingestDocument(
        { path: pdfPath, ...METADATA, title: 'Perda Uji Retry Error' },
        {
          library,
          analystId: enrichRetryAnalystId,
          storageDir,
          ocrDataDir: OCR_DATA_DIR,
          collectionName,
          embeddingModel,
          enricher: async (passages) => {
            const firstIndex = passages[0].index
            const attempt = (callsPerBatch.get(firstIndex) ?? 0) + 1
            callsPerBatch.set(firstIndex, attempt)

            if (firstIndex === 8 && attempt === 1) {
              throw new Error('Transient enrichment error (test)')
            }

            return passages.map((passage) => ({
              index: passage.index,
              topics: ['substansi_teknis'],
              tags: [`retry-${passage.index}`],
            }))
          },
        },
      )

      assert.ok(!res.skipped)
      assert.equal(res.passageCount, 10)
      assert.equal(callsPerBatch.get(0), 1)
      assert.equal(callsPerBatch.get(8), 2)

      const points = await pointsWhere('documentId', res.documentId)
      assert.equal(points.length, 10)
    })

    it('retries a batch once when the first response omits a submitted passage index', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => [
        `Pasal ${i + 1}`,
        `Ketentuan prosedur perizinan nomor ${i + 1}.`,
      ]).flat()
      const pdfPath = join(sourceDir, 'incomplete-batch-enrichment.pdf')
      await writeFile(pdfPath, textPdf([lines]))

      const callsPerBatch = new Map<number, number>()
      const res = await ingestDocument(
        { path: pdfPath, ...METADATA, title: 'Perda Uji Retry Incomplete' },
        {
          library,
          analystId: enrichRetryAnalystId,
          storageDir,
          ocrDataDir: OCR_DATA_DIR,
          collectionName,
          embeddingModel,
          enricher: async (passages) => {
            const firstIndex = passages[0].index
            const attempt = (callsPerBatch.get(firstIndex) ?? 0) + 1
            callsPerBatch.set(firstIndex, attempt)

            const items = passages.map((passage) => ({
              index: passage.index,
              topics: ['prosedur'] as const,
              tags: [`inc-${passage.index}`],
            }))

            if (firstIndex === 0 && attempt === 1) {
              return items.slice(0, -1).map((item) => ({ ...item, topics: [...item.topics] }))
            }

            return items.map((item) => ({ ...item, topics: [...item.topics] }))
          },
        },
      )

      assert.ok(!res.skipped)
      assert.equal(res.passageCount, 10)
      assert.equal(callsPerBatch.get(0), 2)
      assert.equal(callsPerBatch.get(8), 1)

      const passages = await passagesOf(res.documentId)
      const points = await pointsWhere('documentId', res.documentId)
      assert.equal(points.length, 10)

      for (const passage of passages) {
        const point = points.find((item) => item.payload.__anvia_document_id === passage.id)
        assert.ok(point)
        assert.deepEqual(point.payload.topics, ['prosedur'])
        assert.deepEqual(point.payload.tags, [`inc-${passage.index}`])
      }
    })

    it('rejects after 1 retry on a persistently incomplete batch with zero Postgres, Qdrant, or disk leftovers', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => [
        `Pasal ${i + 1}`,
        `Ketentuan pengawasan sanksi nomor ${i + 1}.`,
      ]).flat()
      const pdfPath = join(sourceDir, 'permanent-incomplete-enrichment.pdf')
      await writeFile(pdfPath, textPdf([lines]))

      const filesBefore = readdirSync(storageDir)
      const [{ n: pageCountBefore }] =
        await db.$client`select count(*)::int as n from "document_page"`
      const [{ n: passageCountBefore }] = await db.$client`select count(*)::int as n from "passage"`
      const callsPerBatch = new Map<number, number>()

      await assert.rejects(
        ingestDocument(
          { path: pdfPath, ...METADATA, title: 'Perda Uji Gagal Permanen Incomplete' },
          {
            library,
            analystId: enrichPermanentAnalystId,
            storageDir,
            ocrDataDir: OCR_DATA_DIR,
            collectionName,
            embeddingModel,
            enricher: async (passages) => {
              const firstIndex = passages[0].index
              callsPerBatch.set(firstIndex, (callsPerBatch.get(firstIndex) ?? 0) + 1)

              if (firstIndex === 8) {
                return passages.slice(0, -1).map((passage) => ({
                  index: passage.index,
                  topics: ['pengawasan_sanksi'],
                  tags: ['sanksi'],
                }))
              }

              return passages.map((passage) => ({
                index: passage.index,
                topics: ['pengawasan_sanksi'],
                tags: ['sanksi'],
              }))
            },
          },
        ),
        /Missing enrichment for passage index 9/,
      )

      assert.equal(callsPerBatch.get(8), 2)
      assert.deepEqual(readdirSync(storageDir), filesBefore)
      assert.equal((await documentsOf(enrichPermanentAnalystId)).length, 0)
      assert.equal((await pointsWhere('analystId', enrichPermanentAnalystId)).length, 0)

      const [{ n: pageCountAfter }] =
        await db.$client`select count(*)::int as n from "document_page"`
      const [{ n: passageCountAfter }] = await db.$client`select count(*)::int as n from "passage"`
      assert.equal(pageCountAfter, pageCountBefore)
      assert.equal(passageCountAfter, passageCountBefore)
    })

    it('ingests cleanly once when re-run after a permanent enrichment failure', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => [
        `Pasal ${i + 1}`,
        `Ketentuan peralihan nomor ${i + 1}.`,
      ]).flat()
      const pdfPath = join(sourceDir, 'permanent-fail-then-rerun.pdf')
      await writeFile(pdfPath, textPdf([lines]))

      const filesBefore = readdirSync(storageDir)
      const [{ n: pageCountBefore }] =
        await db.$client`select count(*)::int as n from "document_page"`
      const [{ n: passageCountBefore }] = await db.$client`select count(*)::int as n from "passage"`
      let failedBatchCalls = 0

      await assert.rejects(
        ingestDocument(
          { path: pdfPath, ...METADATA, title: 'Perda Uji Gagal Lalu Ulang' },
          {
            library,
            analystId: enrichRerunAnalystId,
            storageDir,
            ocrDataDir: OCR_DATA_DIR,
            collectionName,
            embeddingModel,
            enricher: async (passages) => {
              if (passages[0].index === 8) {
                failedBatchCalls += 1
                throw new Error('Permanent enrichment error (test)')
              }

              return passages.map((passage) => ({
                index: passage.index,
                topics: ['peralihan_penutup'],
                tags: ['peralihan'],
              }))
            },
          },
        ),
        /Permanent enrichment error/,
      )

      assert.equal(failedBatchCalls, 2)
      assert.deepEqual(readdirSync(storageDir), filesBefore)
      assert.equal((await documentsOf(enrichRerunAnalystId)).length, 0)
      assert.equal((await pointsWhere('analystId', enrichRerunAnalystId)).length, 0)

      const [{ n: pageCountAfterFail }] =
        await db.$client`select count(*)::int as n from "document_page"`
      const [{ n: passageCountAfterFail }] =
        await db.$client`select count(*)::int as n from "passage"`
      assert.equal(pageCountAfterFail, pageCountBefore)
      assert.equal(passageCountAfterFail, passageCountBefore)

      const rerun = await ingestDocument(
        { path: pdfPath, ...METADATA, title: 'Perda Uji Gagal Lalu Ulang' },
        {
          library,
          analystId: enrichRerunAnalystId,
          storageDir,
          ocrDataDir: OCR_DATA_DIR,
          collectionName,
          embeddingModel,
          enricher: defaultEnricher,
        },
      )

      assert.ok(!rerun.skipped)
      assert.equal(rerun.passageCount, 10)

      const documents = await documentsOf(enrichRerunAnalystId)
      assert.deepEqual(
        documents.map((doc) => doc.id),
        [rerun.documentId],
      )
      assert.ok(documents[0].indexedAt)
      assert.equal((await pagesOf(rerun.documentId)).length, 1)
      assert.equal((await passagesOf(rerun.documentId)).length, 10)
      assert.equal((await pointsWhere('analystId', enrichRerunAnalystId)).length, 10)
    })
  },
)
