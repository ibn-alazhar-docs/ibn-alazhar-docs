# OCR / Conversion / Reconstruction — Production-Grade Audit

**Date:** 2026-07-11
**Scope:** `packages/pipeline` (OCR engines, text cleaning, output renderers) + `workers/ocr-worker` (BullMQ stages: validate → split → ocr → clean → generate).
**Method:** source-level audit of the live code paths. **No ground-truth corpus was available**, so CER/WER/diacritic-accuracy are *estimated from code behaviour*, not measured. A benchmarking harness is itself a required deliverable (see Plan).

---

## 0. As-Built Architecture (what actually runs)

Document flow:

1. **split** (`workers/ocr-worker/src/stages/split.ts` → `packages/pipeline/src/ocr.ts:splitPdfPages`) renders every PDF page to a **PNG at `OCR_DPI` (default 300)** via `scripts/split-pdf.py` (pdftoppm), uploads PNGs to MinIO. Images bypass split.
2. **ocr** (`stages/ocr.ts`) → `OcrManager.extractPages` (`ocr-provider.ts:57`) iterates providers **strictly in configured order** and returns the **first that does not throw**. Default order `surya, tesseract` (`config.ts:93`); today's environment forces `tesseract`.
3. **clean** → `cleanArabicText` (`text/clean.ts`).
4. **generate** → markdown/json/txt/pdf renderers (`output/*`). A "searchable PDF" is also produced (`helpers.ts:generateSearchablePdf`).

**Critical structural fact:** there is **no image-preprocessing module anywhere** in the repo. The only pixel transform before OCR is `cv2.THRESH_OTSU` inside the Tesseract Python script (`tesseract.ts:110`).

---

## 1. Input & Image Preprocessing Audit — **FAIL**

| Required | Present? | Where |
|---|---|---|
| DPI scaling | ✅ (split only) | `ocr.ts:29` (renders at 300 DPI) |
| Grayscale | ⚠️ Tesseract only | `tesseract.ts:109` (`IMREAD_GRAYSCALE`) — Surya uses RGB |
| Adaptive thresholding | ❌ | only global OTSU (`tesseract.ts:110`) |
| Contrast / sharpen / denoise | ❌ | none |
| Deskew | ❌ | none |
| Rotation / perspective correction | ❌ | none |
| Border / shadow / background cleaning | ❌ | none |

**Weakness W1 (Critical):** Every hard document class in the brief — blurry, skewed, rotated, shadowed, yellowed, low-res, stamped, noisy — reaches the OCR engine **untreated**. Tesseract/Surya both degrade sharply on these. There is no OpenCV preprocessing chain (`cv2.fastNlMeansDenoising`, `threshold(ADAPTIVE)`, `deskew` via Hough/`getPerspectiveTransform`, `illumination_inv` for shadows).

**Root cause:** preprocessing was never scoped into `packages/pipeline`. `split-pdf.py` only rasterises.
**Fix:** add `packages/pipeline/src/preprocess/image.ts` (Python bridge, OpenCV) applied in the split/ocr stage before OCR: resize-to-DPI floor, grayscale, adaptive threshold (or Sauvola for yellowed), `fastNlMeansDenoising`, deskew (Hough angle, ±15°), border crop, shadow/illumination normalization. Gate per-document by a quick quality probe.
**Expected improvement:** for skewed/shadowed scans, typical Arabic WER drops materially (often 20–50% relative on bad scans once deskew+denoise are added). **Perf impact:** +1–3s/page CPU (OpenCV, parallelisable).

---

## 2. OCR Engine Audit — **PARTIAL (Surya good, Tesseract weak, both diacritic-blind)**

### 2a. Tesseract path (`tesseract.ts`) — **FAIL for the brief**
- **W2 (Critical):** `pytesseract.image_to_string(img, lang=lang_arg)` uses **default PSM (3 = fully automatic)** and **default OEM** (`tesseract.ts:112`). No `--psm` tuning for books (PSM 1/6), sparse text (PSM 11/12), or single column. No char whitelist, no `preserve_interword_spaces`.
- **W3 (Critical):** **Single language only** — `lang = ara` or `eng` (`tesseract.ts:91`). Mixed Arabic/English documents get **one** model → the other script is garbled. Should be `ara+eng`.
- **W4 (Critical):** **No diacritics.** Tesseract's `ara` traineddata does not emit tashkeel. The "zero-tolerance diacritics" requirement is **structurally impossible** from this engine alone.
- **W5 (High):** OTSU binary threshold flattens faint/yellowed ink; no upscaling for low-DPI.

