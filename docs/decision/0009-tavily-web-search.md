# 0009 — Tavily for agent web search

Status: accepted
Date: 2026-11-20

## Context

Agents need to search the public web. Tavily returns results already shaped for LLMs (snippets plus an optional answer) behind one API key.

## Decision

- `packages/agents` uses `@tavily/core` for the `webSearch` tool, configured with `TAVILY_API_KEY`.
- The client is created on first use, so the package loads without the key.

## Consequences

One more key and bill. Swapping providers only touches `tools/web-search/service.ts`.
