# Pipeline Failure Patterns

## Introduction

This document catalogues failure patterns discovered during Phase 1B validation. Each pattern is categorized by severity, frequency, and whether it can be mitigated.

---

## Pattern 1: Corrupt PDF Text Layer (FUNDAMENTAL)

**Severity**: Critical  
**Frequency**: Common in Arabic PDFs  
**Mitigatable**: ❌ No — requires image-based OCR

### Description

Many Arabic PDFs (especially older ones from 2010-2018) have corrupted text layers. The glyphs are correctly rendered on screen but mapped to wrong Unicode codepoints. This is caused by PDF generators that embed custom font encodings (e.g., A-PDF Watermark, early Adobe Arabic, certain scanning tools).

### Detection

- `pdftotext` output has < 30% readable Arabic
- Tesseract Arabic OCR also fails on these documents
- Arabic character ratio may still be high (characters are Arabic, just wrong ones)

### Impact

The entire pipeline produces garbage output. Heading detection, cleaning, and Markdown generation all operate on fundamentally wrong input.

### Mitigation

1. **Pre-scan**: Detect corrupt text layer by comparing character distribution against known Arabic letter frequencies
2. **Route to OCR**: Automatically route corrupt-PDF text extraction through Google Drive API instead of pdftotext
3. **Confidence threshold**: If post-cleaning Arabic ratio < 60% with high ambiguity, flag for human review

---

## Pattern 2: Phrase-Level Character Substitution (OCR)

**Severity**: High  
**Frequency**: Very common in Arabic OCR  
**Mitigatable**: ⚠️ Partial — pattern-specific replacements

### Description

OCR engines (including Google Drive API) consistently confuse certain Arabic letters:

| Expected         | Common Substitution | Context         |
| ---------------- | ------------------- | --------------- |
| بـ (initial ba)  | ثـ                  | Word-initial    |
| تـ (initial ta)  | ثـ                  | Word-initial    |
| ـلـ (medial lam) | ا                   | Medial position |
| ـن (final noon)  | ب                   | Final position  |
| ح (ha)           | ج (jeem)            | Any position    |
| ع (ayn)          | غ (ghayn)           | Any position    |

### Impact