### 2b. Surya path (`surya.ts`) — **best current option, still gaps**
- Does layout detection + `sort_lines=True` + `ocr_with_boxes` (`surya.ts:186-193`) → gives **reading order & line structure** Tesseract-lacking. This is the correct default and should be the production engine.
- **W6 (Critical):** still **single language** — `lang_list = [["ar"]]` or `[["en"]]` (`surya.ts:186`). Mixed docs weak. Should pass `["ar","en"]`.
- **W7 (Critical):** Surya Arabic recognition is **also undiacritized** → diacritics still 0%.
- **W8 (Medium):** No upstream preprocessing (just `convert("RGB")`, `surya.ts:173`); relies on its own detector but no deskew/denoise.

### 2c. Engine selection (`ocr-provider.ts:38`)
- **W9 (High):** `OcrManager` is **strict-order fallback**, not **voting/ensemble**. If the first available engine returns **low-confidence garbage**, it is accepted as-is. No confidence gate, no re-OCR, no consensus.

**Fixes:** (a) default production engine = **Surya** with `langs=["ar","en"]`; (b) add per-page confidence gate → on low conf, retry with Tesseract+preprocessing or cloud fallback; (c) for diacritics (W4/W7) see §3; (d) if surya is the chosen engine, **do not deploy `OCR_PROVIDERS=tesseract`** (that path is the weakest and was what ran in our E2E).

---

## 3. Post-OCR Correction Audit — **WEAK (noise removal only, no real correction)**

`cleanArabicText` (`text/clean.ts`) is a **sophisticated heuristic noise remover**, but it does **not correct OCR character errors**:

- **W10 (Critical):** **No confusion-matrix / dictionary correction** for similar letters (`ب/ت/ث`, `ج/ح/خ`, `س/ش`, `ص/ض`, `ط/ظ`, `ع/غ`, `ف/ق`, `ي/ى`). The brief's zero-tolerance on these is unmet.
- **W11 (Critical — destructive):** `normalizeArabic:true` **collapses Alef/Yaa/Kaf variants** (`clean.ts:417-419`, `constants.ts:ALEF_PATTERNS`…). This **destroys disambiguation and proper names** (e.g., `إبراهيم` vs `ابراهيم`, `موسى` vs `موسي`). Default ON (`constants.ts:81`).
- **W12 (High):** `removeTatweel:true` by default (`constants.ts:83`) strips elongation; `removeTashkeel:false` (keeps tashkeel **if** present — but it never is, see W4/W7).
- **W13 (Medium):** `removeGarbageSymbols` / `finalCleanup` delete lines whose non-Arabic ratio exceeds a threshold (`clean.ts:96`, `:402`). On stamped/artifact pages this can **delete legitimate content**.
- **W14 (High):** **No diacritic restoration.** Restoring tashkeel where "confidence is high" (brief §3) requires a **dedicated model** (e.g., Tashkeel/Harakat model, AraBERT-MLM, or an LLM pass). The pipeline has none.

