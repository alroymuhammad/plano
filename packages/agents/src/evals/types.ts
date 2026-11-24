import type { Usage } from '@anvia/core'
import { createEvalTypes } from '@anvia/core/evals'
import type { DocumentResult, DocumentsResult, JurisdictionLevel } from '../types'

export type FindDocumentsEvalExpected = { status: DocumentsResult['status'] }

export type FindDocumentsEvalOutput = DocumentsResult & {
  searched: Partial<Record<JurisdictionLevel, string[]>>
  usage: Usage
}

// number and year are optional. number-and-year checks them only on results that set them.
export type IdentifiedDocumentResult = DocumentResult & { number?: string; year?: string }

export const evalTypes = createEvalTypes<
  string,
  FindDocumentsEvalOutput,
  FindDocumentsEvalExpected
>()
