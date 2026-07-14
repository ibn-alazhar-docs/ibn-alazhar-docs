# OCR Configuration Guide

This document explains how to configure and optimize the OCR (Optical Character Recognition) pipeline for Arabic document processing.

## Quick Start

### Local-Only Setup (No API Keys Required)

For development or air-gapped deployments, use local OCR engines:

```bash
# .env
OCR_PROVIDER=surya
OCR_PROVIDERS=surya,tesseract
OCR_CLOUD_ENABLED=false
```

**Pros:** No cost, data stays on-premise, no API keys needed  
**Cons:** Lower accuracy on complex layouts, slower than cloud

---

### Cloud Setup (Best Quality - Recommended for Production)

For production with high-quality output, use Gemini:

```bash
# .env
OCR_PROVIDER=gemini
OCR_PROVIDERS=gemini,surya,tesseract
OCR_CLOUD_ENABLED=true
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

**Pros:** State-of-the-art accuracy, handles complex layouts (exams, tables, multi-column)  
**Cons:** Requires API key, usage costs, data sent to Google

---

## OCR Providers

### 1. **Gemini (Recommended for Production)**

**Use for:** All document types, especially exams, Q&A, tables, multi-column layouts

- **Model:** `gemini-1.5-flash` (fast, cost-effective) or `gemini-1.5-pro` (highest accuracy)
- **Setup:** Get API key from https://aistudio.google.com/app/apikey
- **Cost:** ~$0.10 per 1M input tokens (≈ 100-200 pages)
- **Speed:** 1-3 seconds per page (batched)
- **Accuracy:** ⭐⭐⭐⭐⭐ (best for Arabic + diacritics)

```bash
OCR_PROVIDER=gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-flash
```

---

### 2. **Surya (Local, Fast)**

**Use for:** Simple text documents, dev/testing, air-gapped environments

- **Setup:** No configuration needed (bundled)
- **Cost:** Free
- **Speed:** 2-5 seconds per page
- **Accuracy:** ⭐⭐⭐ (good for clean scans, struggles with complex layouts)

```bash
OCR_PROVIDER=surya
```

---

### 3. **Tesseract (Local, Basic)**

**Use for:** Fallback only, simple documents

- **Setup:** No configuration needed (bundled)
- **Cost:** Free
- **Speed:** 1-3 seconds per page
- **Accuracy:** ⭐⭐ (basic, often misses diacritics)

```bash
OCR_PROVIDER=tesseract
```

---

### 4. **Google Cloud Vision + Drive (Cloud, Legacy)**

**Use for:** Organizations already using Google Workspace

- **Setup:** Requires service account with Drive and Vision API access
- **Cost:** $1.50 per 1000 pages (Drive API) + $1.50 per 1000 images (Vision API)
- **Speed:** 3-5 seconds per page
- **Accuracy:** ⭐⭐⭐⭐ (good, but Gemini is better for Arabic)

```bash
OCR_PROVIDER=google
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

---

## Fallback Chain

The pipeline tries providers in order until one succeeds:

```bash
# Try Gemini first, fall back to Surya, then Tesseract
OCR_PROVIDERS=gemini,surya,tesseract
```

**Use cases:**
- **Cost control:** Use local OCR first, cloud only for failed jobs
- **Reliability:** Cloud primary with local fallback for API outages
- **Quality gating:** Retry with better provider if confidence < threshold

---

## Quality Settings

### Confidence Threshold

Retry with next provider if OCR confidence is below threshold:

```bash
# Retry if confidence < 70%
OCR_MIN_CONFIDENCE=0.7
```

**Recommended values:**
- `0.0` = no gating (accept all results)
- `0.5` = retry very poor results
- `0.7` = retry mediocre results (recommended for production)
- `0.9` = retry anything less than excellent (expensive)

---

### DPI (Rasterization Resolution)

Controls PDF-to-image conversion quality:

```bash
OCR_DPI=300  # Standard (recommended)
```

