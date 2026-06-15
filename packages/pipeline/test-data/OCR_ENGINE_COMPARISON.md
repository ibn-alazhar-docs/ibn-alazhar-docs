# OCR Engine Comparison

## Overview

Baseline comparison between Google Drive OCR and Surya OCR for the Ibn Al-Azhar Docs pipeline. Focused on Arabic text quality, performance characteristics, and operational requirements.

## Comparison Matrix

| Category             | Google Drive OCR                  | Surya OCR                      |
| -------------------- | --------------------------------- | ------------------------------ |
| **Type**             | Cloud API                         | Local (Python)                 |
| **Arabic quality**   | Good (proprietary model)          | Very good (specialized)        |
| **Punctuation**      | Moderate — often drops diacritics | Good — preserves most tashkeel |
| **Heading recovery** | Automatic (format detection)      | Line-level only                |
| **Speed**            | ~5-15s per page (network)         | ~2-30s per page (GPU/CPU)      |
| **Memory**           | None (external API)               | 2-4 GB (model load)            |
| **Cost**             | Free tier (limited)               | Free (self-hosted)             |
| **Privacy**          | Data leaves server                | Fully local                    |
| **Setup**            | API credentials                   | Python + pip install           |
| **Dependencies**     | Network, Drive API                | Python 3, PyTorch, surya-ocr   |
| **Concurrency**      | 3 parallel (API limits)           | 1-2 (GPU memory)               |
| **Offline**          | No                                | Yes                            |
| **GPU support**      | N/A                               | Yes (CUDA)                     |
| **PDF handling**     | Native                            | Requires page splitting        |
| **Fallback support** | —                                 | Yes (to Google OCR)            |

## Arabic Accuracy

### Strengths

| Feature               | Google OCR     | Surya OCR    |
| --------------------- | -------------- | ------------ |
| Standard Arabic text  | ✅ Good        | ✅ Good      |
| Classical Arabic      | ✅ Good        | ✅ Very good |
| Quranic text          | ⚠️ Moderate    | ✅ Good      |
| Diacritics (tashkeel) | ⚠️ Often drops | ✅ Preserves |
| Arabic numerals       | ✅ Good        | ✅ Good      |
| Persian/Arabic mixed  | ✅ Good        | ✅ Good      |
| Noisy scans           | ✅ Good        | ⚠️ Moderate  |
| Handwritten           | ⚠️ Poor        | ⚠️ Poor      |

### Known failure patterns

| Pattern             | Google OCR | Surya OCR       |
| ------------------- | ---------- | --------------- |
| Ray/زayn confusion  | Low        | Low             |
| Seen/Sheen dots     | Low        | Very low        |
| Final alef dropped  | Moderate   | Low             |
| Lam-alef ligature   | Moderate   | Low             |
| Page layout merging | Moderate   | Line-preserving |

## Performance Benchmarks

### Latency (per page, 300 DPI A4 Arabic)

| Engine     | CPU (no GPU) | GPU (CUDA) | Network |
| ---------- | ------------ | ---------- | ------- |
| Google OCR | N/A          | N/A        | ~5-15s  |
| Surya OCR  | ~10-30s      | ~2-5s      | N/A     |

### Memory (per worker)

| Engine      | Idle   | Per page | Peak  |
| ----------- | ------ | -------- | ----- |
| Google      | 50 MB  | 0 MB     | 50 MB |
| Surya (CPU) | 500 MB | 200 MB   | 2 GB  |
| Surya (GPU) | 2 GB   | 500 MB   | 4 GB  |

### Queue throughput estimation

| Engine | Pages/min (1 worker CPU) | Pages/min (1 worker GPU) |
| ------ | ------------------------ | ------------------------ |
| Google | 4-12                     | 4-12                     |
| Surya  | 2-6                      | 12-30                    |

## Operational Profile

### Google OCR

| Factor         | Detail                  |
| -------------- | ----------------------- |
| Startup time   | Instant (stateless)     |
| Reliability    | Dependent on Google API |
| Rate limits    | 10 req/100s (free tier) |
| Quota          | 50MB/month (free tier)  |
| Error recovery | Retry with backoff      |

### Surya OCR

| Factor         | Detail                      |
| -------------- | --------------------------- |
| Startup time   | ~10-30s (model load)        |
| Reliability    | CPU/memory dependent        |
| Rate limits    | None (local)                |
| Quota          | None (local)                |
| Error recovery | Per-page retry, skip failed |

## Recommendation

| Scenario          | Recommended                    | Rationale                    |
| ----------------- | ------------------------------ | ---------------------------- |
| Quick MVP         | Google OCR                     | No setup, fast integration   |
| Arabic diacritics | Surya OCR                      | Better tashkeel preservation |
| Privacy-sensitive | Surya OCR                      | Fully local                  |
| No GPU            | Google OCR                     | Surya too slow on CPU        |
| High volume       | Surya OCR (GPU)                | No API costs or rate limits  |
| Mixed             | Both (Google → Surya fallback) | Best availability            |

## Implementation Status

- Google OCR: ✅ Production (Phase 1A)
- Surya OCR: ⚠️ MVP-ready (Phase 1C — architecture complete, requires Python + GPU for production use)
- Hybrid fallback: ⚠️ Architecture complete (Phase 1C — OcrManager handles fallback)
- Comparative evaluation: ⚠️ Baseline documented (Phase 1C — needs real Arabic corpus testing)
