# OCR_STRESS_PROFILE.md

## Phase 1D — Memory & Resource Stress Profile

### Test Methodology

Burn-in tests in `phase1d-burnin.test.ts` measure:

- `process.memoryUsage().heapUsed` before/after operations
- Throughput timing with `performance.now()`
- Concurrent processing across 100 varied inputs

### Results Summary

| Test                                | Input Size                    | Memory Delta | Pass/Fail | Notes                                            |
| ----------------------------------- | ----------------------------- | ------------ | --------- | ------------------------------------------------ |
| 1000+ line document                 | ~100 chapters × 10 paragraphs | < 4 MB       | ✅        | Cleanup pipeline is O(n) with minimal allocation |
| 5000+ words through pipeline        | 5000 words + 50 headings      | < 3 MB       | ✅        | generateMarkdown + cleanArabicText combined      |
| Extreme page noise (500 pages)      | 3000 lines with noise markers | < 5 MB       | ✅        | Noise filtering has no measurable leak           |
| 100 concurrent cleanups             | 100 varied inputs             | < 8 MB       | ✅        | Batch processing shows no accumulation           |
| 10,000 char single line             | 10,000 Arabic chars           | ~2 MB        | ✅        | Linear memory growth                             |
| Extremely long lines (>10000 chars) | 10,000 chars                  | ~286ms       | ✅        | Performance within limits                        |

### Memory Behavior Analysis

| Pipeline Stage                         | Memory Pattern                                           | Risk Level |
| -------------------------------------- | -------------------------------------------------------- | ---------- |
| `cleanArabicText()`                    | **Flat** — no per-line accumulation beyond string copies | 🟢 Low     |
| `generateMarkdown()`                   | **Flat** — single-pass line processing                   | 🟢 Low     |
| `analyzeText()`                        | **Flat** — regex scans on input string                   | 🟢 Low     |
| `splitPdfPages()`                      | **⚠️ Not tested** — creates per-page canvas buffers      | 🟡 Medium  |
| `GoogleDriveOcrProvider.extractText()` | **Low** — streams from Drive API                         | 🟢 Low     |
| `SuryaOcrProvider.extractPages()`      | **⚠️ Not tested** — writes temp PNGs per page            | 🟡 Medium  |

### Leak Detection

**Result: No memory leaks detected** across all tests.

The cleanup pipeline uses string transformations with no external resources, no mutable global state, and no event listeners. All functions are pure transformations: `string → string`.

### Resource Profile by Input Type

| Input Type                    | Cleanup Time (1000 words) | Cleanup Time (10000 words) | Memory |
| ----------------------------- | ------------------------- | -------------------------- | ------ |
| Clean Arabic text             | 2-3ms                     | 26-30ms                    | ~0.5MB |
| Noisy Arabic (30% corruption) | 2-4ms                     | 28-35ms                    | ~0.6MB |
| Mixed Arabic/English          | 2-3ms                     | 25-30ms                    | ~0.5MB |
| Heading-heavy document        | 1-2ms                     | 20-25ms                    | ~0.4MB |
| Garbage-only input            | 1ms                       | 5-8ms                      | ~0.1MB |

### Bottleneck Identification

| Bottleneck                | Location                   | Severity | Mitigation                                  |
| ------------------------- | -------------------------- | -------- | ------------------------------------------- |
| Regex-heavy cleanup       | `reconstructArabicLines()` | 🟢 Low   | Single-pass char iteration, no backtracking |
| Heading keyword matching  | `detectArabicHeadings()`   | 🟢 Low   | 40+ keywords but O(n) per-line              |
| Garbage ratio calculation | `finalCleanup()`           | 🟢 Low   | Per-line regex, high constant factor        |
| Line-by-line splitting    | All stages                 | 🟢 Low   | `text.split("\n")` creates array copy       |

### Recommendations

1. **Add PDF page limit guard** — `splitPdfPages()` should warn at 200+ pages (memory pressure from canvas buffers)
2. **Monitor Surya temp dir cleanup** — Ensure `rmdir(tempDir)` always runs even on early exit
3. **Consider streaming cleanup** — For 500+ page documents, streaming line-by-line would reduce peak memory
4. **Profile canvas allocation** — Each A4 page at 300 DPI = ~8.7MB PNG. 100 pages = ~870MB peak.
