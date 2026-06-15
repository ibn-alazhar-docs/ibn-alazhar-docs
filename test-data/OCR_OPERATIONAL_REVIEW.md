# OCR_OPERATIONAL_REVIEW.md

## Phase 1D — Operational Safety & Reliability Audit

### Audit Scope

Review the OCR pipeline for operational safety concerns:

- Worker crash resilience
- Stuck job detection
- Memory exhaustion protection
- Orphan artifact cleanup
- Timeout recovery correctness
- Fallback provider behavior

### Audit Results

#### 1. Worker Crash Resilience

| Component         | Crash Scenario                 | Behavior                                                        | Rating |
| ----------------- | ------------------------------ | --------------------------------------------------------------- | ------ |
| `ocr-worker`      | Provider throws during OCR     | ❌ ⚠️ Process crashes — needs `process.on('uncaughtException')` | 🟡     |
| `export-worker`   | MinIO unavailable              | ❌ ⚠️ Same uncaught exception risk                              | 🟡     |
| `splitPdfPages()` | Memory exhaustion (200+ pages) | ❌ ⚠️ No page limit guard                                       | 🟡     |
| `OcrManager`      | All providers fail             | ✅ Throws descriptive `ALL_OCR_PROVIDERS_FAILED`                | 🟢     |
| BullMQ worker     | Redis disconnects              | ✅ Auto-retry with backoff                                      | 🟢     |

#### 2. Stuck Job Detection

| Mechanism                    | Status                       | Notes                                   |
| ---------------------------- | ---------------------------- | --------------------------------------- |
| `getStuckJobs()` in queue.ts | ✅ Implemented (Phase 1B(2)) | Scans for stalled jobs                  |
| `getQueueMetrics()`          | ✅ Implemented               | Waiting/active/completed/failed counts  |
| Job timeouts per queue       | ✅ Configured                | 30-300s depending on stage              |
| DLQ integration              | ✅ Implemented               | Failed jobs routed to `pipeline:failed` |

#### 3. Memory Exhaustion Protection

| Risk                                | Protection          | Status                                      |
| ----------------------------------- | ------------------- | ------------------------------------------- |
| Large PDF in splitPdfPages()        | No page limit       | ❌ Missing                                  |
| Temp directory in Surya (disk full) | No disk check       | 🟡 (would crash gracefully)                 |
| Regex backtracking DoS              | No guard            | 🟢 (all regex patterns are linear)          |
| Large text in cleanArabicText()     | No guard            | 🟢 (O(n) processing, tested to 10K chars)   |
| Surya Python process memory         | OS-level OOM killer | 🟡 (worker would crash, retry with backoff) |

#### 4. Orphan Artifact Cleanup

| Artifact Type         | Cleanup Method                         | Status                     |
| --------------------- | -------------------------------------- | -------------------------- |
| Drive API temp files  | `files.delete` in `finally` block      | ✅ Always cleaned          |
| Surya temp PNGs       | `unlink` in `finally` block            | ✅ Per-page cleanup        |
| Surya temp directory  | `rmdir` in outer `finally`             | ✅ Directory-level cleanup |
| Expired MinIO uploads | `cleanupOrphanedFiles()` in storage.ts | ✅ Periodic (Phase 1B(2))  |
| Stuck BullMQ jobs     | `getStuckJobs()` detection             | ✅ Manual trigger          |

#### 5. Timeout Recovery

| Component           | Timeout                   | Recovery Action            | Status |
| ------------------- | ------------------------- | -------------------------- | ------ |
| Surya OCR per-page  | 300s                      | Page skipped, error logged | ✅     |
| Google Drive export | Implicit (no timeout set) | ❌ No timeout guard        | 🟡     |
| Google Drive upload | Implicit                  | ❌ No timeout guard        | 🟡     |
| BullMQ jobs         | Per-queue config          | DLQ routing                | ✅     |
| Python subprocess   | 295s (5s buffer)          | Kill + reject              | ✅     |

#### 6. Fallback Correctness

| Scenario                                 | Expected Behavior              | Actual                     | Rating |
| ---------------------------------------- | ------------------------------ | -------------------------- | ------ |
| Google configured, Surya available       | Google used                    | ✅ (priority order)        | 🟢     |
| Google fails (quota), Surya available    | Fallback to Surya              | ✅ (OcrManager tries next) | 🟢     |
| Both unavailable                         | `ALL_OCR_PROVIDERS_FAILED`     | ✅ Descriptive error       | 🟢     |
| Google fails, Surya not available        | Error with all details         | ✅                         | 🟢     |
| Surya timeout on page 3 of 50            | Page 3 skipped, rest processed | ✅ Skip-and-continue       | 🟢     |
| Google fails on page 5, succeeds on rest | Page 5 error logged            | ✅ Page-level recovery     | 🟢     |

### Critical Findings

| #   | Finding                                  | Severity  | Recommendation                                   |
| --- | ---------------------------------------- | --------- | ------------------------------------------------ |
| 1   | **No page limit in splitPdfPages()**     | 🟡 Medium | Add `MAX_PAGES = 500` guard                      |
| 2   | **No timeout on Google Drive API calls** | 🟡 Medium | Add axios/fetch timeout                          |
| 3   | **No worker process crash handler**      | 🟡 Medium | Add `process.on('uncaughtException')` to workers |
| 4   | **No disk space check for Surya temp**   | 🟢 Low    | Add `df` check before processing                 |
| 5   | **Surya Python process may orphan**      | 🟢 Low    | Add `proc.kill()` in timeout handler             |

### Operational Score

| Category             | Score      | Trend           |
| -------------------- | ---------- | --------------- |
| Crash resilience     | 7/10       | ➡️ Stable       |
| Stuck job detection  | 10/10      | ✅ Strong       |
| Memory protection    | 6/10       | ⬅️ Weakness     |
| Orphan cleanup       | 9/10       | ✅ Strong       |
| Timeout recovery     | 8/10       | ✅ Strong       |
| Fallback correctness | 10/10      | ✅ Strong       |
| **Overall**          | **8.3/10** | **⬆️ Improved** |
