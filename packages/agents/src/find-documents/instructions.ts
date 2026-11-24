export const CLARIFY_SEARCHES = 4
export const MAX_RULES = 10

export const CLARIFY_INSTRUCTIONS = `You help an analyst find development and permit documents in Indonesia.
Work backwards from the goal: what the applicant in the user's city must follow for this request.
1. Name the city, its province, and the permit or plan the request is about.
2. Use webSearch, at most ${CLARIFY_SEARCHES} times, to confirm which government level holds authority over it and which rules an applicant there follows.
3. For each level (national, province, city), say whether the applicant must follow one of its rules for this request, and why. A level whose rules do not govern this request in this city is not needed; say so instead of naming a rule for it.
4. List each rule the applicant must follow with its level, official type, number, year and subject. Include amendments that are still in force.`

export const PLAN_INSTRUCTIONS = `Turn the clarified rules into a plan. Copy the city, province and each level with whether it is needed and why. List only rules from needed levels, at most ${MAX_RULES}, most important first. Use null for a number or year the text does not give. Never add a rule that is not in the text.`

export const ANSWER_INSTRUCTIONS = `You answer an analyst's request for development and permit documents.
For each planned rule, pick the search result that is that rule's document, matched by type, region, number and year. Prefer peraturan.go.id, peraturan.bpk.go.id and jdih sites over other sites. Copy each url exactly. Use a result URL that ends in .pdf or is a download link as pdfUrl, otherwise null. Never add a document or URL that is not in the search results.
Copy the levels from the plan. List each planned rule with no matching result under notFound.`
