# Pipeline Stability Audit

## Purpose

Formal audit of the document transformation pipeline's stability characteristics — queue durability, retry handling, timeout assumptions, partial failure recovery, and export consistency.

---

## Queue Stability

### Current Configuration

| Queue        | Concurrency | Default Retries | Backoff        | Job Timeout (implied) |
| ------------ | ----------- | --------------- | -------------- | --------------------- |
| `validation` | unlimited   | 3               | 2s exponential | None                  |
| `splitting`  | unlimited   | 3               | 2s exponential | None                  |
| `ocr`        | unlimited   | env-dependent   | 5s exponential | None                  |
| `cleaning`   | unlimited   | 3               | default        | None                  |
| `generation` | unlimited   | 3               | default        | None                  |
| `export`     | unlimited   | 3               | default        | None                  |

### Issues Found

#### Issue S1: Missing Job Timeout

**Severity**: High  
**Location**: `packages/pipeline/src/queue.ts` — all `Queue.add()` calls  
**Problem**: No job timeout is set. If a job hangs (e.g., Google Drive API never responds), the worker remains blocked indefinitely.  
**Fix**: Add `timeout` to each queue's job options:

```
validation: 30s, splitting: 60s, ocr: 300s, cleaning: 30s, generation: 30s, export: 60s
```

#### Issue S2: No Concurrency Limit

**Severity**: Medium  
**Location**: `packages/pipeline/src/queue.ts` — Worker constructors  
**Problem**: All workers run with unlimited concurrency (BullMQ default). With large jobs (>100MB uploads), this can exhaust memory.  
**Fix**: Set per-queue concurrency: `validation: 5, splitting: 2, ocr: 3, cleaning: 5, generation: 3, export: 3`

#### Issue S3: No Dead Letter Queue

**Severity**: Medium  
**Location**: Missing feature  
**Problem**: Jobs that exhaust retries are silently discarded (BullMQ default). No visibility into failed jobs after retries.  
**Fix**: Add a `failed` job handler that logs failed jobs to a dedicated Redis set or external monitoring.

#### Issue S4: Cleaning/Generation Queues Have No Retry

**Severity**: Low  
**Location**: `packages/pipeline/src/queue.ts:143-151`  
**Problem**: `enqueueCleaning` and `enqueueGeneration` use default settings (0 retries). If Redis temporarily fails, these jobs are lost permanently.  
**Fix**: Add `attempts: 3` with exponential backoff, same as other queues.

---

## Malformed PDF Handling

### Current State

| Scenario                       | Behavior                                   | Acceptable?    |
| ------------------------------ | ------------------------------------------ | -------------- |
| Empty PDF (0 pages)            | Upload succeeds, OCR returns no text       | ⚠️ Edge case   |
| Password-protected PDF         | Upload succeeds, Google Drive OCR fails    | ⚠️ Unhandled   |
| PDF with only images (no text) | Upload succeeds, Google Drive OCR may work | ✅             |
| PDF with broken metadata       | Upload succeeds, filename-based handling   | ⚠️ Config-only |
| Non-PDF uploaded as PDF        | Client-side MIME check, server validates   | ✅             |
| PDF > 100MB                    | Client and server size check rejects       | ✅             |
| Corrupt PDF (truncated)        | Upload succeeds, MinIO has corrupt blob    | ❌ Unhandled   |

### Issues Found

#### Issue S5: No Corrupt PDF Detection

**Severity**: High  
**Location**: Missing validation step  
**Problem**: Truncated or intentionally malformed PDFs pass validation. MinIO stores the corrupt blob, and the pipeline proceeds until OCR fails.  
**Fix**: Add a `pdf-signature` check that validates the PDF header (%PDF-x.x) and trailer (%%EOF) before proceeding.

#### Issue S6: No Password-Protected Detection

**Severity**: Medium  
**Location**: Missing validation step  
**Problem**: Encrypted PDFs are uploaded successfully, then OCR returns empty text. The user gets no error message about encryption.  
**Fix**: Add `pdfinfo` or `qpdf` check in the validation stage to detect encryption flags.

---

## Retry Handling

### Current Strategy

| Failure Type            | Retries | Backoff        | Action                       |
| ----------------------- | ------- | -------------- | ---------------------------- |
| Network timeout         | 3       | 2s → 5s → 10s  | Auto-retry                   |
| Google Drive rate limit | env     | 5s → 10s → 30s | Exponential backoff          |
| Invalid file format     | 0       | —              | Hard fail                    |
| Empty OCR result        | env     | 5s → 30s       | Retry with new Drive attempt |
| Cleaning failure        | 0       | —              | Hard fail                    |
| Export failure          | 3       | 2s → 5s → 10s  | Auto-retry                   |

### Issues Found

#### Issue S7: Cleaning/GENERATION Have No Retry

