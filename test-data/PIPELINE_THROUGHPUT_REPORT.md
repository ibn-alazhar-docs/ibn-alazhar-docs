# PIPELINE_THROUGHPUT_REPORT.md

## Phase 1D — Pipeline Throughput & Latency Report

### ⚠️ Infrastructure Constraint

Full pipeline throughput testing requires:

- ✅ Text cleanup pipeline — tested
- ❌ Redis + MinIO (Docker not running) — BullMQ queue throughput not measurable
- ❌ Google Drive API (no credentials) — API latency not measurable
- ⚠️ Surya OCR (installed, API mismatch) — provider needs update

### What Was Tested

#### Text Cleanup Throughput

| Operation            | Input Size   | Average Time | Throughput             | Pass |
| -------------------- | ------------ | ------------ | ---------------------- | ---- |
| `cleanArabicText()`  | 1,000 words  | 2-3ms        | **333-500 words/ms**   | ✅   |
| `cleanArabicText()`  | 10,000 words | 26-30ms      | **333-385 words/ms**   | ✅   |
| `cleanArabicText()`  | 5,000 words  | 11-13ms      | **385-455 words/ms**   | ✅   |
| `generateMarkdown()` | 1,000 words  | 4-6ms        | **167-250 words/ms**   | ✅   |
| `analyzeText()`      | 5,000 words  | 6-7ms        | **714-833 words/ms**   | ✅   |
| Headings detection   | 100 headings | 1-2ms        | **50-100 headings/ms** | ✅   |

#### Real-time Performance Characteristics

```
Throughput curve (cleanArabicText):
  1,000 words:  2.5ms  → 400 words/ms
  5,000 words: 12ms    → 417 words/ms
 10,000 words: 28ms    → 357 words/ms
```

The pipeline scales **linearly** with input size. No super-linear degradation detected.

### Estimated Full Pipeline Latency

| Stage                | Dependencies        | Estimated Latency      | Can Test Now?   |
| -------------------- | ------------------- | ---------------------- | --------------- |
| Upload (API)         | MinIO               | 100-500ms              | ❌ No Docker    |
| Validate (PDF)       | None                | < 10ms                 | ✅ Yes          |
| Split (pages)        | pdfjs-dist + canvas | 500ms-3s (50-page PDF) | ✅ Yes\*        |
| OCR (Google)         | Drive API           | 3-8s/page              | ❌ No creds     |
| OCR (Surya CPU)      | Python, models      | 10-30s/page            | ⚠️ API mismatch |
| Clean (text.ts)      | None                | 2-30ms                 | ✅ Yes          |
| Generate (output.ts) | None                | 5-10ms                 | ✅ Yes          |
| Export (MinIO)       | MinIO               | 200-500ms              | ❌ No Docker    |

\*`splitPdfPages()` was not called directly in burn-in tests but depends on `canvas` which is ✅ installed.

### Queue Capacity (Estimated)

| Queue           | Concurrency | Timeout | Est. Jobs/Min     |
| --------------- | ----------- | ------- | ----------------- |
| Validation      | 5           | 30s     | 600               |
| Splitting       | 2           | 60s     | 40 (50-page PDFs) |
| OCR (Surya CPU) | 3           | 300s    | 6 (50-page docs)  |
| OCR (Google)    | 3           | 300s    | 22 (50-page docs) |
| Cleaning        | 5           | 30s     | 10,000            |
| Generation      | 3           | 30s     | 6,000             |
| Export          | 3           | 60s     | 180               |

**Bottleneck**: OCR stage (Surya CPU) limits throughput to ~6 documents/hour per worker.

### Recommendations

1. **Start Docker** to enable BullMQ throughput measurement
2. **Configure Google credentials** to establish baseline latency
3. **Update Surya provider** for v0.17 API, then benchmark real OCR times
4. **Measure splitPdfPages()** latency for various page counts (10, 50, 200 pages)
5. **GPU for Surya** — would increase throughput 5-10× for OCR stage
