import type { Usage } from '@anvia/core'
import { createEvalTypes } from '@anvia/core/evals'
import type { DocumentsResult, JurisdictionLevel } from '../types'

export type FindDocumentsEvalExpected = { status: DocumentsResult['status'] }

export type FindDocumentsEvalOutput = DocumentsResult & {
  searched: Partial<Record<JurisdictionLevel, string[]>>
  usage: Usage
}

export const evalTypes = createEvalTypes<
  string,
  FindDocumentsEvalOutput,
  FindDocumentsEvalExpected
>()