**Values:**
- `200` = Fast, lower quality (dev/testing)
- `300` = Standard (production default)
- `400` = High quality (complex documents, small text)
- `600` = Very high quality (rare, slow)

---

## Image Preprocessing

Preprocessing enhances scan quality before OCR. Modes:

```bash
OCR_PREPROCESS_MODE=auto  # Smart (recommended)
```

**Modes:**
- `auto` = Only upscale genuinely low-res pages, always denoise/deskew (default)
- `on` = Always preprocess every page (slow, thorough)
- `off` = No preprocessing (fast, lower quality)

---

### Individual Preprocessing Steps

Fine-tune preprocessing with these flags (`1`=on, `0`=off):

```bash
# Always-on steps (recommended)
OCR_DESKEW=1      # Correct rotation and skew (±15° max)
OCR_CLAHE=1       # Contrast-limited adaptive histogram equalization
OCR_DENOISE=1     # Non-local means denoising
OCR_SHADOW=1      # Shadow/illumination normalization

# Optional steps (usually off)
OCR_BORDER=0      # Crop large uniform borders (can remove headers/footers)
OCR_PERSPECTIVE=0 # Perspective correction (for photos of pages)
OCR_BINARIZE=0    # Adaptive thresholding (can help very poor scans)
OCR_SHARPEN=0     # Unsharp masking (can introduce artifacts)
```

**When to enable optional steps:**
- `OCR_BORDER=1`: Large white margins with no content
- `OCR_PERSPECTIVE=1`: Photos of pages (not flat scans)
- `OCR_BINARIZE=1`: Very faded or yellowed pages
- `OCR_SHARPEN=1`: Blurry scans (test first, can backfire)

---

## Document Type Detection

The pipeline automatically detects document type and adjusts cleaning:

### Exam/Q&A Documents

**Auto-detected when text contains:**
- Question markers: `س١:`، `س5:`، `سؤال ١:`
- Answer choices: `(أ)`، `(ب)`، `(ج)`، `(د)`
- Fill-in-the-blank: `...`، `(…)`

**Cleaning behavior:**
- Preserves line breaks (no merging)
- Keeps mixed Arabic/Latin content (س١، س5)
- Doesn't auto-detect headings
- Keeps "garbage-looking" lines (answer choices with symbols)

### General Documents

**Default for:**
- Books, articles, research papers
- Continuous prose

**Cleaning behavior:**
- Merges broken lines
- Detects headings automatically
- Removes ASCII noise
- Collapses repeated content

---

## Troubleshooting

### Problem: Poor OCR Quality

**Solutions:**
1. Increase DPI: `OCR_DPI=400`
2. Enable preprocessing: `OCR_PREPROCESS_MODE=on`
3. Switch to Gemini: `OCR_PROVIDER=gemini`
4. Enable confidence gating: `OCR_MIN_CONFIDENCE=0.7`

---

### Problem: Questions/Answers Mangled

**Symptom:** Question numbers missing, answers merged with questions

**Solution:** Ensure document type detection is working. Check logs for:
```
[clean] Detected document type: exam
```

If detection fails, the cleaning rules are too aggressive. Force exam mode by modifying `cleanArabicText` options in code.

---

### Problem: Gemini API Errors

**Common errors:**
- `Gemini API Key is missing` → Set `GEMINI_API_KEY` in `.env`
- `API quota exceeded` → Check usage at https://aistudio.google.com/
- `Model not found` → Verify `GEMINI_MODEL` is valid for your region

---

### Problem: Slow Processing

**Solutions:**
1. Lower DPI: `OCR_DPI=200` (dev only)
2. Disable preprocessing: `OCR_PREPROCESS_MODE=off`
3. Use Surya for simple docs: `OCR_PROVIDER=surya`
4. Increase worker concurrency: `JOB_CONCURRENCY[OCR]=5` (code change)

---

## Performance Benchmarks

Tested on 100-page Arabic book (A4, 300 DPI, clean scan):

