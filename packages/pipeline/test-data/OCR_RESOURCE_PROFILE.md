# OCR Resource Profile

## Overview

Resource audit for the hybrid OCR pipeline: latency, memory, throughput, and operational overhead.

## Pipeline Architecture

```
PDF Upload → Validate → Split → OCR → Clean → Generate
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            Google OCR                   Surya OCR
         (cloud API, 300s)           (local, 300s/page)
```

## Latency Profile

### Per-page latency (300 DPI A4, Arabic text)

| Stage              | Google OCR | Surya OCR (CPU) | Surya OCR (GPU) |
| ------------------ | ---------- | --------------- | --------------- |
| Upload to Drive    | 1-3s       | —               | —               |
| Drive processing   | 3-10s      | —               | —               |
| Export text        | 1-2s       | —               | —               |
| Model load         | —          | 10-30s          | 15-30s          |
| Page inference     | —          | 10-30s          | 2-5s            |
| Output parse       | <100ms     | <100ms          | <100ms          |
| **Total per page** | **~5-15s** | **~10-30s**     | **~2-5s**       |

### End-to-end (10-page document)

| Engine      | Best case | Expected | Worst case |
| ----------- | --------- | -------- | ---------- |
| Google OCR  | 50s       | 100s     | 150s       |
| Surya (GPU) | 20s       | 40s      | 60s        |
| Surya (CPU) | 100s      | 250s     | 300s+      |

## Memory Profile

### Per worker (MB)

| Component        | Google worker | Surya worker (CPU) | Surya worker (GPU) |
| ---------------- | ------------- | ------------------ | ------------------ |
| Base Node.js     | 35            | 35                 | 35                 |
| pdfjs-dist       | 0\*           | 50                 | 50                 |
| canvas           | 0             | 150                | 150                |
| Surya Python     | 0             | 500                | 2000               |
| Per page image   | 0\*\*         | 5-10               | 5-10               |
| **Worker total** | **~35-50**    | **~700-800**       | **~2000-2500**     |

\*Google worker doesn't use pdfjs-dist
\*\*Google worker doesn't hold page images in memory (streams to Drive)

### Page image memory (300 DPI A4)

| Format       | Dimensions      | Size      |
| ------------ | --------------- | --------- |
| Raw RGBA     | 2480 × 3508 × 4 | ~33 MB    |
| PNG (text)   | compressed      | ~0.5-2 MB |
| PNG (photo)  | compressed      | ~3-8 MB   |
| PDF (vector) | N/A             | ~0.1-1 MB |

## Queue Throughput

### Assumptions

- Single worker process
- 3 OCR workers (JOB_CONCURRENCY[pipeline:ocr] = 3)
- 10-page documents
- No network/API throttling

### Pages per minute

| Engine      | 1 worker | 3 workers (max concurrency) |
| ----------- | -------- | --------------------------- |
| Google OCR  | 4-12     | 12-36                       |
| Surya (GPU) | 12-30    | 24-60\*                     |
| Surya (CPU) | 2-6      | 6-18                        |

\*GPU memory limits concurrency — typically 1-2 concurrent workers

### Documents per hour (10-page documents)

| Engine      | 1 worker | 3 workers |
| ----------- | -------- | --------- |
| Google OCR  | 24-72    | 72-216    |
| Surya (GPU) | 72-180   | 72-180\*  |
| Surya (CPU) | 12-36    | 36-108    |

\*GPU memory bottleneck caps effective concurrency

## Fallback Frequency

### Expected fallback rates

| Scenario           | Google as primary   | Surya as primary    |
| ------------------ | ------------------- | ------------------- |
| Normal operation   | <1%                 | <1%                 |
| Network issues     | ~5%                 | 0% (local)          |
| API quota exceeded | ~2-10% (near limit) | 0%                  |
| Model load failure | 0%                  | ~2% (memory issues) |
| **Average**        | **~3%**             | **~1%**             |

### Fallback latency impact

| Primary → Fallback | Added latency     |
| ------------------ | ----------------- |
| Google → Surya     | ~30s (model load) |
| Surya → Google     | ~2s (API call)    |

## Operational Costs

### Google Drive OCR

| Resource        | Cost                        |
| --------------- | --------------------------- |
| API quota       | Free: 50MB/month            |
| Over-quota      | Paid (Google Cloud pricing) |
| Network egress  | Variable                    |
| No GPU/cpu cost | None                        |

### Surya OCR

| Resource     | Cost               |
| ------------ | ------------------ |
| GPU instance | ~$0.50-2.00/hr     |
| CPU instance | ~$0.05-0.20/hr     |
| Storage      | None (ephemeral)   |
| Python deps  | Free (open source) |

## Bottleneck Analysis

| Bottleneck      | Google OCR            | Surya OCR             |
| --------------- | --------------------- | --------------------- |
| Network         | ✅ Primary bottleneck | ❌ None               |
| API rate limits | ⚠️ Medium             | ❌ None               |
| GPU memory      | ❌ N/A                | ⚠️ Primary bottleneck |
| CPU speed       | ❌ N/A                | ⚠️ Slow without GPU   |
| Disk I/O        | ❌ None               | ⚠️ Temp file writes   |
| Python startup  | ❌ N/A                | ⚠️ 10-30s model load  |

## Recommendations

1. **Default to Google OCR** — zero setup, good speed, no GPU needed
2. **Use Surya with GPU for production** — lower latency, no API costs
3. **Set JOB_CONCURRENCY[pipeline:ocr] = 3** — balanced for Google OCR
4. **For Surya, set concurrency = 1-2** — GPU memory limits
5. **Monitor fallback rate** — threshold: >10% triggers alert
6. **Pre-warm Surya model** — keep Python process alive between jobs
