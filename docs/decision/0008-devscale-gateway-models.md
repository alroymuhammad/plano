# 0008 — Devscale gateway for models, Anthropic adapter as fallback

Status: superseded by 0018
Date: 2026-11-20

## Context

Agents need a model provider. The Devscale gateway (`https://gateway.devscale.id/v1`) is OpenAI-compatible and routes many models behind one key. Extends 0002.

## Decision

- `packages/agents` sends requests through the gateway via `@anvia/openai` (`api: 'chat'`), configured with `GATEWAY_BASE_URL` and `GATEWAY_API_KEY`.
- Default model: `deepseek-v4.1-flash-1017` (cheapest working).
- Add `@anvia/anthropic` as a fallback provider (default `claude-haiku-5-5`). It uses `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` when set, else the gateway values.

## Consequences

One key and one bill for all models. The gateway only documents the OpenAI-compatible API, so the Anthropic path through it is unverified.
