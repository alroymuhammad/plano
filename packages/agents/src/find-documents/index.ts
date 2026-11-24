import type { DocumentsResult, FindDocumentsOptions } from '../types'
import { createFindDocumentsPipeline } from './pipeline'

export async function findDocuments(
  findDocumentPrompt: string,
  options: FindDocumentsOptions = {},
): Promise<DocumentsResult> {
  const { output } = await createFindDocumentsPipeline(options).run({
    input: { findDocumentPrompt },
    abortSignal: options.signal,
  })

  return output
}