| Provider   | Time      | Quality | Cost     | Data Residency |
|------------|-----------|---------|----------|----------------|
| Gemini     | 3-5 min   | ⭐⭐⭐⭐⭐ | $0.10    | Cloud (Google) |
| Surya      | 8-12 min  | ⭐⭐⭐   | Free     | Local          |
| Tesseract  | 5-8 min   | ⭐⭐     | Free     | Local          |
| Google CV  | 10-15 min | ⭐⭐⭐⭐  | $0.30    | Cloud (Google) |

**Note:** Complex layouts (tables, exams) heavily favor Gemini.

---

## Production Recommendations

### High-Volume Production (1000+ pages/day)

```bash
OCR_PROVIDER=gemini
OCR_PROVIDERS=gemini,surya
GEMINI_MODEL=gemini-1.5-flash
OCR_MIN_CONFIDENCE=0.7
OCR_DPI=300
OCR_PREPROCESS_MODE=auto
OCR_MAX_RETRIES=2
```

**Why:**
- Gemini for best quality
- Surya fallback for API outages
- Confidence gating catches bad results
- Auto preprocessing balances speed/quality

---

### Budget-Conscious Production (< 100 pages/day)

```bash
OCR_PROVIDER=surya
OCR_PROVIDERS=surya,gemini
OCR_CLOUD_ENABLED=true
GEMINI_API_KEY=your_key
OCR_MIN_CONFIDENCE=0.5
OCR_DPI=300
```

**Why:**
- Local Surya for most documents (free)
- Gemini fallback for failed jobs only
- Lower confidence threshold reduces cloud usage

---

### Air-Gapped / On-Premise Only

```bash
OCR_PROVIDER=surya
OCR_PROVIDERS=surya,tesseract
OCR_CLOUD_ENABLED=false
OCR_DPI=400
OCR_PREPROCESS_MODE=on
```

**Why:**
- No cloud providers
- Higher DPI + preprocessing compensate for Surya's limitations
- Tesseract fallback for diversity

---

## Environment Variables Reference

| Variable                | Default            | Description                                      |
|-------------------------|--------------------|--------------------------------------------------|
| `OCR_PROVIDER`          | `surya`            | Primary OCR engine                               |
| `OCR_PROVIDERS`         | `surya,tesseract`  | Comma-separated fallback chain                   |
| `OCR_CLOUD_ENABLED`     | `false`            | Enable cloud providers (gemini, google)          |
| `GEMINI_API_KEY`        | (empty)            | Gemini API key (required if provider=gemini)     |
| `GEMINI_MODEL`          | `gemini-1.5-flash` | Gemini model ID                                  |
| `OCR_MAX_RETRIES`       | `3`                | Max retry attempts per job                       |
| `OCR_MIN_CONFIDENCE`    | `0.0`              | Confidence threshold for fallback (0.0-1.0)      |
| `OCR_DPI`               | `300`              | PDF rasterization DPI                            |
| `OCR_PREPROCESS_MODE`   | `auto`             | Preprocessing mode (auto/on/off)                 |
| `OCR_TARGET_DPI`        | `400`              | Target DPI for upscaling (auto mode)             |
| `OCR_DESKEW`            | `1`                | Enable deskew (1=on, 0=off)                      |
| `OCR_CLAHE`             | `1`                | Enable CLAHE contrast enhancement                |
| `OCR_DENOISE`           | `1`                | Enable non-local means denoising                 |
| `OCR_SHADOW`            | `1`                | Enable shadow normalization                      |
| `OCR_BORDER`            | `0`                | Enable border cropping                           |
| `OCR_PERSPECTIVE`       | `0`                | Enable perspective correction                    |
| `OCR_BINARIZE`          | `0`                | Enable adaptive thresholding                     |
| `OCR_SHARPEN`           | `0`                | Enable unsharp masking                           |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | (empty)   | Google Cloud service account email               |
| `GOOGLE_PRIVATE_KEY`    | (empty)            | Google Cloud service account private key         |

---

## Support

For issues or questions:
- Check logs: `docker compose logs ocr-worker`
- Review [Architecture](./ARCHITECTURE.md)
- Report bugs: GitHub Issues
