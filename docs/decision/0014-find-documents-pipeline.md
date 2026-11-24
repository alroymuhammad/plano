# 0014 — Find Documents as a fixed Anvia pipeline over Tavily

Status: superseded by 0016
Date: 2026-11-23

## Context

Product [0009](../product/0009-find-documents-by-jurisdiction-level.md) needs documents from three Jurisdiction Levels, ranked the same way every run so it can be evaluated. Checked on 2026-11-23: the undocumented JDIHN endpoint (`jdihn.go.id/api/search`) returns 404 and the site's TLS chain is broken; `gistaru.atrbpn.go.id` does not resolve and Tavily has nothing for it; `jdih.jatimprov.go.id` returns 403 to non-browser clients; `jdih.surabaya.go.id` times out from our network. All other sources below return results through Tavily.

## Decision

- Find Documents is a fixed `@anvia/core` pipeline in `packages/agents`, not a free agent loop. The model is used in two stages only: reading the query (topic, city, official search phrases per level) and writing titles and descriptions. The chat agent reaches it later through one tool; no MCP server until there is a second consumer.
- Stages: read query → parallel search → assign level by issuer and merge duplicates → check download links → rank and keep top 5 per level → write titles and descriptions → return grouped.
- All search goes through Tavily (0009) with domain-limited searches plus one open-web search. No scrapers, no direct JDIHN calls.
  - National: `peraturan.go.id`, `peraturan.bpk.go.id`, `jdihn.go.id`, `jdih.atrbpn.go.id`
  - Province: `jdih.jatimprov.go.id`
  - City: `jdih.surabaya.go.id`
- BPK and JDIHN host every level and region, so the level comes from the issuer (UU/PP/Perpres/Permen → National; Provinsi Jawa Timur → Province; Kota Surabaya → City), never from the site.
- Download check: 404, 410, or unresolvable → drop. 403 or timeout → keep on Official sources, drop on Open Web.
- No cache. Evals call Tavily live.
- Evals use `@anvia/core/evals` in `packages/agents/src/evals/` (about 12 cases), with results in Lens (0013).

## Consequences

Each run costs about 7 Tavily searches, and an eval run about 85; results drift as sites change. Add a cache when that hurts. Adding a city means adding its province and its JDIH domain to the source map.
