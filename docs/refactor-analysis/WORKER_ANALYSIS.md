# WORKER_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** OCR worker, export worker, shared infrastructure, pipeline stages
> **System:** Ibn Al-Azhar Docs

---

## 1. Worker Overview

Two BullMQ consumers + shared infrastructure:

| Worker        | Port | Stages                                    | Dependencies             |
| ------------- | ---- | ----------------------------------------- | ------------------------ |
| ocr-worker    | 9090 | validate → split → ocr → clean → generate | pipeline, prisma, Python |
| export-worker | 9091 | export (md/txt/json/docx/epub/pdf)        | pipeline, prisma         |

---

## 2. OCR Worker Analysis

### 2.1 Entry Point (`index.ts` — 50 lines)

```
main()
├── startHealthServer("ocr-worker", 9090)
├── setupDlq()
├── registerValidationStage(config)
├── registerSplittingStage(config)
├── registerOcrStage(config)
├── registerCleaningStage(config)
└── registerGenerationStage(config)
```

**Assessment:** Clean entry point. Each stage is registered independently.

### 2.2 Stage Analysis

| Stage    | File          | Lines | Input         | Output              | Issues   |
| -------- | ------------- | ----- | ------------- | ------------------- | -------- |
| validate | `validate.ts` | 38    | ProcessingJob | → enqueueSplitting  | ✅ Clean |
| split    | `split.ts`    | ~50   | ProcessingJob | → enqueueOcr        | ✅ Clean |
| ocr      | `ocr.ts`      | ~60   | ProcessingJob | → enqueueCleaning   | ✅ Clean |
| clean    | `clean.ts`    | ~50   | ProcessingJob | → enqueueGeneration | ✅ Clean |
| generate | `generate.ts` | ~60   | ProcessingJob | → updateDocStatus   | ✅ Clean |

### 2.3 Stage Issues

| Issue                              | Severity | Description                             |
| ---------------------------------- | -------- | --------------------------------------- |
| `helpers.ts` shared between stages | LOW      | Could be split per stage                |
| No idempotency checks              | MEDIUM   | No check if job already processed       |
| Error handling inconsistent        | LOW      | Some stages update status, others don't |
| No retry logic per stage           | MEDIUM   | Relies on BullMQ retry only             |

### 2.4 Python Dependency

- `split-pdf.py` — called via `execFile` from `ocr.ts`
- `generate_pdf.py` — called from generate stage
- Requires Python venv with: `pypdfium2`, `Pillow`, `pytesseract`, `tesseract-ocr-ara`

**Risk:** Python environment must be consistent across dev and production.

---

## 3. Export Worker Analysis

### 3.1 Entry Point (`index.ts` — 30 lines)

```
main()
├── startHealthServer("export-worker", 9091)
├── registerExportHandler()
└── shutdown hooks
```

**Assessment:** Minimal entry point. Single handler registration.

### 3.2 Export Handler (`export-handler.ts` — 144 lines)

| Format | Method                            | Issues |
| ------ | --------------------------------- | ------ |
| md     | `generateMarkdown()`              | ✅     |
| txt    | `generateTxt()`                   | ✅     |
| json   | `generateJson()`                  | ✅     |
| docx   | `generateDocx()` (dynamic import) | ✅     |
| epub   | `generateEpub()` (dynamic import) | ✅     |
| pdf    | `generatePdf()` (dynamic import)  | ✅     |

### 3.3 Handler Issues

| Issue                       | Severity | Description                                                               |
| --------------------------- | -------- | ------------------------------------------------------------------------- |
| God function                | HIGH     | 144-line switch with format handling, DB access, Google Drive integration |
| DB access in worker         | MEDIUM   | `prisma.account.findFirst`, `prisma.document.findUnique/update`           |
| Google Drive logic mixed in | MEDIUM   | Auth token refresh, folder creation, upload                               |
| No progress reporting       | LOW      | Worker doesn't report intermediate progress                               |

---

## 4. Shared Infrastructure

### 4.1 Health Server (`health-server.ts`)

Simple HTTP server for liveness/readiness probes.

### 4.2 Logger (`logger.ts`)

Pino logger with structured JSON output.

---

## 5. Pipeline Package Issues

### 5.1 Module Responsibilities

| Module                | Lines | Responsibility        | Issues                |
| --------------------- | ----- | --------------------- | --------------------- |
| `types.ts`            | 201   | All type definitions  | God types file        |
| `config.ts`           | 86    | Configuration loading | ✅                    |
| `storage.ts`          | 276   | MinIO operations      | ✅ but many functions |
| `ocr.ts`              | 87    | OCR orchestration     | ✅                    |
| `ocr-provider.ts`     | 114   | Provider management   | ⚠️ God switch         |
| `text/clean.ts`       | 469   | Text cleaning         | ⚠️ God function       |
| `queue/connection.ts` | ~100  | Redis/BullMQ          | ✅                    |
| `queue/enqueue.ts`    | ~150  | Job enqueueing        | ✅                    |
| `queue/workers.ts`    | ~100  | Worker factories      | ✅                    |
| `queue/dlq.ts`        | ~80   | Dead-letter queue     | ✅                    |
| `queue/metrics.ts`    | ~60   | Queue metrics         | ✅                    |

### 5.2 Critical Issues

| #   | Issue                            | Severity | Fix                                 |
| --- | -------------------------------- | -------- | ----------------------------------- |
| 1   | `text/clean.ts` is 469 lines     | HIGH     | Split into pipeline stages          |
| 2   | `types.ts` is 201 lines          | MEDIUM   | Split into domain-specific files    |
| 3   | `ocr-provider.ts` uses switch    | LOW      | Registry pattern                    |
| 4   | `storage.ts` has 12 functions    | MEDIUM   | Split into upload/download/validate |
| 5   | `console.warn` instead of logger | LOW      | Use structured logger               |

---

## 6. Recommendations

| #   | Priority | Recommendation                                                              |
| --- | -------- | --------------------------------------------------------------------------- |
| 1   | P0       | Split `export-handler.ts` — extract format handlers, DB access, Drive logic |
| 2   | P0       | Split `text/clean.ts` into composable pipeline stages                       |
| 3   | P1       | Add idempotency checks to OCR worker stages                                 |
| 4   | P1       | Split `types.ts` into separate type files                                   |
| 5   | P1       | Replace `console.warn` with structured logger in pipeline                   |
| 6   | P2       | Add progress reporting to export worker                                     |
| 7   | P2       | Introduce OCR provider registry (OCP)                                       |
| 8   | P3       | Extract Python dependency management into Docker layer                      |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