**Severity**: Medium  
**Location**: `queue.ts:143-151`  
**Problem**: `enqueueCleaning` and `enqueueGeneration` do not set retry parameters. BullMQ default is 0 retries. A transient Redis error during job processing permanently loses the job.  
**Fix**: Add explicit retry config:

```typescript
await queue.add(job.id, job, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
```

---

## Timeout Assumptions

### Documented Timings (from PIPELINE_PERFORMANCE_REPORT.md)

| Stage         | 1K chars | 10K chars | 100K chars | 1M chars |
| ------------- | -------- | --------- | ---------- | -------- |
| Text cleaning | < 5ms    | < 20ms    | < 200ms    | < 2s     |
| Markdown gen  | < 5ms    | < 10ms    | < 50ms     | < 200ms  |
| OCR (Google)  | 2-5s     | 10-30s    | 60-300s    | N/A      |

### Issues Found

#### Issue S8: No Timeout on Individual Queue Jobs

**Severity**: High  
**Location**: `queue.ts`  
**Problem**: Without explicit timeout, a stuck OCR job (e.g., Google Drive API hangs) blocks the worker for the API timeout duration (which could be 2+ minutes).  
**Fix**: Add `timeout` to each queue's `add()` options:

```typescript
await queue.add(job.id, job, {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  timeout: 300000, // 5 minutes for OCR
});
```

---

## Partial Failure Recovery

### Current State

| Failure Scenario                       | Recovery                                    | Acceptable?    |
| -------------------------------------- | ------------------------------------------- | -------------- |
| Single page OCR fails (multi-page doc) | Entire job fails                            | ❌ Partial     |
| Cleaning fails on one format           | Full job failure                            | ⚠️ Acceptable  |
| Export fails for one format            | Other formats succeed (separate queues)     | ✅             |
| Redis disconnects mid-job              | BullMQ retries, job resumes from checkpoint | ⚠️ Unconfirmed |

### Issues Found

#### Issue S9: All-or-Nothing Page OCR

**Severity**: High  
**Location**: `packages/pipeline/src/ocr.ts:102-139`  
**Problem**: `ocrImageViaGoogleDrive` processes pages sequentially. If page 5 of 10 fails, the entire job fails and must be retried from page 1.  
**Fix ATM**: Adding per-page error handling:

```typescript
for (let i = 0; i < pageImages.length; i++) {
  try {
    // OCR page i
  } catch (err) {
    allPages.push({ number: i + 1, text: "" }); // Empty page instead of failure
  }
}
```

---

## Export Consistency

### Current State

| Export Format | Source Field   | Consistency                                 |
| ------------- | -------------- | ------------------------------------------- |
| Markdown      | `cleaned` text | ✅ Deterministic — same input = same output |
| TXT           | `cleaned` text | ✅ Deterministic with Markdown→TXT rules    |
| JSON          | `cleaned` text | ✅ Deterministic — always structured        |
| DOCX          | N/A            | ⚠️ Throws error (not implemented)           |

### Issues Found

#### Issue S10: DOCX Export Throws Unhelpful Error

**Severity**: Low  
**Location**: `output.ts:166-168`  
**Problem**: `generateDocx` throws `"DOCX generation requires the 'docx' package"` which provides no guidance.  
**Fix**: Improve error message:

```typescript
throw new Error(
  "DOCX_EXPORT_NOT_AVAILABLE: Install 'docx' package (npm install docx) to enable DOCX generation",
);
```

---

## Audit Score

| Category               | Score         | Issues                 |
| ---------------------- | ------------- | ---------------------- |
| Queue configuration    | ⚠️ 5/10       | S1, S2, S3, S4, S7, S8 |
| Malformed PDF handling | ⚠️ 6/10       | S5, S6                 |
| Retry strategy         | ✅ 8/10       | S7                     |
| Timeout configuration  | ⚠️ 5/10       | S1, S8                 |
| Partial failure        | ⚠️ 6/10       | S9                     |
| Export consistency     | ✅ 9/10       | S10                    |
| **Overall**            | **⚠️ 6.5/10** | 10 issues found        |

## Prioritized Fixes

| Priority | Issue | Fix                                      | Effort |
| -------- | ----- | ---------------------------------------- | ------ |
| P0       | S1    | Add job timeout to all queue.add() calls | 30 min |
| P0       | S8    | Same as S1                               | 30 min |
| P1       | S5    | Add PDF signature validation             | 1 hr   |
| P1       | S9    | Per-page error handling in OCR loop      | 1 hr   |
| P1       | S2    | Add concurrency limits to Workers        | 15 min |
| P2       | S3    | Add dead letter queue logging            | 2 hr   |
| P2       | S4    | Add retry config to cleaning/generation  | 15 min |
| P2       | S7    | Same as S4                               | 15 min |
| P3       | S6    | Add password-protected detection         | 1 hr   |
| P3       | S10   | Improve DOCX error message               | 5 min  |
