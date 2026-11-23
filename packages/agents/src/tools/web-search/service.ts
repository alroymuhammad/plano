import { tavily, type TavilyClient } from '@tavily/core'

let client: TavilyClient | undefined

export function getClient() {
  if (client) return client

  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) throw new Error('Set TAVILY_API_KEY before using web search')

  client = tavily({ apiKey })
  return client
}

export async function searchWeb(query: string) {
  const response = await getClient().search(query, {
    searchDepth: 'basic',
    maxResults: 5,
    includeAnswer: true,
  })
  const results = response.results.map((r) => `- ${r.title} — ${r.url}\n  ${r.content}`)
  return [`Answer: ${response.answer ?? 'none'}`, ...results].join('\n')
}
