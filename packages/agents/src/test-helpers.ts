import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { EmbeddingModel } from '@anvia/core/embeddings'
import type { PassageEnricher, PassageTopic } from './types'

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'

export const OCR_DATA_DIR = fileURLToPath(new URL('../data/tessdata', import.meta.url))

export function fakeEmbeddingModel({ fail = false }: { fail?: boolean } = {}): EmbeddingModel {
  return {
    provider: 'fake',
    modelId: 'fake-1536',
    dimensions: 1536,
    maxBatchSize: 100,
    async embedTexts(texts) {
      if (fail) throw new Error('Embedding failed (test)')

      return texts.map((document) => {
        const digest = createHash('sha256').update(document).digest()

        return {
          document,
          vector: Array.from({ length: 1536 }, (_, i) => 1 + digest[i % digest.length] / 255),
        }
      })
    },
  }
}

export function fakeEnricher({
  topics = [],
  tags = [],
}: {
  topics?: PassageTopic[]
  tags?: string[]
} = {}): PassageEnricher {
  return async (passages) => passages.map((passage) => ({ index: passage.index, topics, tags }))
}

export async function qdrantRest(method: string, path: string, body?: object) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }

  if (process.env.QDRANT_API_KEY) headers['api-key'] = process.env.QDRANT_API_KEY

  const response = await fetch(`${QDRANT_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${await response.text()}`)
  }

  return (await response.json()).result
}

export function textPdf(pages: string[][]): Buffer {
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
