import type { DocumentResult, DocumentsResult } from '../types'

export type LinkStatus = 'alive' | 'dead' | 'unknown'

type Probe = number | 'unresolvable' | 'failed'

const REQUEST_TIMEOUT_MS = 5000
const STAGE_TIMEOUT_MS = 8000
const FILE_EXTENSION = /\.(pdf|docx?|xlsx?|zip)$/

function isUnresolvable(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined

  return cause instanceof Error && 'code' in cause && cause.code === 'ENOTFOUND'
}

async function probe(url: string, method: 'HEAD' | 'GET', signal: AbortSignal): Promise<Probe> {
  try {
    const response = await fetch(url, {
      method,
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
      signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), signal]),
    })
    const status = response.status

    await response.body?.cancel().catch(() => undefined)

    return status
  } catch (error) {
    return isUnresolvable(error) ? 'unresolvable' : 'failed'
  }
}

// HEAD settles a live link or a missing domain. GET decides the rest, because many servers refuse HEAD.
export async function checkLink(url: string, signal: AbortSignal): Promise<LinkStatus> {
  const head = await probe(url, 'HEAD', signal)

  if (head === 'unresolvable') return 'dead'

  if (head === 'failed') return 'unknown'

  if (head < 400) return 'alive'

  const get = await probe(url, 'GET', signal)

  if (get === 'unresolvable') return 'dead'

  if (get === 'failed') return 'unknown'

  if (get < 400) return 'alive'

  if (get === 404 || get === 410) return 'dead'

  return 'unknown'
}

function isFileUrl(url: string): boolean {
  try {
    const { protocol, pathname } = new URL(url)
    const path = pathname.toLowerCase()
    const isWeb = protocol === 'https:' || protocol === 'http:'

    return isWeb && (FILE_EXTENSION.test(path) || path.includes('/download/'))
  } catch {
    return false
  }
}

// Returns one of the URLs as given: a file link is one the search already found, never a built one.
export function downloadUrlOf(urls: string[]): string | undefined {
  return urls.find(isFileUrl)
}

// A result without a download link takes its first file URL, the source before the official link.
function withDownloadUrl(result: DocumentResult): DocumentResult {
  if (result.downloadUrl) return result

  const urls = [result.sourceUrl, result.officialUrl].filter((url) => url !== undefined)
  const downloadUrl = downloadUrlOf(urls)

  if (!downloadUrl) return result

  return { ...result, downloadUrl }
}

function withoutLink(result: DocumentResult): DocumentResult {
  const copy = { ...result }

  delete copy.downloadUrl

  return copy
}

async function checkResult(result: DocumentResult, signal: AbortSignal): Promise<DocumentResult> {
  const url = result.downloadUrl

  if (!url) return result

  const status = await checkLink(url, signal)
  const keep = status === 'alive' || (status === 'unknown' && result.credibility === 'official')

  if (keep) return result

  return withoutLink(result)
}

// Drops the download link of a result, never the result: a dead or unchecked link is removed, the source stays.
export async function checkDownloadLinks(
  output: DocumentsResult,
  options: { abortSignal?: AbortSignal } = {},
): Promise<DocumentsResult> {
  if (output.status === 'out_of_scope') return output

  const signals = [AbortSignal.timeout(STAGE_TIMEOUT_MS)]

  if (options.abortSignal) signals.push(options.abortSignal)

  const signal = AbortSignal.any(signals)
  const checkLevel = (results: DocumentResult[]) =>
    Promise.all(results.map((result) => checkResult(withDownloadUrl(result), signal)))
  const [national, province, city] = await Promise.all([
    checkLevel(output.levels.national),
    checkLevel(output.levels.province),
    checkLevel(output.levels.city),
  ])

  if (options.abortSignal?.aborted) throw options.abortSignal.reason

  return { ...output, levels: { national, province, city } }
}
