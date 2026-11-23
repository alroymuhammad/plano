import type { DocumentsResult } from '../types'
import { createFindDocumentsPipeline } from './pipeline'

export async function findDocuments(query: string): Promise<DocumentsResult> {
  const { output } = await createFindDocumentsPipeline().run({ input: query })

  return output
}
