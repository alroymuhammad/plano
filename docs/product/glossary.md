# Glossary

Canonical product terms. Use them in UI, code, and docs, and avoid the listed synonyms.

## Cases

- **Case**: a development or permit request under analysis: what activity, by whom, where. _Avoid_: permit check, application, ticket.
- **Analyst**: the person running an Analysis Session. In the MVP, a planology student; later, a government reviewer or verifier. _Avoid_: user, reviewer (reserved for the later government role).
- **Purpose Prompt**: the opening free text where the Analyst says what they're analysing and why. Seeds an Analysis Session. _Avoid_: query, search.
- **Analysis Session**: the workspace for one Case: Case Details, Analysis Draft, and chat. _Avoid_: project, conversation.
- **Case Details**: the structured facts of a Case (activity, Area, zone, scale), used as the session title and header. _Avoid_: metadata, form.
- **Analysis Draft**: the editable document in a session: Applicable Provisions, what they say about the Case, conflicts, and the Analyst's own conclusion. _Avoid_: verdict, assessment, report.
- **Draft Template**: the format chosen for an Analysis Draft (e.g. permit header only, full analysis). _Avoid_: style, layout.

## Location

- **Area**: the location a Case or question refers to, at any level (city, kecamatan, kelurahan, planning unit, block, zone), as structured fields, free text, or both. _Avoid_: location, region, site.
- **Area Hierarchy**: city ⊇ kecamatan ⊇ kelurahan ⊇ planning unit. A document covering a parent Area covers its children. Surabaya only in the MVP. _Avoid_: gazetteer.

## Documents

- **Library**: an Analyst's own document collection, shared across their sessions. _Avoid_: corpus, knowledge base.
- **Document Discovery**: finding candidate documents outside the Library, ranked by Source Credibility, and importing them only after confirmation. _Avoid_: crawl, scrape.
- **Source Credibility**: fixed ranking of origin: Official (JDIH portals, BPK, GISTARU) > Government (other .go.id) > Open Web. Open Web is never verified. _Avoid_: trust score.
- **Document Status**: active, superseded, or revoked. Supersession is proposed only from explicit revoke/amend text, and the Analyst confirms it. _Avoid_: validity.
- **Recency**: how new a document is (effective date or year). Ranks documents and never marks one superseded on its own. _Avoid_: latest version.
- **Metadata Card**: the agent-filled, Analyst-confirmed record of a document's type, number and year, Area, period, effective date, status, and amends/supersedes links, each field backed by a quote. _Avoid_: document info.
- **Document Tier**: Tier 1 (RTRW, RDTR/Zonasi, RPJMD/RPJPD) is parsed, tuned, and evaluated; Tier 2 (sectoral, national, KLHS) is searchable only.
- **Applicable Provision**: a provision from an active document whose Area and period cover the Case. _Avoid_: rule, relevant chunk.
- **Zoning Classification**: an activity's status in a zone: I (permitted), T (limited), B (conditional), X (prohibited). Quoted, never a verdict. _Avoid_: permission, approval.
- **Activity Mapping**: the link from a Case's activity and Area to a zone and activity row in a zoning regulation, shown so the Analyst can check it. _Avoid_: classification.
