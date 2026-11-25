// About 800 tokens of Indonesian text per Passage, with about 15% overlap inside a Pasal.
export const PASSAGE_MAX_CHARS = 3000
export const PASSAGE_OVERLAP_CHARS = 450
// Anvia's defaults, passed explicitly so an Anvia upgrade cannot move Passage boundaries silently.
export const PASSAGE_SEPARATORS = ['\n\n', '\n', '. ', ' ']
// Embedding batches in flight at once. The batch size (100) is set on the model in utils/embedding.ts.
export const PASSAGE_INDEX_CONCURRENCY = 2
