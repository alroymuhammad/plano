# 0016 — Find Documents level, number, merge and search rules

Status: accepted
Date: 2026-11-24

## Context

[0009](../product/0009-find-documents-by-jurisdiction-level.md) groups Find Documents results by Jurisdiction Level. [0014](0014-find-documents-pipeline.md) fixed the pipeline and its domains. This records the rules that turn each search hit into a Document Result: its Jurisdiction Level, number, year, Source Credibility and merged links. The eval metrics in [0015](0015-find-documents-eval-suite.md) check these rules, so they are written down here.

## Decision

- Level comes from the issuer, not the host. A national type (UU, PP, Perpres, Permen) is National, whatever region the title or URL names. Otherwise the first region phrase in the title decides: Kota Surabaya is City, Provinsi Jawa Timur is Province. A title with no region phrase falls back to the decoded URL path. Any other region has no level, so its hit is dropped.
- Number and year come from the document's own identifier. The title is read first, then the decoded URL path, then the excerpt. A typed document's identifier is the one directly after its own type phrase, up to "tentang". The phrase must open the title or a line of the excerpt, and only region words may come between it and "Nomor". In the excerpt, only the first such line is read. A reference list or an amendment clause is not read, because the identifier must come directly after an opening phrase. An Other document reads the URL path only. A "No." or "Nomor" token gives the number, kept whole (`19/PRT/M/2018`). The year is the one after "Tahun", else the last part of a slashed number. Without a token, the first number and year pair in the URL path is used. Blank when no source has one.
- Type comes from the start of the title, else from the start of the excerpt. A document with no type phrase at either start is Other, for example "BPK PERDA 3-2017" when its excerpt opens with no type phrase either.
- Source Credibility comes from the host. Official for the domains in 0014 and their subdomains, Government for any other `.go.id`, Open Web for the rest. Ranking: Official, Government, Open Web.
- Each level shows at most five results. They are the first five in Source Credibility order, with search order kept within a tier. Relevance ranking, the "tidak ditemukan" (not found) message and model-written titles are not decided here. They belong to issue #5.
- Listing pages are dropped. A hit whose URL carries `?tahun=` or `&page=` is a search or category page, not a document, and is dropped before levels are assigned.
- Merge key: two Document Results at one Jurisdiction Level with the same type, number and year are one document. Other documents, and results without a number or year, are never merged.
- Merge fields: for a group of two or more copies, the base is the copy with the best Source Credibility (ties keep search order). `officialUrl` is the first official copy's URL. `alternateUrls` holds every other URL of the copies. `downloadUrl` is the first file URL among the copies' own links, official copies first, returned as found. The download check runs last, as in 0014.
- Search plan: an in-scope run makes seven Tavily searches. One per national portal (four, each limited to its domain), one for Province, one for City, and one Open Web search with the City phrase and no domain limit. The Province phrase drops "izin" and "perizinan", because the Jawa Timur index returns nothing for them. An out-of-scope question makes no search. Each branch reports the raw URLs of its hits through `onSearch` for every level it covers. The Open Web branch covers all three levels, so its URLs count under each.
- Model: level, region, merge, number and year are deterministic code. The model reads the query only, as in 0014.
- Controls: each metric has negative and positive controls in `evals/controls.ts`, run offline by `pnpm --filter @plano/agents eval:controls` (the dead-link controls need network). A control names every metric it expects to fail, because an undeclared metric passes. The number-year metric repeats the number and year rule rather than importing it, so it checks the output without reusing the code it tests.

## Consequences

- A regulation with a number and year, found on two sites at one level, is shown once with its official link.
- A number or year that the excerpt and URL do not state stays blank, so some results show none. Results without one, and Other documents, are not merged and can show twice.
- A level with more than five results drops the rest, so Open Web results are the first to go.
- A document with no type phrase at the start of its title or excerpt is typed Other, so its number and year come from its URL only.
- This supersedes the search count in 0015 (three searches per case, at most six in flight). With seven per case and two cases at a time, up to fourteen can be in flight. 0015 is not edited here, so it still states the old count until it is marked superseded by 0016.
- A change to a rule needs its control and its metric changed together, and `eval:controls` run.
