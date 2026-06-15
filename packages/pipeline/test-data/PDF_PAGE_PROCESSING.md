# PDF Page Processing

## Overview

Deterministic, memory-safe, retry-safe PDF page extraction using pdfjs-dist. Required for Surya OCR (which needs page images) and optional for Google OCR (which handles PDF natively).

## Implementation

```
splitPdfPages(buffer: Buffer, dpi: number = 300): Promise<{ pages: Buffer[]; pageCount: number }>
```

### Algorithm

```
1. Load PDF via pdfjs-dist.getDocument({ data: buffer })
2. Read doc.numPages
3. For each page (1 → numPages):
   a. doc.getPage(i)
   b. Calculate viewport at dpi/72 scale
   c. Create canvas (canvas package: createCanvas)
   d. Render page to canvas (page.render)
   e. Convert canvas to PNG buffer (canvas.toBuffer)
   f. page.cleanup()
4. doc.destroy()
5. Return { pages: Buffer[pageCount], pageCount }
```

### Error Handling

| Condition                    | Error Code              | Behavior                                 |
| ---------------------------- | ----------------------- | ---------------------------------------- |
| pdfjs-dist not installed     | PDF_SPLIT_NOT_AVAILABLE | Clear install instruction                |
| canvas package not installed | CANVAS_NOT_AVAILABLE    | Clear install instruction, doc destroyed |
| Corrupt PDF                  | pdfjs-dist throws       | Propagates to caller for retry/DLQ       |
| Encrypted PDF                | pdfjs-dist throws       | Propagates to caller for permanent fail  |

### Memory Safety

- Each page is rendered, converted, and cleaned up before the next page
- `doc.destroy()` is called in all paths (including error)
- Canvas `toBuffer()` returns a Buffer that goes to the next pipeline stage
- No accumulation of intermediate state beyond the page image buffers

### Retry Safety

- idempotent: same input always produces same output
- no side effects: no temp files, no external state
- can be retried any number of times

## Dependencies

### Required

```json
"dependencies": {
  "pdfjs-dist": "^4.9.0"
}
```

### Optional (required for rendering)

```json
"peerDependencies": {
  "canvas": "^2.11.0"   // optional: only needed for Surya OCR path
}
```

The `canvas` package is a peer dep because:

- Google OCR path doesn't need page rendering (uploads PDF directly)
- Only Surya OCR needs page images
- canvas requires native compilation (node-gyp)

## DPI Configuration

| DPI | Use Case             | Image Size (A4) |
| --- | -------------------- | --------------- |
| 150 | Draft / speed        | 1240 × 1754     |
| 200 | Balanced             | 1654 × 2339     |
| 300 | Production (default) | 2480 × 3508     |
| 400 | High quality         | 3308 × 4677     |

Higher DPI → better OCR accuracy → more memory/time. 300 DPI is the recommended default.

## Integration

### Google OCR Path (doesn't use splitting)

```
PDF Buffer → GoogleDriveOcrProvider.extractText()
              → Uploads PDF directly to Drive
              → Exports as text/plain
              → Returns OcrEngineResult
```

### Surya OCR Path (requires splitting)

```
PDF Buffer → splitPdfPages(buffer, 300)
              → Buffer[] (page PNGs)
              → SuryaOcrProvider.extractPages(config, pages, name)
                → For each page:
                  → Write temp PNG
                  → Python subprocess: surya.ocr
                  → Parse JSON output
                  → Accumulate results
                → Returns OcrEngineResult
```

## Limitations

1. Memory scales with document size — each page image at 300 DPI is ~1-5 MB as PNG
2. canvas package requires native compilation — not available in all environments
3. pdfjs-dist rendering is CPU-bound — no GPU acceleration
4. Form-fillable PDFs may render differently than static PDFs
