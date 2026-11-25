import { fileURLToPath } from 'node:url'

// About 800 tokens of Indonesian text per Passage, with about 15% overlap inside a Pasal.
export const PASSAGE_MAX_CHARS = 3000
export const PASSAGE_OVERLAP_CHARS = 450
// Anvia's defaults, passed explicitly so an Anvia upgrade cannot move Passage boundaries silently.
export const PASSAGE_SEPARATORS = ['\n\n', '\n', '. ', ' ']

// A page with fewer characters of text than this is scanned and OCR'd (product 0011).
export const OCR_MIN_PAGE_CHARS = 50
// PDF points are 72 dpi, so scale 2 renders a scanned page at about 144 dpi for tesseract.
export const OCR_SCALE = 2
export const OCR_LANG = 'ind'
// The tessdata_best model that tesseract.js uses by default; the file is about 1.2 MB.
export const OCR_LANG_URL = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/ind/4.0.0_best_int'
// The language file is downloaded here on first use, then read offline.
export const OCR_DATA_DIR = fileURLToPath(new URL('../../../data/tessdata', import.meta.url))
