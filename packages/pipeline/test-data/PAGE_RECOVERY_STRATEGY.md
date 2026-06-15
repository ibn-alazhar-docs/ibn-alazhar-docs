# Page Recovery Strategy

## Overview

Resilience mechanism for partial OCR failures: when individual pages fail, the pipeline continues with the remaining pages rather than failing the entire document.

## Failure Detection

### Page-level errors tracked by each provider

```typescript
interface OcrPageResult {
  number: number;
  text: string;
  confidence: number;
}

interface OcrEngineResult {
  pages: OcrPageResult[];
  pageErrors?: { page: number; error: string }[];
}
```

### Error sources

| Source             | Detection                       | Example                |
| ------------------ | ------------------------------- | ---------------------- |
| Upload failure     | Provider catches, records empty | UPLOAD_FAILED          |
| Export failure     | Provider catches, records empty | OCR_NO_TEXT            |
| Timeout            | Worker timeout guard            | SURYA_TIMEOUT          |
| Python crash       | child_process error event       | SURYA_EXECUTION_FAILED |
| Corrupt page image | pdfjs-dist render error         | PDF_PAGE_RENDER_FAILED |
| Provider crash     | OcrManager try/catch            | SURYA_NOT_AVAILABLE    |

## Recovery Flow

```
Document processing starts
        │
        ▼
Split PDF into pages
        │
        ▼
For each page:
  ┌──────────────────────────┐
  │ Try primary provider     │
  │   ├─ Success → store     │
  │   └─ Failure →           │
  │        ┌─────────────┐   │
  │        │ Log error    │   │
  │        │ Store empty  │   │
  │        │ Continue     │   │
  │        └─────────────┘   │
  └──────────────────────────┘
        │
        ▼
After all pages processed:
  ├─ If all pages ok    → normal output
  ├─ If partial failure → output with gaps + report
  └─ If all pages fail  → provider failure
```

## Recovery Strategies

### 1. Skip-and-continue (default)

Failed pages produce empty text, document continues.

```typescript
// ocr-provider.ts — GoogleDriveOcrProvider.extractPages()
try {
  result = await uploadAndOcr(pageImage);
  allPages.push({ number: pageNum, text: result.text });
} catch (err) {
  errors.push({ page: pageNum, error: err.message });
  allPages.push({ number: pageNum, text: "" }); // ← continues
}
```

Used for: network failures, transient API errors, individual page corruption.

### 2. Mixed-engine fallback

When primary provider fails on specific pages, try alternate provider.

```
Primary: Google OCR → page 3 fails (network error)
Fallback: Surya OCR → page 3 retried
Both fail → page 3 marked empty
```

Used for: provider-specific failures — one engine can't read a page that another can.

### 3. Provider-level failover

When entire primary provider is unavailable or failing all pages.

```
OcrManager.extractPages()
  Try provider[0] (Google)  → fails all pages
  Try provider[1] (Surya)   → succeeds
  Return Surya result
```

Used for: credential expiry, quota exhaustion, model loading failure.

## Error Classification for Page Recovery

| Error                  | Strategy          | Retry count  | Log level |
| ---------------------- | ----------------- | ------------ | --------- |
| UPLOAD_FAILED          | Skip-and-continue | 0 (per page) | warn      |
| OCR_NO_TEXT            | Skip-and-continue | 0            | warn      |
| SURYA_TIMEOUT          | Mixed-engine      | 1            | warn      |
| SURYA_EXECUTION_FAILED | Skip-and-continue | 0            | error     |
| NETWORK_ERROR          | Mixed-engine      | 2            | warn      |
| QUOTA_EXCEEDED         | Provider failover | 0            | error     |
| ALL_PROVIDERS_FAILED   | Document failure  | N/A          | fatal     |

## Output with Partial Recovery

Documents with page failures include error metadata:

```json
{
  "metadata": {
    "totalPages": 15,
    "recoveredPages": 14,
    "failedPages": 1,
    "failures": [{ "page": 7, "error": "SURYA_TIMEOUT" }],
    "confidence": 0.85
  },
  "content": "page 1 text\n\npage 2 text\n\n[OCR failed — page 7]\n\npage 8 text..."
}
```

## Implementation

| File              | Function                                | Role                                     |
| ----------------- | --------------------------------------- | ---------------------------------------- |
| `ocr-provider.ts` | `GoogleDriveOcrProvider.extractPages()` | Per-page try/catch, skip-and-continue    |
| `ocr-provider.ts` | `SuryaOcrProvider.extractPages()`       | Per-page try/catch, skip-and-continue    |
| `ocr-provider.ts` | `OcrManager.extractPages()`             | Provider-level failover                  |
| `ocr.ts`          | `splitPdfPages()`                       | Page isolation (one fails ≠ others fail) |

## Limitations (Phase 1C)

1. No per-page retry on failure — failed pages are skipped immediately
2. Mixed-engine fallback is manual (OcrManager doesn't auto-retry failed pages on alternate engine)
3. No database persistence of page-level errors (logged to console only)
4. No automatic re-processing of individual failed pages
