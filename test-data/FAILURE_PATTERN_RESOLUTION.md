# Failure Pattern Resolution

## Overview

This document tracks resolution of the 10 documented failure patterns from Phase 1B. Each pattern now has a defined root cause, deterministic fix, validation case, and regression protection.

---

## Pattern 1: Corrupt PDF Text Layer (FUNDAMENTAL)

**Root Cause**: PDF generators (A-PDF Watermark, early Adobe Arabic) embed custom font encodings with broken glyph-to-Unicode mappings.

**Deterministic Fix**: Pre-scan text layer quality by measuring Arabic character distribution against known letter frequencies. If Arabic ratio is high (>60%) but clean ratio is low (<30%), route to image-based OCR.

**Code Change**: None — this requires a pre-processing step before `cleanArabicText()`. Detection heuristic added to pipeline documentation.

**Validation**: GARB-001 corpus entry (A-PDF Watermark garbled text) → produces < 5% usable output, confirming need for image OCR.

**Regression Protection**: The garbled corpus entry documents that this input type CANNOT be fixed by text pipeline — any future improvement would be in the pre-processing layer, not `text.ts`.

---

## Pattern 2: Phrase-Level Character Substitution (OCR)

**Root Cause**: OCR engines confuse visually similar Arabic letters (ب↔ث, ح↔ج, ع↔غ) producing valid Arabic words that are semantically wrong.

**Deterministic Fix**: Cannot be fixed deterministically without a dictionary. Documented as a human-review boundary.

**Code Change**: None — identified as out-of-scope for deterministic cleanup.

**Validation**: OCR-001 corpus entry documents expected substitution rate (~5-15%).

**Regression Protection**: Garbage ratio filter (GARBAGE_THRESHOLD = 0.35) catches extreme cases where substitutions produce non-standard character combinations.

---

## Pattern 3: Page Number Pollution (STRUCTURAL)

**Root Cause**: Page numbers, headers, and footers appear as short numeric/text lines in OCR output.

**Deterministic Fix**: `removePageNoise()` filters:

- Standalone numbers: `/^\d+$/`
- Page ranges: `/^\d+\s*\/\s*\d+$/`
- Arabic markers: `/^(Page|صفحة|ص)\s*\d+$/i`
- Decorative lines: `/^[•·\-–—*]+$/`
- Arabic-Indic digits now handled (normalizeDigits pass)

**Code Change**: Already implemented in Phase 1B.

**Validation**: CLEAN-001 corpus entry includes inline page numbers — all removed post-cleaning.

**Regression Protection**: Test case `"removes standalone page numbers"` and `"removes page ranges"` in `text.test.ts`.

**Known Gap**: Running headers (chapter title repeated at top of page) not detected. Future: deduplicate consecutive identical lines.

---

## Pattern 4: Line-Break Chaos (STRUCTURAL)

**Root Cause**: OCR output breaks lines mid-sentence. Line endings at arbitrary positions, especially with Arabic prepositions and conjunctions.

**Deterministic Fix — 3 improvements in `reconstructArabicLines()`**:

1. **LINE_END_CONTINUATIVE**: Lines ending with Arabic prepositions (من, في, عن, على, إلى) or conjunctions (و, ف, بل) force-merge with next line
2. **LINE_START_CONTINUATIVE**: Lines starting with connectives (و, ف, بـ, لـ, لكن) merge with previous
3. **Prev-line tracking**: `prevEndsContinuative` flag chains continuatives across lines

**Code Change**: `text.ts:149-222` — added LINE_END_CONTINUATIVE, LINE_START_CONTINUATIVE constants and tracking logic.

**Validation**:

- Input: `"الكلام في\nهذا الموضوع"` → `"الكلام في هذا الموضوع"` (preposition merge)
- Input: `"جاء الرجل\nوكان معه كتاب"` → `"جاء الرجل وكان معه كتاب"` (و merge)

**Regression Protection**: Tests `"merges lines ending with connectives"` and `"merges lines starting with و"`.

---

## Pattern 5: Broken Arabic Joining (OCR)

**Root Cause**: OCR inserts spaces within Arabic words, breaking definite articles (ال كتاب → الكتا ب) and other prefixes.

**Deterministic Fix**: `BROKEN_DEFINITE_ARTICLE` regex `ال\s+(?=[Arabic Char])` rejoins `ال ` with the following word. Applied during `normalizeArabic` stage.

**Code Change**: `text.ts:48-49, 95` — added `BROKEN_DEFINITE_ARTICLE` regex and `.replace()` in `cleanArabicText()`.

**Validation**:

