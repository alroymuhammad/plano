import type { DocumentsResult, FindDocumentsOptions } from '../types'
import { createFindDocumentsPipeline } from './pipeline'

export async function findDocuments(
  query: string,
  options: FindDocumentsOptions = {},
): Promise<DocumentsResult> {
  const { output } = await createFindDocumentsPipeline(options).run({ input: query })

  return output
}
