import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createDb, createLibraryStore, type Db, type LibraryStore } from '@plano/db'
import type { IngestDocumentInput, IngestDocumentResult } from '../../types'
import { ingestDocument } from '../../workflows/ingest-document'
import { fakeEmbeddingModel, OCR_DATA_DIR, qdrantRest } from '../../test-helpers'
import { createSearchLibraryTool } from './index'

function textPdf(pages: string[][]): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + 2 * i} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  pages.forEach((lines, i) => {
    const text = lines.map((line) => `(${line.replace(/[\\()]/g, '\\$&')}) Tj T*`).join('\n')
    const content = `BT /F1 12 Tf 56 780 Td 14 TL\n${text}\nET`

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    )
  })

  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const offset = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xrefAt = pdf.length

  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}

function twoPageOrdinance(version: string) {
  return textPdf([
    [
      'BAB I',
      'KETENTUAN UMUM',
      'Pasal 1',
      'Ruang lingkup Peraturan Daerah ini meliputi wilayah Kota Uji.',
      'Pasal 2',
      'Jangka waktu perencanaan tata ruang adalah 20 tahun, dari tahun 2025 sampai tahun 2045.',
    ],
    [
      'Peninjauan kembali dilakukan setiap 5 tahun sekali.',
      'Pasal 3',
      'Peta wilayah perencanaan ditetapkan dalam lampiran.',
      'Pasal 4',
      'Tujuan penataan ruang adalah ruang yang aman dan produktif.',
      'Pasal 5',
      'Kebijakan penataan ruang mengacu pada rencana nasional.',
      'Pasal 6',
      'Strategi penataan ruang dilaksanakan secara bertahap.',
      'Pasal 7',
      'Ketentuan lebih lanjut diatur dengan Peraturan Bupati.',
      'Pasal 8',
      `Naskah ${version}.`,
    ],
  ])
}

const METADATA = {
  title: 'Perda Uji 9/2025',
  type: 'Perda',
  number: '9',
  year: 2025,
  area: 'Kota Uji',
}

