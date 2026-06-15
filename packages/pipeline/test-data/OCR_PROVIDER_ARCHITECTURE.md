# OCR Provider Architecture

## Overview

Hybrid OCR provider system supporting interchangeable engines with normalized outputs, shared confidence structures, and page-level isolation.

## Provider Interface

```
OcrProvider
├── name: string              // Human-readable name
├── type: OcrEngineType        // 'google' | 'surya'
├── isAvailable(config)         // Check runtime prerequisites
├── extractText(config, file, name, mime)   // Full document OCR
└── extractPages(config, pages[], name)     // Pre-split page OCR
```

### Normalized Output

```typescript
interface OcrEngineResult {
  text: string; // Full document text
  pages: OcrPageResult[]; // Page-level results
  confidence: number; // 0.0 – 1.0
  engine: "google" | "surya"; // Source engine
  pageErrors?: { page: number; error: string }[]; // Partial failures
}

interface OcrPageResult {
  number: number;
  text: string;
  confidence: number;
}
```

### Shared confidence estimation

```typescript
estimateConfidence(text: string): number
// Arabic character ratio → confidence:
//   >70% Arabic → 0.9
//   40-70%     → 0.7
//   <40%       → 0.5
//   empty      → 0.0
```

## Implementations

### GoogleDriveOcrProvider

| Property     | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| Prerequisite | GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY in config |
| Mechanism    | Upload file to Google Drive → Export as text/plain → Delete |
| PDF handling | Native — uploads entire PDF, Google handles splitting       |
| Page OCR     | Uploads each page image individually via extractPages()     |
| Limitations  | Rate limits, quota, network-dependent                       |
| Timeout      | 300s (configurable via JOB_TIMEOUTS)                        |

### SuryaOcrProvider

| Property     | Value                                               |
| ------------ | --------------------------------------------------- |
| Prerequisite | Python 3 + `pip install surya-ocr`                  |
| Mechanism    | child_process → Python script using surya.ocr API   |
| PDF handling | Requires splitPdfPages() first → page images        |
| Page OCR     | Runs surya on each page image via Python subprocess |
| Limitations  | GPU recommended for speed, Python dependency        |
| Timeout      | 300s per page (SURYA_TIMEOUT)                       |

## OcrManager — Fallback Orchestration

```
OcrManager(config)
  providers ← config.ocr.providers  (priority order)

  extractText():
    for each provider:
      if available → try extractText
      if fails → log, try next
    if all fail → throw ALL_OCR_PROVIDERS_FAILED

  extractPages():
    for each provider:
      if available → try extractPages
      if fails → log, try next
    if all fail → throw ALL_OCR_PROVIDERS_FAILED
```

### Provider Priority

Configured via `OCR_PROVIDERS` env var (comma-separated):

```bash
OCR_PROVIDERS=google          # Google only (default)
OCR_PROVIDERS=surya           # Surya only
OCR_PROVIDERS=google,surya    # Try Google first, fallback to Surya
OCR_PROVIDERS=surya,google    # Try Surya first, fallback to Google
```

## Backward Compatibility

Existing functions remain available:

```typescript
extractTextViaGoogleDrive(config, buffer, name, mime)
// → wraps GoogleDriveOcrProvider.extractText()
// → return type changed from OcrResult to OcrEngineResult (superset)

ocrImageViaGoogleDrive(config, pages[], name)
// → wraps GoogleDriveOcrProvider.extractPages()
// → return type changed from OcrResult to OcrEngineResult (superset)
```

## Dependency Graph

```
         ┌─────────────┐
         │  OcrManager  │
         └──────┬───────┘
        ┌───────┴────────┐
        ▼                ▼
 ┌────────────┐  ┌──────────────┐
 │ Google OCR │  │  Surya OCR   │
 └────────────┘  └──────────────┘
        │                │
        ▼                ▼
 ┌────────────┐  ┌──────────────┐  ┌───────────┐
 │ Drive API  │  │  pdfjs-dist  │  │  canvas   │
 └────────────┘  └──────┬───────┘  └───────────┘
                        ▼
                  ┌────────────┐
                  │ Page PNGs  │
                  └─────┬──────┘
                        ▼
                  ┌──────────────┐
                  │  Python 3 +  │
                  │ surya-ocr    │
                  └──────────────┘
```

## File Map

| File                                    | Contents                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `packages/pipeline/src/types.ts`        | OcrEngineType, OcrPageResult, OcrEngineResult, PipelineConfig.ocr.provider/providers                                   |
| `packages/pipeline/src/ocr-provider.ts` | OcrProvider interface, GoogleDriveOcrProvider, SuryaOcrProvider, createOcrProvider(), OcrManager, estimateConfidence() |
| `packages/pipeline/src/ocr.ts`          | Backward-compat wrappers, splitPdfPages(), re-exports                                                                  |
| `packages/pipeline/src/index.ts`        | Re-exports all from ocr-provider and ocr                                                                               |
