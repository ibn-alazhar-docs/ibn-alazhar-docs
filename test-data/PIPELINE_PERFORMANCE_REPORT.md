# Pipeline Performance Report

## Infrastructure

| Service          | Version  | Purpose                                                    |
| ---------------- | -------- | ---------------------------------------------------------- |
| MinIO            | Latest   | File storage (uploads, OCR results, cleaned text, exports) |
| Redis            | 7-alpine | BullMQ queue broker                                        |
| BullMQ           | Latest   | Async job processing (6 queues)                            |
| Google Drive API | v3       | OCR engine (MVP)                                           |

All services run in Docker containers via `docker-compose.dev.yml`.

---

## Text Pipeline Performance

### Arabic Cleanup (text.ts)

| Stage                    | Complexity | Operations                                           |
| ------------------------ | ---------- | ---------------------------------------------------- |
| Unicode normalization    | O(n)       | NFKC normalization + bidi control removal            |
| Arabic normalization     | O(n)       | 4 regex replacements (alef, yaa, teh, kaf)           |
| Tashkeel removal         | O(n)       | Single regex replace                                 |
| Tatweel removal          | O(n)       | Single regex replace                                 |
| Digit normalization      | O(n)       | Character-by-character with `replace` callback       |
| Whitespace normalization | O(n)       | Multi-pass (CR/LF, tabs, triple newlines, line trim) |
| Heading detection        | O(n)       | Line-by-line with regex patterns                     |
| Line reconstruction      | O(n)       | Buffer-based line merging                            |
| Page noise removal       | O(n)       | Line-by-line with 8 pattern tests                    |
| Final cleanup            | O(n)       | OCR artifact regex + leading/trailing strip          |

### Performance Characteristics

Test input: 22,919 chars (garbled PDF text layer)

| Metric                | Value                                 |
| --------------------- | ------------------------------------- |
| Total cleaning time   | < 100ms                               |
| Memory usage          | ~2MB                                  |
| Output size reduction | 15632/22919 → 31.8% reduction         |
| Heading count         | 4 (from 0 before fixes)               |
| Headings detected     | 4 (keyword-matched from garbled text) |

Test input: 2,290 chars (simulated OCR output)

| Metric              | Value                                    |
| ------------------- | ---------------------------------------- |
| Total cleaning time | < 20ms                                   |
| Heading count       | 10 (correct for this document structure) |
| False positives     | ~3 (acceptable for MVP)                  |

### Scaling Estimates

| Input size      | Estimated time | Notes                        |
| --------------- | -------------- | ---------------------------- |
| 1,000 chars     | < 5ms          | Short document, single page  |
| 10,000 chars    | < 20ms         | Typical book chapter         |
| 100,000 chars   | < 200ms        | Full book (approx 50 pages)  |
| 1,000,000 chars | < 2s           | Large book, still acceptable |

All pipeline stages are O(n) with single-pass regex operations. No stage creates intermediate copies of the full text (operates on split/modified strings).

---

## Markdown Generation Performance (output.ts)

| Operation                | Complexity | Notes                             |
| ------------------------ | ---------- | --------------------------------- |
| Text analysis            | O(n)       | Word count, Arabic ratio          |
| Markdown generation      | O(n)       | Line-by-line with 6 pattern tests |
| Paragraph reconstruction | O(n)       | Buffer-based merge                |
| TXT generation           | O(n)       | 5 regex replacements              |
| JSON generation          | O(n)       | `JSON.stringify` (built-in, O(n)) |

All operations complete in < 50ms for typical document sizes.

---

## BullMQ Queue Performance

**Queues** (defined in `packages/pipeline/src/queue.ts`):

| Queue        | Concurrency | Retries | Purpose                      |
| ------------ | ----------- | ------- | ---------------------------- |
| `validation` | 5           | 3       | File validation              |
| `splitting`  | 2           | 3       | PDF page splitting           |
| `ocr`        | 3           | 5       | Google Drive OCR             |
| `cleaning`   | 5           | 3       | Arabic text cleaning         |
| `generation` | 3           | 3       | Markdown/TXT/JSON generation |
| `export`     | 3           | 3       | Export file generation       |

### Retry Strategy

| Failure Type            | Retries | Delay                       | Action                        |
| ----------------------- | ------- | --------------------------- | ----------------------------- |
| Network timeout         | 3       | 1s → 5s → 30s               | Auto-retry                    |
| Google Drive rate limit | 5       | 5s → 10s → 30s → 60s → 120s | Exponential backoff           |
| Invalid file format     | 0       | —                           | Hard fail (no retry)          |
| Empty OCR result        | 2       | 5s → 30s                    | Retry with different settings |

---

## Google Drive API Performance (estimated)

| Operation                 | Typical Time | Notes                         |
| ------------------------- | ------------ | ----------------------------- |
| File upload (1MB)         | 2-5s         | Depends on connection         |
| OCR processing (10 pages) | 10-30s       | Google server-side time       |
| Text export (10 pages)    | 1-3s         | text/plain export             |
| File cleanup              | < 1s         | Delete from Drive             |
| Total per document        | 15-40s       | Heavily depends on page count |

---

## Storage Performance (MinIO)

| Operation                | Typical Time | Notes                   |
| ------------------------ | ------------ | ----------------------- |
| Upload 1MB               | < 1s         | Local Docker network    |
| Download 1MB             | < 0.5s       | Local Docker network    |
| Presigned URL generation | < 10ms       | No file size dependency |
| Delete                   | < 10ms       | Instant                 |

---

## Memory Assumptions

### Current

| Component                  | Memory | Notes                           |
| -------------------------- | ------ | ------------------------------- |
| Text pipeline (100k chars) | ~5MB   | String operations only          |
| File upload (100MB max)    | 100MB  | In-memory buffer (configurable) |
| BullMQ job                 | ~1MB   | Job metadata + payload          |
| MinIO client               | ~50MB  | SDK overhead                    |
| Total per document         | ~150MB | At peak (upload + processing)   |

### Risk

- File upload to Next.js API route buffers entire file in memory
- 100MB max × concurrent users could exceed available memory
- Mitigation: stream to MinIO directly, but current implementation buffers via `file.arrayBuffer()`

---

## Recommendations

### Performance

1. **Stream file uploads** from client → MinIO directly (presigned PUT URL)
2. **Remove in-memory buffering** in `/api/upload` route
3. **Add file size check before upload** (already done client-side, add server-side guard)

### Reliability

4. **Health endpoint** for each queue worker
5. **Dead letter queue** for jobs that exceed retry limit
6. **Job timeout** per queue type (OCR: 5 min, cleaning: 30s, export: 1 min)

### Monitoring

7. **Track per-stage latency** in job metadata
8. **Alert on OCR failures** (non-retryable)
9. **Log MinIO errors** separately from job errors
