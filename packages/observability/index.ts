import type { AgentObservabilityOptions } from '@anvia/core/observability'
import { LensClient } from '@anvia/lens'
import type { LensClientOptions } from '@anvia/lens'

export function createLens(options: LensClientOptions = {}) {
  const client = new LensClient({ optional: true, ...options })
  const observability: AgentObservabilityOptions = {
    observers: { lens: client.observer() },
    primaryTrace: 'lens',
  }
  return { client, observability }
}
