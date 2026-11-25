# 0018 — Gateway models only: DeepSeek for agents, GPT-6 Luna for judging

Status: accepted (embeddings superseded by 0021)
Date: 2026-11-24

## Context

[0008](0008-devscale-gateway-models.md) added `@anvia/anthropic` as a fallback. Checked on 2026-11-24: the gateway (`https://gateway.devscale.id/v1`) serves no Claude model (the Anthropic route returns 404, the OpenAI route "Unknown model"), and there is no Anthropic key. The budget is tight. Supersedes 0008.

## Decision

- Every model call goes through the gateway with `@anvia/openai` (`api: 'chat'`), `GATEWAY_BASE_URL` and `GATEWAY_API_KEY`. `@anvia/anthropic` and the `provider` option are removed.
- Agents and pipeline steps use `deepseek-v4.1-flash-1017` (`DEFAULT_MODEL`).
- LLM judges use `gpt-6-luna` (`JUDGE_MODEL`): the cheapest model from another family, so the judge does not grade its own model's work. It rejects `temperature`, so the judge drops it before each call.
- Models on the gateway on 2026-11-24 (USD per 1M tokens):

| Model                               | Context | Input   | Output  |
| ----------------------------------- | ------- | ------- | ------- |
| `deepseek-v4-flash-0731`            | 1.0M    | $0.242  | $0.726  |
| `deepseek-v4-pro`                   | 1.0M    | $1.452  | $4.356  |
| `deepseek-v4-pro-0813`              | 1.0M    | $1.888  | $5.663  |
| `deepseek-v4.1-flash`               | 1.0M    | $0.33   | $1.32   |
| `deepseek-v4.1-flash-1017`          | 1.0M    | $0.33   | $1.32   |
| `gemini-3.8-flash`                  | 1.0M    | $1.073  | $5.363  |
| `gemma-4-26b-a4b-it`                | 262K    | $0.099  | $0.341  |
| `gemma-4-31b`                       | 256K    | $0.165  | $0.44   |
| `gemma-4-31b-it`                    | 262K    | $0.165  | $0.44   |
| `glm-4.7-flash`                     | 198K    | $0.0715 | $0.44   |
| `glm-5.2`                           | 1.0M    | $1.54   | $4.84   |
| `glm-5.3`                           | 1.0M    | $1.54   | $4.84   |
| `glm-5.3-flash`                     | 1.0M    | $0.165  | $0.55   |
| `gpt-5.6-luna`                      | 272K    | $0.22   | $1.32   |
| `gpt-5.6-sol`                       | 272K    | $4.40   | $22.00  |
| `gpt-5.6-terra`                     | 272K    | $2.20   | $13.20  |
| `gpt-6-sol`                         | 272K    | $2.20   | $11.00  |
| `gpt-6.1-sol`                       | 500K    | $2.20   | $11.00  |
| `gpt-6-luna`                        | 272K    | $0.11   | $0.55   |
| `openai-gpt-oss-120b`               | 128K    | $0.11   | $0.55   |
| `grok-4.5`                          | 500K    | $2.20   | $6.60   |
| `grok-4.7`                          | 500K    | $2.20   | $6.60   |
| `hy3`                               | 192K    | $0.154  | $0.638  |
| `hy4-flash`                         | 1.0M    | $0.0385 | $0.1546 |
| `hy4-preview`                       | 1.0M    | $0.9174 | $2.7511 |
| `jev-1.14`                          | 66K     | $0.042  | $0.00   |
| `kimi-k2.6`                         | 262K    | $1.045  | $4.40   |
| `kimi-k2.7-code`                    | 262K    | $1.045  | $4.40   |
| `minimax-m3-1-flash`                | 1.0M    | $0.165  | $0.66   |
| `muse-ember`                        | 1.0M    | $0.11   | $0.55   |
| `muse-spark-1.3-contributor`        | 1.0M    | $0.11   | $0.22   |
| `nvidia-nemotron-3-super-120b`      | 256K    | $0.088  | $0.495  |
| `nvidia-nemotron-3-ultra-550b-a55b` | 1.0M    | $0.858  | $3.432  |
| `qwen3.8-max`                       | 1.0M    | $2.20   | $6.60   |
| `qwen3-coder-next`                  | 256K    | $0.132  | $0.88   |
| `qwen3.7-max`                       | 1.0M    | $3.432  | $13.73  |
| `qwen3.7-plus`                      | 1.0M    | $1.32   | $5.28   |
| `qwen3.8-2.4t-a95b`                 | 1.0M    | $2.20   | $6.60   |
| `qwen3.8-flash`                     | 1.0M    | $0.165  | $0.517  |
| `qwen3.8-max-0902`                  | 1.0M    | $2.20   | $6.60   |
| `qwen3.8-omni-flash`                | 1.0M    | $0.165  | $0.517  |
| `qwen4-max`                         | 1.0M    | $1.5675 | $4.7025 |

## Consequences

One key and one bill. A model the gateway drops breaks its callers until the constant changes. Check this list against `GET /v1/models` before picking another model.
