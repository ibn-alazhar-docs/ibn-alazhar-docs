# OCR_FAILURE_TAXONOMY.md

## Phase 1D — Expanded Failure Pattern Documentation

### Classification System

| Category      | Definition                                                    | Retry? | Recovery            |
| ------------- | ------------------------------------------------------------- | ------ | ------------------- |
| **Green 🟢**  | Recoverable — Transient, automatic retry succeeds             | Yes    | Automatic           |
| **Yellow 🟡** | Partially recoverable — Some data lost but document processes | Maybe  | Page-level skip     |
| **Red 🔴**    | Unrecoverable — Document cannot be processed                  | No     | DLQ + manual review |

---

### 1. Upload & Validation Failures

| Pattern                       | Code             | Category     | Detection                       | Frequency            |
| ----------------------------- | ---------------- | ------------ | ------------------------------- | -------------------- |
| Corrupt PDF header            | `PDF_CORRUPT`    | 🔴 Permanent | `validatePdf()` header check    | Low                  |
| Missing `%%EOF` trailer       | `PDF_TRUNCATED`  | 🔴 Permanent | `validatePdf()` trailer check   | Medium (network cut) |
| Encrypted PDF                 | `PDF_ENCRYPTED`  | 🔴 Permanent | `validatePdf()` /Encrypt scan   | Low                  |
| Wrong MIME type               | `INVALID_TYPE`   | 🔴 Permanent | Upload middleware               | Low                  |
| File too large (>100MB)       | `FILE_TOO_LARGE` | 🔴 Permanent | Upload middleware + validatePdf | Low                  |
| Too-small buffer              | `PDF_MALFORMED`  | 🔴 Permanent | `validatePdf()` size check      | Low                  |
| Network timeout during upload | `NETWORK_ERROR`  | 🟢 Transient | `categorizeFailure()`           | Medium               |

### 2. PDF Splitting Failures

| Pattern                         | Code                      | Category     | Detection                  |
| ------------------------------- | ------------------------- | ------------ | -------------------------- |
| pdfjs-dist not installed        | `PDF_SPLIT_NOT_AVAILABLE` | 🔴 Permanent | Dynamic import             |
| canvas not installed            | `CANVAS_NOT_AVAILABLE`    | 🔴 Permanent | Dynamic import             |
| Corrupt PDF (pdfjs parse error) | `PDF_SPLIT_FAILED`        | 🔴 Permanent | try/catch in splitPdfPages |
| Memory exhaustion (>200 pages)  | Not yet implemented       | 🟡 Partial   | Need page count guard      |

### 3. OCR Engine Failures (NEW for Phase 1C)

| Pattern                           | Code                       | Category           | Recovery                           |
| --------------------------------- | -------------------------- | ------------------ | ---------------------------------- |
| **Provider unavailable**          | `NOT_AVAILABLE`            | 🟢 Transient       | OcrManager skips → next provider   |
| **Upload to Drive failed**        | `OCR_UPLOAD_FAILED`        | 🟢 Transient       | Page-level skip in extractPages    |
| **No text extracted**             | `OCR_NO_TEXT`              | 🟡 Partial         | Page gets empty text, continues    |
| **Drive API quota exceeded**      | `OCR_QUOTA_EXCEEDED`       | 🔴 Permanent (day) | Retry next day                     |
| **Drive API timeout**             | Various (network)          | 🟢 Transient       | Provider failover                  |
| **Surya not installed**           | `SURYA_NOT_AVAILABLE`      | 🔴 Permanent       | Config fix                         |
| **Surya timeout (300s)**          | `SURYA_TIMEOUT`            | 🟡 Partial         | Page skipped, OcrManager continues |
| **Surya execution error**         | `SURYA_EXECUTION_FAILED`   | 🟡 Partial         | Page skipped                       |
| **Surya output unparseable**      | `SURYA_PARSE_FAILED`       | 🟡 Partial         | Page skipped                       |
| **PDF split fails for Surya**     | `SURYA_SPLIT_FAILED`       | 🔴 Permanent       | Needs fix                          |
| **Surya temp dir creation fails** | Transient IO error         | 🟢 Transient       | Retry                              |
| **All OCR providers failed**      | `ALL_OCR_PROVIDERS_FAILED` | 🔴 Permanent       | Document-level failure, DLQ        |

### 4. Arabic Cleanup Failures

| Pattern                              | Severity      | Category        | Impact                           |
| ------------------------------------ | ------------- | --------------- | -------------------------------- |
| Broken definite article (ال + space) | Informational | 🟢 Auto-fixed   | Pipeline rejoins correctly       |
| Broken lam-alif ligature (ل ا)       | Minor         | 🟡 Not handled  | Word may read strangely          |
| Single-char line-not-merged          | Informational | 🟢 No data loss | Lines stay separate              |
| Heading false positive (نظر)         | Minor         | 🟡 Cosmetics    | Body text marked as heading      |
| Heading false positive (المبحث)      | Minor         | 🟡 Cosmetics    | Body text marked as heading      |
| تاء مربوطة → هاء confusion           | Medium        | 🟡 Not handled  | Grammar affected                 |
| Line reconstruction (over-merge)     | Minor         | 🟡 Quality      | Paragraphs may merge incorrectly |
| Garbage line survives filter         | Informational | 🟢 Rare         | Only if >65% Arabic chars        |

### 5. Queue & Worker Failures (Phase 1B(2))

| Pattern               | Code               | Category     | Recovery Action                |
| --------------------- | ------------------ | ------------ | ------------------------------ |
| Job timeout           | `JOB_TIMEOUT`      | 🔴 Fatal     | DLQ, manual review             |
| All retries exhausted | `RETRY_EXHAUSTED`  | 🔴 Fatal     | DLQ                            |
| DLQ rejection         | `DLQ_REJECTED`     | 🔴 Fatal     | Manual ops intervention        |
| Redis connection lost | `REDIS_CONNECTION` | 🟢 Transient | Auto-retry (3 attempts)        |
| MinIO connection lost | `MINIO_CONNECTION` | 🟢 Transient | Auto-retry (3 attempts)        |
| Orphan cleanup found  | `ORPHAN_CLEANUP`   | 🟡 Partial   | CleanupJob removes stale files |

### 6. Export Failures

| Pattern                      | Code                        | Category     |
| ---------------------------- | --------------------------- | ------------ |
| DOCX module not installed    | `DOCX_EXPORT_NOT_AVAILABLE` | 🔴 Permanent |
| MinIO put failed             | `STORAGE_ERROR`             | 🟢 Transient |
| Markdown generation on empty | Handled                     | 🟢 Graceful  |
| JSON serialization error     | `GENERATION_FAILED`         | 🔴 Permanent |

### Cumulative Pattern Count

| Phase                     | Before | Added  | Total  |
| ------------------------- | ------ | ------ | ------ |
| Phase 1A                  | —      | 8      | 8      |
| Phase 1B                  | 8      | 10     | 18     |
| Phase 1B(1)               | 18     | 0      | 18     |
| Phase 1B(2)               | 18     | 12     | 30     |
| **Phase 1C**              | 30     | **12** | **42** |
| **Phase 1D (this audit)** | 42     | **5**  | **47** |

### Recommendations

1. **Auto-fix broken lam-alif** `ل ا` → `للا` pattern in `cleanArabicText()`
2. **Add context-aware heading detection** — check if keyword starts a paragraph (preceded by blank line)
3. **Improve confidence heuristic** — should detect garbage/numeric text and return 0.0
4. **Add PDF page count guard** in `splitPdfPages()` — warn at 200+ pages
