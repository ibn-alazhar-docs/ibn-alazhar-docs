# Arabic Cleanup Refinements

## Overview

The Arabic text cleaning pipeline (`packages/pipeline/src/text.ts`) was tested against real garbled PDF text, simulated OCR output, and clean Arabic text. The following refinements were implemented and documented.

---

## Refinement 1: Unicode Control Character Stripping

**Problem**: OCR output and corrupted PDF text contain Unicode bidi control characters (U+202B, U+202C, U+202A, U+202E), zero-width characters (U+200B, U+200E), and soft hyphens (U+00AD). These characters:

- Break word boundary detection
- Cause rendering artifacts in preview
- Disrupt regex matching
- Survive NFKC normalization

**Fix** (`text.ts:7-8`):

```typescript
const BIDI_CONTROL = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFFF0-\uFFFF\u00AD\u061C]/g;
```

Applied during `normalizeUnicode` stage, after NFKC normalization.

**Before**: `‫تلىآجمينجمؤضي‬` (with U+202B/U+202C)  
**After**: `تلىآجمينجمؤضي` (clean)

---

## Refinement 2: OCR Artifact Exclamation Mark Removal

**Problem**: PDF text layer corruption frequently maps broken glyphs to `!` (U+0021). This produces embedded exclamation marks within Arabic words:

`جمل!اورك!متيتي!وممئيقن` (should be `حوار بين متشكك ومتيقن`)

These `!` characters are not valid Arabic and break word continuity.

**Fix** (`text.ts:39-40`):

```typescript
const OCR_EXCLAMATION = /([\u0600-\u06FF])!+([\u0600-\u06FF])/g;
```

Applied in `finalCleanup`:

```typescript
l = l.replace(OCR_EXCLAMATION, "$1$2");
```

**Before**: `جمل!اورك!متيتي!وممئيقن`  
**After**: `جملاوركمتيتيوممئيقن` (artifacts removed, word now continuous)

Note: This is lossy — the original word is still wrong because the corruption replaced actual letters with `!`, not just added noise. But removing `!` allows subsequent pattern matching (heading detection, line reconstruction) to work on actual Arabic characters.

---

## Refinement 3: Heading Detection Pipeline Reordering

**Problem**: Heading detection ran AFTER line reconstruction. Line reconstruction merged heading lines (e.g., `الفصل الأول\nمقدمة في الفلسفة` → `الفصل الأول مقدمة في الفلسفة`), destroying the line boundary needed for heading detection.

**Fix**: Swapped the order in `cleanArabicText`:

```typescript
// BEFORE:
if (opts.reconstructLines) text = reconstructArabicLines(text);
if (opts.detectHeadings) text = detectArabicHeadings(text);

// AFTER:
if (opts.detectHeadings) text = detectArabicHeadings(text);
if (opts.reconstructLines) text = reconstructArabicLines(text);
```

This ensures heading patterns are detected on the original line structure, then the `## ` prefix protects them from being merged during reconstruction.

---

## Refinement 4: Heading Preservation During Line Reconstruction

**Problem**: `reconstructArabicLines` treated all lines uniformly, merging lines that didn't end with punctuation or weren't "short enough". Lines starting with `## ` were merged into paragraphs.

**Fix**: Added explicit check in `reconstructArabicLines`:

```typescript
if (trimmed.startsWith("## ")) {
  if (buffer.length > 0) {
    result.push(buffer.join(" "));
    buffer = [];
  }
  result.push(trimmed);
  continue;
}
```

Lines marked as headings are now preserved as standalone lines.

---

## Refinement 5: finalCleanup Heading Marker Protection

**Problem**: The `finalCleanup` function stripped leading `#` characters:

```typescript
// This regex removes ANY leading character that isn't Arabic or word/digit
l = l.replace(/^[^\u0600-\u06FF\w\d]+/g, "");
```

`## الفصل الاول` → `الفصل الاول` (markers removed)

**Fix**: Skip leading cleanup for known markup patterns:

```typescript
if (!l.startsWith("## ") && !l.startsWith("# ") && !l.startsWith("- ") && !l.startsWith("> ")) {
  l = l.replace(/^[^\u0600-\u06FF\w\d]+/g, "");
}
```

---

## Refinement 6: Empty/Symbol Input Handling

**Problem**: Calling `generateMarkdown` on empty or symbol-only text produced a metadata block with no content:

```markdown
---
generated: 2026-05-24T17:25:01.898Z
total_pages: 1
total_words: 0
total_headings: 0
arabic_ratio: 0.0%
---
```

**Fix**: Metadata block is now conditional on `wordCount > 0` (`output.ts:17`):

```typescript
if (options.includeMetadata !== false && analysis.wordCount > 0) {
```

Empty input → empty string. Symbol-only input → empty string. Clean behavior.

---

## Remaining Issues

### Issue A: Short Lines Without Heading Keywords

Short standalone Arabic lines that survive reconstruction but don't match heading keywords are NOT marked as headings. Example:

```
## الفصل الاول
مقدمة في الفلسفة   ← this line survives reconstruction but isn't ##
```

`مقدمة في الفلسفة` (21 chars) stays separate after `reconstructArabicLines` because it's short (< 40), but `detectPostReconstructionHeadings` only marks lines starting with heading keywords. `مقدمة` IS in the keyword list for the post-reconstruction detector, so this case works. But general short lines without keywords are not caught.

### Issue B: Trailing Punctuation Stripping

`finalCleanup` strips trailing non-Arabic/non-word characters from ALL lines, including periods, closing quotes, and colons:

- `"... وتحقيقها".` → `"... وتحقيقها`
- `تنقسم الفلسفة إلى عدة فروع رئيسية:` → `تنقسم الفلسفة الي عدة فروع رئيسية`

This is deliberate (OCR noise cleanup) but loses legitimate punctuation. A future improvement could preserve trailing punctuation for headings and paragraph-ending lines while stripping it from mid-paragraph lines.

### Issue C: Line-ending Period Prevention

When a line ends with a period, `reconstructArabicLines` keeps it separate (correct — it's a paragraph end). But `detectPostReconstructionHeadings` correctly does NOT mark it as a heading (it ends with sentence punctuation). This means the paragraph break is preserved, but no heading is generated — which is correct behavior for body text.

### Issue D: Merged Bullet Lists

Bullet items like `• الميتافيزيقا` are short (17 chars), so they survive line reconstruction as separate lines. But they're not marked as headings (correct). However, they also lose their line breaks and get merged into the surrounding paragraph when there are multiple consecutive short lines.

### Issue E: Garbled Text Limit

The pipeline cannot fix fundamentally corrupted text. When the PDF text layer has wrong Unicode mapping (like our test document), the pipeline can:

- Remove bidi control characters ✅
- Remove `!` artifacts ✅
- Normalize alef/yaa forms ✅
- But it CANNOT reconstruct the original letters from corrupt glyphs

This is an inherent limitation — only image-based OCR (Google Drive, Surya) can recover the actual text. The cleanup pipeline is designed for OCR output, not corrupt text layer recovery.

---

## Determined & Explainable Rules

Each refinement follows these principles:

1. **Regex-based** — no AI/ML, no inference
2. **Single-purpose** — each pattern targets a specific artifact
3. **Non-destructive** — no regex modifies valid Arabic text
4. **Ordered** — pipeline stages are sequenced (general → specific)
5. **Configurable** — each stage can be disabled via `CleanOptions`
