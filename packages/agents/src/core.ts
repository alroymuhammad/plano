import { Agent } from '@anvia/core'
import { BASE_INSTRUCTION } from './instruction'
import { tools as defaultTools } from './tools/tools'
import type { RunAgentOptions } from './types'
import { getModel } from './utils/model'

export function runAgent({
  prompt,
  instructions = BASE_INSTRUCTION,
  tools = defaultTools,
  provider,
  modelId,
  memory,
  session,
  observability,
}: RunAgentOptions) {
  const agent = new Agent({
    id: 'assistant',
    model: getModel(provider, modelId),
    instructions,
    tools,
    memory: memory && { store: memory, savePolicy: 'turn' },
    maxTurns: 75,
    observability,
  })
  return agent.stream({ prompt, session })
}
