// About 800 tokens of Indonesian text per Passage, with about 15% overlap inside a Pasal.
export const PASSAGE_MAX_CHARS = 3000
export const PASSAGE_OVERLAP_CHARS = 450
// Anvia's defaults, passed explicitly so an Anvia upgrade cannot move Passage boundaries silently.
export const PASSAGE_SEPARATORS = ['\n\n', '\n', '. ', ' ']
// Embedding batches in flight at once. The batch size (100) is set on the model in utils/embedding.ts.
export const PASSAGE_INDEX_CONCURRENCY = 2

// A page with fewer characters of text than this is scanned and OCR'd (product 0011).
export const OCR_MIN_PAGE_CHARS = 50
// PDF points are 72 dpi, so scale 2 renders a scanned page at about 144 dpi for tesseract.
export const OCR_SCALE = 2
export const OCR_LANG = 'ind'
// The tessdata_best model that tesseract.js uses by default. The gzip download is about 1.2 MB; the file is about 1.8 MB.
export const OCR_LANG_URL = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/ind/4.0.0_best_int'
// sha256 of the unpacked file, the one tesseract.js reads from the cache (computed 2026-11-25 from the CDN file).
export const OCR_LANG_SHA256 = '431ad6931126cfd70a35db57eb14823c090fc6174e0eaf1f400dd06b9cb1baf3'
