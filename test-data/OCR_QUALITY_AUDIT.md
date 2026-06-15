# OCR Quality Audit — Phase 1E

**Date**: 2026-06-03
**Scope**: Text cleanup pipeline improvements in `packages/pipeline/src/text.ts`

## Baseline Metrics (Before Phase 1E)

| Metric                    | Value                              |
| ------------------------- | ---------------------------------- |
| Quality Score             | 58/100                             |
| Arabic Ratio              | 92.5%                              |
| Garbage Ratio             | 8.0%                               |
| Headings Detected         | 0                                  |
| Heading Levels            | None                               |
| Punctuation               | Mixed variants (، , ؛ ; ؟ ?)       |
| Mixed Arabic/English      | English words stripped incorrectly |
| Repetition Collapse       | Not implemented                    |
| Isolated Fragment Removal | Not implemented                    |

## After Phase 1E

| Metric                    | Value                             | Delta |
| ------------------------- | --------------------------------- | ----- |
| Quality Score             | 68/100                            | +10   |
| Arabic Ratio              | 91.8%                             | -0.7% |
| Garbage Ratio             | 8.0%                              | 0     |
| Headings Detected         | 8                                 | +8    |
| Heading Levels            | 2 (## chapters, ### sub-sections) | New   |
| Punctuation               | Normalized (单一 ، ؛ ؟)           | Fixed |
| Mixed Arabic/English      | English words preserved           | Fixed |
| Repetition Collapse       | Implemented                       | New   |
| Isolated Fragment Removal | Implemented                       | New   |

## Code Changes

### Files Modified

- `packages/pipeline/src/text.ts` — Core cleanup pipeline (689 lines)
- `packages/pipeline/src/output.ts` — Markdown/TXT/JSON generation (175 lines)

### New Functions Added

1. `normalizeArabicPunctuation()` — Normalizes Arabic punctuation variants (، , ؛ ; ؟ ? →单一 forms)
2. `removeIsolatedFragments()` — Removes symbol-only short lines
3. `collapseRepeatedWords()` — Collapses triple+ repeated words

### Functions Modified

1. `removeAsciiNoise()` — Now only removes single-char ASCII garbage between Arabic chars (preserves meaningful English phrases)
2. `detectArabicHeadings()` — Added ordinal heading detection (أولاً, ثانياً, etc.), added `الدرس` pattern, improved sub-heading detection
3. `detectPostReconstructionHeadings()` — Aligned with new heading hierarchy
4. `analyzeText()` — Added `level1HeadingCount`, `level2HeadingCount`, `level3HeadingCount` fields

### Interface Changes

- `TextAnalysis` — Added 3 new fields: `level1HeadingCount`, `level2HeadingCount`, `level3HeadingCount`

### Frontmatter Changes

Markdown output now includes:

```yaml
headings_level1: 0
headings_level2: 6
headings_level3: 2
garbage_ratio: 8.0%
paragraphs: 1
quality_score: 68
```

## Test Results

| Suite                          | Before      | After       |
| ------------------------------ | ----------- | ----------- |
| text.test.ts                   | 44/45 pass  | 45/45 pass  |
| operational.test.ts            | 31/31 pass  | 31/31 pass  |
| phase1d-burnin.test.ts         | 64/65 pass  | 65/65 pass  |
| ocr-quality-regression.test.ts | N/A (new)   | 33/33 pass  |
| **Total**                      | **371/375** | **441/441** |

## Known Limitations

1. **Heading false positives reduced** — `المبحث العلمي` and `نظر` no longer false-positive, but this means some legitimate heading patterns may be missed
2. **Trailing ellipsis** — `انتظر...` → `انتظر` (trailing dots removed by noise filter)
3. **Collapse threshold** — Triple-repeated identical words collapsed, but shorter repetitions preserved
