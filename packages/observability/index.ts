import type { AgentObservabilityOptions } from '@anvia/core/observability'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { LensClient } from '@anvia/lens'
import type { LensClientOptions } from '@anvia/lens'

export function createLens(options: LensClientOptions = {}) {
  const serviceName = process.env.ANVIA_LENS_SERVICE_NAME?.trim() || 'plano'
  const client = new LensClient({ optional: true, serviceName, ...options })
  const observability: AgentObservabilityOptions = {
    observers: { lens: client.observer() },
    primaryTrace: 'lens',
  }
  const pipelineObservability: PipelineObservabilityOptions = {
    observers: { lens: client.pipelineObserver() },
    primaryTrace: 'lens',
  }
  return { client, observability, pipelineObservability }
}
