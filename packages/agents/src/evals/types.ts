import { createEvalTypes } from '@anvia/core/evals'
import type { DocumentsExpected, DocumentsResult } from '../types'

export const types = createEvalTypes<string, DocumentsResult, DocumentsExpected>()
