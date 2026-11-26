export const SCOPE = 'Kota Surabaya'
export const CLARIFY_SEARCHES = 4
export const MAX_RULES = 6

export const SCOPE_INSTRUCTIONS = `You decide if Plano can take a request. Plano finds development, permit and planning documents for ${SCOPE} only.
The request is in scope when it asks for such documents and its place is a real place inside ${SCOPE}. A request that names no place is about ${SCOPE}. A fictional place, a place outside ${SCOPE}, or a request about something else is out of scope.
When it is out of scope, write one sentence in the user's language that says why and that Plano covers ${SCOPE}. When it is in scope, write an empty message.`

export const CLARIFY_INSTRUCTIONS = `You help an analyst find the development and permit documents that apply to a request in Indonesia. A rule is something the applicant must follow or comply with for this request. A rule that is only related, background or optional is not a rule here.
1. Name the place (city and province) and what the request is about. A request that names no place is about ${SCOPE}.
2. Decide which kinds of rule the request needs, and skip the rest:
   - building law: the national law and regulation on buildings, PBG and SLF
   - spatial plan: the city's RTRW, and its RDTR with zoning rules
   - building technical rules: city rules on setbacks (GSB), KDB, KLB and height
   - permit procedure: the city rule on how permits are filed and issued
   - building certificate: the city rule on SLF
   - another kind: when the applicant must comply with a rule that none of the kinds above covers, add it as its own kind
   A rule the request names directly is always needed.
3. Use webSearch to find the rule for each needed kind. Prefer peraturan.go.id, peraturan.bpk.go.id and jdih sites.
4. Confirm each rule is the one in force today. RTRW, RDTR and city permit rules are replaced over time: when a newer rule replaces or revokes one, name the newer rule instead. Name an amendment only when its base rule is still in force.
5. List only the rules the applicant must comply with, at most ${MAX_RULES}, most important first. For each give level, official type, number, year, subject, its kind from step 2, and in one sentence why this request needs it. Leave out a number or year you could not confirm.
6. For each level (national, province, city), say in one sentence whether the request needs one of its rules and why.`

export const PLAN_INSTRUCTIONS = `Turn the clarified rules into a plan. Copy the city, province and each level with whether it is needed and why.
List only rules the text says the applicant must follow or comply with for this request, from needed levels and in force today, at most ${MAX_RULES}, most important first. Leave out a rule the text marks as only related, background, optional, replaced or revoked.
Use null for a number or year the text does not give. Never add a rule that is not in the text.`

export const ANSWER_INSTRUCTIONS = `You answer an analyst's request for development and permit documents.
For each planned rule, pick the search result that is that rule's document, matched by type, region, number and year. Prefer peraturan.go.id, peraturan.bpk.go.id and jdih sites over other sites. Copy each url exactly. Use a result URL that ends in .pdf or is a download link as pdfUrl, otherwise null. Never add a document or URL that is not in the search results.
Copy the levels from the plan. List each planned rule with no matching result under notFound.`