describe('searchLibrary', () => {
  const analystId = randomUUID()
  const otherAnalystId = randomUUID()
  const collectionName = `plano-test-search-${randomUUID()}`
  const embeddingModel = fakeEmbeddingModel()
  const tool = createSearchLibraryTool(analystId, { embeddingModel, collectionName })
  let db: Db
  let library: LibraryStore
  let sourceDir: string
  let storageDir: string
  let own: IngestDocumentResult
  let second: IngestDocumentResult
  let superseded: IngestDocumentResult
  let unconfirmed: IngestDocumentResult
  let other: IngestDocumentResult
  let pasal2Id: string
  let query: string

  const ingest = (analyst: string, path: string, card: Partial<IngestDocumentInput> = {}) =>
    ingestDocument(
      { path, ...METADATA, ...card },
      {
        library,
        analystId: analyst,
        storageDir,
        ocrDataDir: OCR_DATA_DIR,
        collectionName,
        embeddingModel,
      },
    )

  const passagesOf = (documentId: string) =>
    db.query.passage.findMany({
      where: (t, { eq }) => eq(t.documentId, documentId),
      orderBy: (t, { asc }) => [asc(t.index)],
    })

  const pagesOf = (documentId: string) =>
    db.query.documentPage.findMany({
      where: (t, { eq }) => eq(t.documentId, documentId),
      orderBy: (t, { asc }) => [asc(t.page)],
    })

  before(async () => {
    const url = process.env.DATABASE_URL

    if (!url) throw new Error('Set DATABASE_URL in .env (see .env.example) to run these tests')

    db = createDb(url)
    library = createLibraryStore(db)
    sourceDir = await mkdtemp(join(tmpdir(), 'plano-search-src-'))
    storageDir = await mkdtemp(join(tmpdir(), 'plano-search-'))

    const write = async (name: string, version: string) => {
      const path = join(sourceDir, name)

      await writeFile(path, twoPageOrdinance(version))
      return path
    }

    own = await ingest(analystId, await write('own.pdf', 'A'))
    second = await ingest(analystId, await write('second.pdf', 'B'))
    superseded = await ingest(analystId, await write('superseded.pdf', 'C'), {
      status: 'superseded',
    })
    unconfirmed = await ingest(analystId, await write('unconfirmed.pdf', 'D'))
    await db.$client`update "document" set "confirmed" = false where "id" = ${unconfirmed.documentId}`
    await qdrantRest('POST', `/collections/${collectionName}/points/payload?wait=true`, {
      payload: { confirmed: false },
      filter: { must: [{ key: 'documentId', match: { value: unconfirmed.documentId } }] },
    })
    other = await ingest(otherAnalystId, await write('other.pdf', 'A'))

    const [pasal2] = (await passagesOf(own.documentId)).filter((passage) =>
      passage.text.startsWith('Pasal 2\n'),
    )
    pasal2Id = pasal2.id
    query = `${pasal2.heading}\n${pasal2.text}`
  })

  after(async () => {
    await db.$client`delete from "document" where "analystId" = any(${[analystId, otherAnalystId]})`
    await qdrantRest('DELETE', `/collections/${collectionName}`)
    await db.$client.end()
    await rm(sourceDir, { recursive: true, force: true })
    await rm(storageDir, { recursive: true, force: true })
  })

  it('returns the Passage with its document, pages, and heading', async () => {
    const results = await tool.call({ query, topK: 20 })
    const hit = results.find((result) => result.passageId === pasal2Id)

    assert.ok(hit, 'Pasal 2 is not in the results')
    assert.deepEqual(hit.document, {
      id: own.documentId,
      title: METADATA.title,
      type: 'Perda',
      number: '9',
      year: 2025,
    })
    assert.equal(hit.pageStart, 1)
    assert.equal(hit.pageEnd, 2)
    assert.equal(hit.heading, `${METADATA.title} › BAB I KETENTUAN UMUM › Pasal 2`)
    assert.ok(hit.score > 0.99, `an exact match should score about 1, got ${hit.score}`)
  })

  it('quotes the Passage text without its heading', async () => {
    const results = await tool.call({ query, documentIds: [own.documentId], topK: 20 })
    const hit = results.find((result) => result.passageId === pasal2Id)

    assert.ok(hit, 'Pasal 2 is not in the results')
    assert.equal(
      hit.quote,
      'Pasal 2\nJangka waktu perencanaan tata ruang adalah 20 tahun, dari tahun 2025 sampai tahun 2045.\nPeninjauan kembali dilakukan setiap 5 tahun sekali.',
    )
  })

  it('quotes only verbatim text from the pages each result cites', async () => {
    const results = await tool.call({ query, topK: 20 })
    const passages = [
      ...(await passagesOf(own.documentId)),
      ...(await passagesOf(second.documentId)),
    ]

    assert.ok(results.length > 0)
    for (const result of results) {
      const passage = passages.find((row) => row.id === result.passageId)
      assert.ok(passage, `${result.passageId} is not a Passage of the Analyst's documents`)

      const cited = (await pagesOf(passage.documentId))
        .filter((page) => page.page >= result.pageStart && page.page <= result.pageEnd)
        .map((page) => page.text)
        .join('\n')

      assert.ok(cited.includes(result.quote), `${result.passageId} is not in its cited pages`)
    }
  })

  it('never returns a Passage of another Analyst, an unconfirmed document, or a superseded one, even when its text matches exactly', async () => {
    const results = await tool.call({ query, topK: 20 })
    const eligible = [
      ...(await passagesOf(own.documentId)),
      ...(await passagesOf(second.documentId)),
    ].map((passage) => passage.id)

    assert.deepEqual(results.map((result) => result.passageId).sort(), eligible.sort())
  })

  it('limits results to the documentIds given', async () => {
    const results = await tool.call({ query, documentIds: [second.documentId], topK: 20 })
    const ids = (await passagesOf(second.documentId)).map((passage) => passage.id)

    assert.deepEqual(results.map((result) => result.passageId).sort(), ids.sort())
  })

  it('returns nothing when documentIds name a document of another Analyst or an ineligible one', async () => {
    const results = await tool.call({
      query,
      documentIds: [other.documentId, superseded.documentId, unconfirmed.documentId],
      topK: 20,
    })

    assert.deepEqual(results, [])
  })

  it('returns 8 Passages when topK is not given', async () => {
    const results = await tool.call({ query })

    assert.equal(results.length, 8)
  })

  it('rejects a topK above 20', async () => {
    await assert.rejects(async () => tool.call({ query, topK: 21 }))
  })
})
