// About 800 tokens of Indonesian text per Passage, with about 15% overlap inside a Pasal.
export const PASSAGE_MAX_CHARS = 3000
export const PASSAGE_OVERLAP_CHARS = 450
// Anvia's defaults, passed explicitly so an Anvia upgrade cannot move Passage boundaries silently.
export const PASSAGE_SEPARATORS = ['\n\n', '\n', '. ', ' ']