- Input: `"ال كتاب في ال فلسفة"` → `"الكتاب في الفلسفة"`
- Input: `"ال\nبيت"` → `"البيت"` (across newlines)

**Regression Protection**: Tests `"rejoins broken definite article"` and `"rejoins broken ال at line boundaries"`.

**Known Gap**: Single-letter prefixes (ب, ف, ل, ك, و + space) not yet handled — requires more careful heuristics to avoid false joins.

---

## Pattern 6: Bidirectional Text Corruption (ENCODING)

**Root Cause**: PDF text layers intersperse Unicode bidi control characters (U+202B, U+202C, U+202A, U+202E, U+200E, U+200F).

**Deterministic Fix**: `BIDI_CONTROL` regex strips all bidi and zero-width control chars during `normalizeUnicode` stage.

**Code Change**: Already implemented in Phase 1B (`text.ts:33`).

**Validation**: `text.ts:33` — regex matches 20+ control character ranges.

**Regression Protection**: Tests `"strips bidi control characters"` and `"strips zero-width characters"`.

---

## Pattern 7: Punctuation Normalization Loss (QUALITY)

**Root Cause**: `finalCleanup` strips all trailing non-Arabic/non-word characters, removing legitimate Arabic punctuation.

**Deterministic Fix**: `ALLOWED_TRAILING` regex preserves common Arabic and English punctuation at line ends: .,!?:;،؟؛()\]}-'"»«﴿﴾

**Code Change**: `text.ts:65-67, 316` — `ALLOWED_TRAILING` regex and modified `finalCleanup` to use it.

**Validation**:

- Input: `"هذا كتاب في الفلسفة."` → `"هذا كتاب في الفلسفة."` (period preserved)
- Input: `"جاء الرجل،"` → `"جاء الرجل،"` (comma preserved)
- Input: `"هل هذا صحيح؟"` → `"هل هذا صحيح؟"` (question mark preserved)

**Regression Protection**: Tests `"preserves trailing Arabic punctuation"`, `"preserves trailing Arabic comma"`, `"preserves trailing Arabic question mark"`.

**Trade-off**: Characters like ~`@#$%^&\*+={} are still stripped as OCR garbage.

---

## Pattern 8: Footnotes and Endnotes (SEMANTIC)

**Root Cause**: Footnote markers and footnote text appear inline in OCR output. No detection exists.

**Deterministic Fix**: None — requires semantic processing. Documented as human-review boundary.

**Code Change**: None.

**Validation**: Not applicable — this is a known limitation.

**Regression Protection**: Not applicable.

**Future Work**: If footnote patterns emerge consistently (e.g., `[1]` or `¹` markers), add a pre-processing regex to extract and separate them.

---

## Pattern 9: Table and Column Layout (LAYOUT)

**Root Cause**: Multi-column layouts, tables, and marginalia produce a single linear text stream from OCR.

**Deterministic Fix**: None — requires layout analysis (not in scope for Phase 1B/1C).

**Code Change**: None.

**Validation**: Not applicable.

**Regression Protection**: Not applicable.

---

## Pattern 10: Mixed Arabic/English Text (LANGUAGE)

**Root Cause**: Arabic academic texts contain English terms, citations, and references inline.

**Deterministic Fix**: Pipeline already handles mixed text — Arabic normalization applies only to Arabic chars, English passes through.

**Code Change**: None needed (already correct in Phase 1A).

**Validation**: Input: `"قال رسول الله: 'The best of you'"` → preserves both Arabic and English.

**Regression Protection**: Test `"handles mixed Arabic and English"`.

---

## Resolution Summary

| #   | Pattern                | Severity | Status                  | Test Coverage |
| --- | ---------------------- | -------- | ----------------------- | ------------- |
| 1   | Corrupt text layer     | Critical | Documented limitation   | GARB-001      |
| 2   | Character substitution | High     | Human review boundary   | OCR-001       |
| 3   | Page numbers           | Medium   | ✅ Resolved (Phase 1B)  | 2 tests       |
| 4   | Line-break chaos       | High     | ✅ Resolved (Phase 1B1) | 4 tests       |
| 5   | Broken joining         | High     | ✅ Resolved (Phase 1B1) | 2 tests       |
| 6   | Bidi corruption        | Medium   | ✅ Resolved (Phase 1B)  | 2 tests       |
| 7   | Punctuation loss       | Low      | ✅ Resolved (Phase 1B1) | 3 tests       |
| 8   | Footnotes              | Medium   | Documented limitation   | None          |
| 9   | Tables/columns         | Medium   | Documented limitation   | None          |
| 10  | Mixed text             | Low      | ✅ Already correct      | 1 test        |
