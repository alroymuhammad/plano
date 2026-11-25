import type { IngestDocumentInput, IngestDocumentOptions, IngestDocumentResult } from '../../types'
import { createIngestDocumentPipeline } from './pipeline'

export async function ingestDocument(
  input: IngestDocumentInput,
  options: IngestDocumentOptions,
): Promise<IngestDocumentResult> {
  const { output } = await createIngestDocumentPipeline(options).run({
    input,
    abortSignal: options.signal,
  })

  return output
}