Produces real Arabic words that are wrong. These pass all pipeline cleaning stages (they're valid Arabic letters) and produce grammatically incorrect output that looks plausible to automated checks.

### Mitigation

1. **Dictionary-based validation**: Compare against Arabic word frequency lists
2. **Contextual correction**: Use bigram/trigram probability (e.g., word-initial ب vs ث has different expected neighbors)
3. **Human review**: Flag low-confidence ambiguous words for manual correction

---

## Pattern 3: Page Number Pollution (STRUCTURAL)

**Severity**: Medium  
**Frequency**: High (every document)  
**Mitigatable**: ✅ Yes — current `removePageNoise` handles most cases

### Description

Page numbers, headers, and footers appear in OCR output as short numeric or text lines interspersed with body text.

### Current Handling

`removePageNoise` filters lines matching:

- Standalone numbers: `/^\d+$/`
- Page ranges: `/^\d+\s*\/\s*\d+$/`
- Arabic markers: `/^(Page|صفحة|ص)\s*\d+$/i`
- Decorative lines: `/^[•·\-–—*]+$/`
- Short capital-letter lines

### Known Gaps

- Page numbers with surrounding dashes: `- 3 -` (handle by pattern)
- "Continued" markers: `يتبع` at line end
- Running headers (e.g., chapter title repeated at top of each page)
- Page numbers in Arabic-Indic digits: `٣` not detected (format-specific)
- Folio numbers in book margins

---

## Pattern 4: Line-Break Chaos (STRUCTURAL)

**Severity**: High  
**Frequency**: Very high  
**Mitigatable**: ⚠️ Partial

### Description

OCR output frequently breaks lines in the middle of sentences, between closely related clauses, or at arbitrary page positions. The `reconstructArabicLines` function attempts to rejoin broken lines, but:

- Short words at line end are correct (word boundaries)
- Short words alone on a line could be either continuation or heading
- Line-ending prepositions (من, في, عن, على, إلى) suggest continuation
- Line-ending conjunctions (و, فـ, بـ, لـ) suggest continuation

### Current Handling

Lines are merged unless:

- They end with sentence-ending punctuation (., ?, !, ؟, ۔)
- They are very short (< 40 chars) — kept as potential headings

### Gaps

- Line ending with comma or semicolon should also trigger continuation
- Line starting with lowercase Arabic (or connective) should trigger merge
- Right-justified short lines often indicate headings (but detection is hard without layout info)

---

## Pattern 5: Broken Arabic Joining (OCR)

**Severity**: High  
**Frequency**: Medium (depends on OCR quality)  
**Mitigatable**: ⚠️ Partial

### Description

OCR engines sometimes insert spaces within Arabic words, breaking the cursive connection:

```
ال كتاب → ال كتاب (مسافة داخل الكلمة)
```

This is particularly common with:

- Lam-alef ligature (لا)
- Words with medial alef (التأليف → الت اليف)
- Compound words with prefixes (بالكتاب → ب الكتاب)

### Current Handling

Line reconstruction merges broken fragments if they're on consecutive short lines. But intra-word spaces on the SAME line are not corrected.

---

## Pattern 6: Bidirectional Text Corruption (ENCODING)

**Severity**: Medium  
**Frequency**: Medium (deprecated PDF generators)  
**Mitigatable**: ✅ Yes — bidi control char removal now implemented

### Description

PDF text layers sometimes intersperse Unicode bidi control characters (U+202B, U+202C, U+202A, U+202E, U+200E, U+200F) to handle right-to-left rendering. When extracted as plain text, these characters remain and corrupt text flow.

### Current Handling

Fixed in Phase 1B — bidi control chars are now stripped during `normalizeUnicode`.

---

## Pattern 7: Punctuation Normalization Loss (QUALITY)

**Severity**: Low  
**Frequency**: Always  
**Mitigatable**: ⚠️ Design trade-off

### Description

The `finalCleanup` function strips trailing non-Arabic/non-word characters from all lines. This removes OCR artifacts (stray dots, dashes) but also removes legitimate punctuation.

### Trade-off

- Current approach: aggressive stripping → cleaner visual output, lost punctuation
- Alternative: conservative stripping → preserved punctuation, more OCR noise
- Decision: aggressive is correct for MVP, punctuation handling can be refined later

---

## Pattern 8: Footnotes and Endnotes (SEMANTIC)

**Severity**: Medium  
**Frequency**: Common in academic books  
**Mitigatable**: ❌ No — not detected

### Description

Footnote markers (numbers, asterisks) and footnote text appear inline in OCR output, interspersed with body text. No detection or extraction exists.

### Example

From the test document (page 1 metadata):

```
الإيداع القانوني
رقم الإيداع: 213/4
القياس: 17 × 24 سم
```

This appears as regular text in OCR output. The pipeline cannot distinguish it from body text.

---

## Pattern 9: Table and Column Layout (LAYOUT)

**Severity**: Medium  
**Frequency**: Common  
**Mitigatable**: ❌ No — not addressed

### Description

Multi-column layouts, tables, sidebars, and marginalia are not detected. OCR text flows in reading order (right-to-left for Arabic) and produces a single linear stream.

### Impact

Tabular data is corrupted, column boundaries lost, marginal notes appear mid-paragraph.

---

## Pattern 10: Mixed Arabic/English Text (LANGUAGE)

**Severity**: Low  
**Frequency**: Common in academic Arabic texts  
**Mitigatable**: ✅ Yes — pipeline handles mixed text

### Description

Arabic books often contain English terms, citations, or references inline. The pipeline:

- Preserves non-Arabic characters (doesn't strip them)
- Normalizes only Arabic letters
- Keeps English words intact

Current handling is passive but correct — English text passes through unmodified.

---

## Summary

| Pattern                   | Severity | Mitigatable | Fix Status           |
| ------------------------- | -------- | ----------- | -------------------- |
| 1. Corrupt text layer     | Critical | ❌          | Needs pre-scan       |
| 2. Character substitution | High     | ⚠️          | Needs dictionary     |
| 3. Page numbers           | Medium   | ✅          | Mostly handled       |
| 4. Line-break chaos       | High     | ⚠️          | Partially handled    |
| 5. Broken joining         | High     | ⚠️          | Needs intra-word fix |
| 6. Bidi corruption        | Medium   | ✅          | Fixed in Phase 1B    |
| 7. Punctuation loss       | Low      | ⚠️          | Trade-off accepted   |
| 8. Footnotes              | Medium   | ❌          | Future work          |
| 9. Tables/columns         | Medium   | ❌          | Future work          |
| 10. Mixed text            | Low      | ✅          | Already works        |