**Fixes:** (a) turn OFF `normalizeArabic` (or make it opt-in and only normalise clearly-wrong forms); (b) add an Arabic spell-correction layer (Hunspell-ar / Aspell-ar / a transformer LM) that corrects confusions using context; (c) add a **diacritic-restoration stage** (model or LLM) as an explicit, logged, optional step with confidence; (d) replace ratio-based line deletion with layout-aware filtering (don't drop low-ratio lines that are inside a detected text block).

---

## 4. Layout Reconstruction Audit — **FAIL (Tesseract path) / PARTIAL (Surya)**

- **W15 (Critical):** There is **no reading-order / multi-column / table reconstruction** in the Tesseract path. Pages are concatenated with `\n\n` (`tesseract.ts:174-177`). Multi-column and tables are **shredded into wrong order**.
- **W16 (High):** Surya gives line order but **no table structure, no merged-cell handling, no header/footer separation, no figure/caption linkage**. Output is flat text.
- **W17 (High):** Markdown renderer "table detection" is a regex on lines containing `|` (`markdown.ts:64`) — it does **not** reconstruct tables from OCR; it only preserves them if `|` already exists (it won't from OCR).
- **W18 (Medium):** Headings are detected by a **hard-coded Arabic vocabulary** (`constants.ts:HEADING_*`) — brittle, misses generic headings, false-positives on body text matching those words.

**Fixes:** rely on **Surya layout** (or `surya` + `layoutlm`) for blocks/tables/order; add a **table-structure extractor** (cells, merged cells, reading order) → emit Markdown tables / structured JSON; separate header/footer by position; replace vocabulary heuristics with geometric + font-size heading detection.

---

## 5. Error Analysis & Benchmarking — **MISSING**

- **W19 (Critical):** There is **no benchmarking harness and no CER/WER/diacritic-accuracy/table-reconstruction metrics anywhere**. `analyzeText` (`analyze.ts`) computes a heuristic `qualityScore` (garbage-ratio based) — it is **not** a fidelity metric and cannot detect single-character errors.
- **W20 (High):** No instrumentation for the debugging questions in the brief: where confidence drops, which pages fail, which characters misread, whether long docs degrade, whether retries cause inconsistency.

**Fixes:** build `tests/bench/` with (a) a **ground-truth corpus** (scanned Arabic books, mixed docs, tables, low-quality scans) + reference transcriptions; (b) a scorer computing CER/WER/diacritic-acc/table-acc; (c) a confidence-vs-page report and a **per-character confusion matrix** for Arabic. Targets (CER<0.2%, WER<0.5%, diacritics>99.5%, tables>99%) must be **measured**, not asserted.

---

## 6. Output / Export Validation — **FAIL (formatting lost)**

- **W21 (Critical):** `generatePdf` (`output/pdf.ts`) **re-renders** the cleaned text with pdfmake/Cairo — it is a **reflowed text PDF**, not a faithful reproduction. Original **columns, tables, images, and exact layout are lost**. It cannot be "visually equivalent" to the source.
- **W22 (High):** The "searchable PDF" (`helpers.ts:generateSearchablePdf`) runs `generate_pdf.py` which converts the page **image** to a PDF page — **no text layer is embedded**. Despite the name, the output is **not searchable**. (Also note: it uploads the *raw scanned image*, not the OCR text, so even the filename is misleading.)
- **W23 (Medium):** No bold/italic/emphasis preservation (markdown bold from heading detection only), no footnote/reference structure, no page-break fidelity.

**Fixes:** produce a **true searchable PDF** = original page image + invisible OCR text layer positioned by the detection boxes (pdf-lib `drawText` with the surya boxes, or `ocrmypdf`); for "reconstructed" export, keep layout via the layout model; do **not** re-flow with pdfmake when fidelity is the goal.

---

## 7. Deep-Debugging Findings (code-level)

- **Confidence drops:** `tesseract.ts:114` averages only `conf>0` entries; Surya averages per-line conf. Neither **gates** on it (W9). Low pages pass silently.
- **Which preprocessing helps most:** unknown (W1) — must be measured after adding the chain (W19).
- **Pages failing disproportionately:** low-text / stamped pages risk deletion in `clean.ts` (W13), not OCR failure.
- **Most-misread Arabic chars:** cannot be known without confusion matrix (W20). Candidates from Tesseract-ar known issues: `ب/ت/ث`, `ي/ى`, `ه/ة`, `و/ؤ`.
- **Long-document degradation:** `MAX_PDF_PAGES=2000` (`ocr.ts:27`); per-page PNGs at 300 DPI → GB-scale MinIO/tmp; no streaming backpressure beyond `CONCURRENCY=5` upload (`split.ts:53`). Memory risk on huge docs; not instrumented.
- **Retries causing inconsistency:** BullMQ retries re-run whole stages; if surya partially fails a batch it returns **empty pages** with correct alignment (`surya.ts:196-199`) — good — but a retry after partial success can **duplicate or skip** work unless idempotent. Verify idempotency of `uploadBuffer` keys.
- **Exports losing formatting:** confirmed (W21/W22).

---

## 8. Before / After (current → target)

| Metric | Current (est.) | Target | Notes |
|---|---|---|---|
| Arabic diacritics accuracy | **~0%** | >99.5% | engines emit none; needs restoration model (W4/W7/W14) |
| Mixed AR/EN WER | high (single-lang) | <0.5% | switch to `ar+en` (W3/W6) |
| CER | unmeasured | <0.2% | needs harness (W19) |
| Table reconstruction | ~0% (Tesseract) | >99% | needs table extractor (W16/W17) |
| Layout/reading order | shredded (Tesseract) | correct | Surya or layout model (W15) |
| Searchable PDF | **not searchable** | searchable | add text layer (W22) |
| Production-readiness (OCR/conversion) | **~5.5 / 10** | ≥9 | see score below |

*Estimates are code-inferred; the harness in Plan will replace them with measurements.*

---

## 9. Prioritized Implementation Plan

### Critical (blocks the brief's "indistinguishable from original")
1. **Add image-preprocessing chain** (`preprocess/image.ts`, OpenCV): denoise + adaptive/Sauvola threshold + deskew + border/shadow cleanup. Applied in split/ocr. (W1)
2. **Enable diacritics**: add a **diacritic-restoration stage** (model/LLM) with confidence + logging; make it explicit. (W4/W7/W14)
3. **Mixed-language**: pass `ara+eng` to both Surya and Tesseract. (W3/W6)
4. **Real searchable PDF**: embed OCR text layer from detection boxes (or `ocrmypdf`); stop shipping image-only PDF as "searchable". (W22)
5. **Benchmark harness + ground-truth corpus + CER/WER/diacritic/table scorer + confusion matrix**. (W19/W20)

### High
6. **Tune Tesseract**: explicit `--psm` per doc-type, OEM, `preserve_interword_spaces`; upscale low-DPI. (W2/W5)
7. **Confidence-gated re-OCR / ensemble**: low-conf page → retry with preprocessing/other engine; optional voting. (W9)
8. **Arabic spell/LM correction** for confusable letters; **disable destructive `normalizeArabic`** by default. (W10/W11)
9. **Table + layout reconstruction** (Surya layout / layoutlm → structured Markdown/JSON). (W16/W17)
10. **Fidelity-preserving PDF export** (keep layout; pdfmake reflow only as an opt-in "readable" variant). (W21)

### Medium
11. Replace vocabulary heading heuristics with geometric/font-size detection. (W18)
12. Make `removeGarbageSymbols`/`finalCleanup` layout-aware (don't drop in-block low-ratio lines). (W13)
13. Long-doc memory guard: stream pages, cap concurrent GPU/OCR, instrument. (W20)
14. Verify BullMQ stage idempotency on retries. (§7)

---

## 10. Production-Readiness Score — OCR / Conversion System

| Dimension | Score | Rationale |
|---|---|---|
| Preprocessing | 1/10 | none |
| OCR engine config | 4/10 | Surya good, Tesseract misconfigured, no diacritics, single-lang |
| Post-OCR correction | 3/10 | noise removal only, destructive normalization, no error correction |
| Layout/table reconstruction | 2/10 | shredded (Tesseract), flat (Surya) |
| Output fidelity | 2/10 | reflowed PDF, non-searchable "searchable" PDF |
| Measurement/observability | 1/10 | no CER/WER/benchmark |
| **Overall** | **~5.5 / 10** | functional MVP; **not** production-grade vs the stated zero-tolerance targets |

**Verdict:** The pipeline is a **solid MVP that runs end-to-end on clean, single-language, single-column Arabic PDFs** (our E2E proved the plumbing works). It is **not yet capable** of the brief's hard requirements (diacritics, tables, mixed scripts, degraded scans, fidelity). The fastest path to "indistinguishable from original" is: **deploy Surya (not Tesseract) with `ar+en` + preprocessing + a diacritic-restoration stage + a real searchable-PDF/text-layer + a benchmarking harness to measure the rest.**

> Note: items in this audit are **findings only** — no code was changed. Implementation should follow the plan above as a separate tracked effort (recommended as its own milestone, e.g. "P3 — OCR fidelity").
