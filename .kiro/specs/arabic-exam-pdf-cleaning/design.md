# Bugfix Design Document

## Overview

This design implements automatic document-type detection and selective text-cleaning strategies to preserve exam structure while maintaining aggressive cleaning for general documents. The solution comprises three main components: (1) pattern-based exam detection, (2) specialized cleaning presets, and (3) enhanced OCR prompts with English instructions for better Gemini model understanding.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         OCR Pipeline                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────────┐                    │
│  │  PDF Input   │─────▶│  Gemini OCR      │                    │
│  └──────────────┘      │  (Enhanced)      │                    │
│                        │  - English prompt│                    │
│                        │  - Exam support  │                    │
│                        │  - Table support │                    │
│                        └────────┬─────────┘                    │
│                                 │                               │
│                                 ▼                               │
│                        ┌────────────────────┐                  │
│                        │ detectDocumentType │                  │
│                        │  (analyze.ts)      │                  │
│                        │  - Pattern match   │                  │
│                        │  - Score heuristic │                  │
│                        └────────┬───────────┘                  │
│                                 │                               │
│                    ┌────────────┴────────────┐                 │
│                    │                         │                 │
│              exam  ▼                         ▼  general        │
│          ┌──────────────────┐     ┌──────────────────┐        │
│          │  EXAM_OPTIONS    │     │ DEFAULT_OPTIONS  │        │
│          │  (constants.ts)  │     │  (constants.ts)  │        │
│          │  - Keep Latin    │     │  - Strip noise   │        │
│          │  - No line merge │     │  - Merge lines   │        │
│          │  - Keep symbols  │     │  - Remove junk   │        │
│          │  - No headings   │     │  - Auto headings │        │
│          └────────┬─────────┘     └────────┬─────────┘        │
│                   │                        │                   │
│                   └────────────┬───────────┘                   │
│                                ▼                               │
│                       ┌─────────────────┐                      │
│                       │ cleanArabicText │                      │
│                       │   (clean.ts)    │                      │
│                       │  Auto-detection │                      │
│                       └────────┬────────┘                      │
│                                ▼                               │
│                         ┌──────────────┐                       │
│                         │ Clean Output │                       │
│                         └──────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Document Type Detection (`packages/pipeline/src/text/analyze.ts`)

**Function:** `detectDocumentType(text: string): DocumentType`

**Algorithm:**
```typescript
// Sample first 3000 chars (fast, representative)
// Score based on pattern matches:
// - س\s*\d+ (question markers): +3 per match, +3 if ≥3 occurrences
// - ج\s*[:：] (answer markers): +2
// - [\(\[][أ-ي][\)\]] (choice markers): +2
// - Fill-in patterns (..., […]): +1
// - MCQ patterns: +2
// Return "exam" if score ≥ 4, else "general"
```

**Patterns Used:**
- `EXAM_QUESTION_PATTERN`: `/^(س\s*\d+|سؤال\s*\d*|س\s*[:：]|\(\d+\)\s*[:：]?)/m`
- `EXAM_ANSWER_PATTERN`: `/^(ج\s*[:：]|جواب\s*[:：]|الإجابة\s*[:：]|الجواب\s*[:：])/m`
- `EXAM_CHOICE_PATTERN`: `/^\s*[\(\[]\s*[أابجدهوزحطيكلمنسعفصقرشت١٢٣٤٥٦٧٨٩0-9]\s*[\)\]]/m`
- `EXAM_FILL_PATTERN`: `/\.{3,}|…{2,}|\[\.+\]|\(\s*\.\.\.\s*\)/m`
- `EXAM_MCQ_PATTERN`: `/\([١٢٣٤-]\)|[\(\[][أ-ي][\)\]]/m`

**Performance:** O(n) single-pass scan over 3000-char sample (~1ms for typical PDFs)

### 2. Cleaning Options Presets (`packages/pipeline/src/text/constants.ts`)

#### `DEFAULT_OPTIONS` (General Documents)
```typescript
{
  normalizeUnicode: true,
  normalizeArabic: true,
  removeTashkeel: false,
  removeTatweel: true,
  normalizeDigits: false,
  normalizeWhitespace: true,
  removeBrokenHtml: true,
  removeAsciiNoise: true,        // ← Strips Latin noise
  removeRepeatedTokens: true,
  removeGarbageSymbols: true,    // ← Removes symbol-heavy lines
  normalizePunctuation: true,
  removeIsolatedFragments: true,
  collapseRepeatedWords: true,
  reconstructLines: true,         // ← Merges short lines
  detectHeadings: true,           // ← Auto markdown headers
  removePageNoise: true,
  collapseRepeatedParagraphs: true,
  finalCleanup: true              // ← Symbol ratio filter
}
```

#### `EXAM_OPTIONS` (Exam Documents)
```typescript
{
  normalizeUnicode: true,
  normalizeArabic: true,
  removeTashkeel: false,
  removeTatweel: true,
  normalizeDigits: false,
  normalizeWhitespace: true,
  removeBrokenHtml: true,
  removeAsciiNoise: false,        // ✓ Keep س١, س5
  removeRepeatedTokens: true,
  removeGarbageSymbols: false,    // ✓ Keep (أ), (ب), (ج)
  normalizePunctuation: true,
  removeIsolatedFragments: false, // ✓ Keep short answer stubs
  collapseRepeatedWords: true,
  reconstructLines: false,         // ✓ No line merging
  detectHeadings: false,           // ✓ Keep س١: as-is
  removePageNoise: true,
  collapseRepeatedParagraphs: true,
  finalCleanup: false              // ✓ Looser symbol filter
}
```

### 3. Auto-Detection in cleanArabicText (`packages/pipeline/src/text/clean.ts`)

**Modified Logic:**
```typescript
export function cleanArabicText(raw: string, options?: CleanOptions): string {
  let text = raw;
  
  // Auto-detect if no options or using DEFAULT_OPTIONS
  const shouldAutoDetect = !options || 
    JSON.stringify(options) === JSON.stringify(DEFAULT_OPTIONS);
  
  let opts: CleanOptions;
  
  if (shouldAutoDetect) {
    const docType = detectDocumentType(raw);
    opts = docType === "exam" 
      ? { ...EXAM_OPTIONS, ...options } 
      : { ...DEFAULT_OPTIONS, ...options };
  } else {
    opts = { ...DEFAULT_OPTIONS, ...options };
  }
  
  // Continue with existing cleaning pipeline using opts...
}
```

**Behavior:**
- If `options` parameter is `undefined` → auto-detect
- If `options === DEFAULT_OPTIONS` → auto-detect
- If custom `options` provided → use as-is (explicit override)
- Merging: `{ ...PRESET, ...options }` allows partial override

### 4. Enhanced Gemini Prompts (`packages/pipeline/src/ocr-providers/gemini.ts`)

**CRITICAL CHANGE: Using English prompts instead of Arabic for better Gemini model understanding**

#### Single-Page Prompt (English)
```
You are an expert Arabic OCR (Optical Character Recognition) and document layout analysis system.

**Your Primary Task:**
Extract all text exactly as it appears in the original document without adding, removing, or interpreting anything.

**Critical Rules (must follow strictly):**
1. **Diacritics:** Preserve all tashkeel marks (fatha, damma, kasra, sukun, tanween, shadda) exactly as they are — do not remove, add, or infer them.
2. **Punctuation:** Preserve all punctuation marks precisely: ، . ؛ : ؟ ! " " ( ) [ ] { } - – — / \\ * # @ & % $ and others.
3. **Numbers and Letters:** Preserve Arabic numerals (١٢٣), Hindu numerals (123), and Latin letters (a, b, c, س١, س5) as they are.
4. **Direction:** Maintain right-to-left (RTL) text direction and page order.
5. **Layout:** Preserve the original structure:
   - Main and sub headings
   - Paragraphs and separate lines
   - Bulleted and numbered lists
   - Tables (in Markdown format)
   - Questions and answers (each question on a separate line)
   - Multiple-choice alternatives (each alternative on a separate line)
   - Any other special formatting

**Special Instructions:**
- **For Questions and Exams:** Preserve question formatting (س١:, س5:, سؤال ١:, etc.) and answer alternatives [(أ), (ب), (ج), (د)] on separate lines.
- **For Tables:** Use correct Markdown format with column alignment.
- **For Footnotes:** Extract footnotes precisely with reference numbers, place them below page text separated by "---".
- **For Multiple Columns:** Read right to left, column by column, then top to bottom.

**What NOT to do:**
❌ Do not add introductory text, comments, or notes
❌ Do not interpret, summarize, or rephrase
❌ Do not correct spelling or grammatical errors in the original text
❌ Do not remove parts that seem "unimportant"
✅ Only extract the text exactly as it is

**Required Output:**
Precise raw text in simple Markdown format (headings start with #, lists with -, tables with |).
```

#### Batch-Page Prompt (English)
- Same as single-page with additional instruction:
- `"===PAGE_BREAK==="` separator between pages
- Handles up to 10 pages per batch

**Key Improvements:**
1. **English instructions** for better Gemini model comprehension
2. Explicit exam formatting preservation
3. Separate-line instruction for answer choices
4. Table structure guidance (Markdown)
5. Multi-column reading order (RTL)
6. No interpretation/correction rules

### 5. Configuration & Environment

**Required `.env` Variables:**
```bash
# Primary provider
OCR_PROVIDER=gemini

# Fallback chain
OCR_PROVIDERS=gemini,surya,tesseract

# Enable cloud
OCR_CLOUD_ENABLED=true

# Gemini API Key (REQUIRED - get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_actual_api_key_here

# Model (recommended: gemini-1.5-flash for speed/cost)
GEMINI_MODEL=gemini-1.5-flash

# Retries and confidence
OCR_MAX_RETRIES=3
OCR_MIN_CONFIDENCE=0.0

# Image quality
OCR_DPI=300
OCR_PREPROCESS_MODE=auto
OCR_TARGET_DPI=400
```

**Configuration Loading (`packages/pipeline/src/config.ts`):**
```typescript
gemini: {
  apiKey: process.env.GEMINI_API_KEY ?? "",
  model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
}
```

## Data Flow

### Exam Document Processing

```
1. User uploads exam PDF
2. PDF → Image pages (300 DPI rasterization)
3. Images → Gemini OCR with enhanced English exam-aware prompt
4. Gemini returns raw text with preserved structure
5. detectDocumentType(rawText) → "exam"
6. cleanArabicText(rawText) → auto-selects EXAM_OPTIONS
7. Cleaning pipeline runs with:
   - removeAsciiNoise: DISABLED
   - reconstructLines: DISABLED
   - detectHeadings: DISABLED
   - finalCleanup: DISABLED
8. Output preserves question numbers, choices, formatting
9. Export to Markdown/TXT/JSON/DOCX/PDF with structure intact
```

### General Document Processing

```
1. User uploads general PDF (article, book chapter)
2. PDF → Image pages
3. Images → Gemini OCR with English standard prompt
4. Gemini returns raw text
5. detectDocumentType(rawText) → "general"
6. cleanArabicText(rawText) → auto-selects DEFAULT_OPTIONS
7. Cleaning pipeline runs with:
   - removeAsciiNoise: ENABLED (strips Latin noise)
   - reconstructLines: ENABLED (merges paragraphs)
   - detectHeadings: ENABLED (markdown headers)
   - finalCleanup: ENABLED (removes garbage)
8. Output is cleaned, readable, structured
9. Export with improved formatting
```

## Testing Strategy

### Unit Tests

**File:** `packages/pipeline/src/text/analyze.test.ts`

```typescript
describe("detectDocumentType", () => {
  it("detects exam with س\\d+ pattern", () => {
    const text = "س١: ما هو؟\\nس٢: كيف؟";
    expect(detectDocumentType(text)).toBe("exam");
  });

  it("detects exam with answer choices", () => {
    const text = "(أ) الخيار الأول\\n(ب) الخيار الثاني";
    expect(detectDocumentType(text)).toBe("exam");
  });

  it("detects general document", () => {
    const text = "مقدمة\\n\\nهذا نص عادي بدون أسئلة";
    expect(detectDocumentType(text)).toBe("general");
  });

  it("requires score ≥4 for exam classification", () => {
    const text = "املأ الفراغ: ...";
    expect(detectDocumentType(text)).toBe("general");
  });
});
```

**File:** `packages/pipeline/src/text/clean.test.ts`

```typescript
describe("cleanArabicText with auto-detection", () => {
  it("preserves exam question markers", () => {
    const input = "س١: السؤال الأول\\nس5: السؤال الخامس";
    const output = cleanArabicText(input);
    expect(output).toContain("س١:");
    expect(output).toContain("س5:");
  });

  it("preserves answer choice symbols", () => {
    const input = "(أ) الخيار الأول\\n(ب) الخيار الثاني";
    const output = cleanArabicText(input);
    expect(output).toContain("(أ)");
    expect(output).toContain("(ب)");
  });

  it("does not merge exam lines", () => {
    const input = "س١: سؤال قصير\\n(أ) جواب\\n(ب) جواب آخر";
    const output = cleanArabicText(input);
    const lines = output.split("\\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it("applies aggressive cleaning to general docs", () => {
    const input = "نص عادي\\nمع كلمات a b c منفردة\\nوسطور قصيرة";
    const output = cleanArabicText(input);
    expect(output).not.toContain(" a ");
    expect(output).not.toContain(" b ");
  });
});
```

### Integration Tests

**File:** `tests/integration/ocr-exam.test.ts`

```typescript
describe("Exam OCR end-to-end", () => {
  it("extracts exam PDF with preserved structure", async () => {
    const pdfPath = "tests/fixtures/arabic-exam-sample.pdf";
    const result = await processDocument(pdfPath);
    
    expect(result.text).toContain("س١:");
    expect(result.text).toContain("(أ)");
    expect(result.text).toContain("(ب)");
    
    const lines = result.text.split("\\n");
    const questionLines = lines.filter(l => /س\\d+:/.test(l));
    expect(questionLines.length).toBeGreaterThan(0);
  });
});
```

## Rollout Plan

### Phase 1: Core Implementation (✅ Already Completed)
- ✅ Add `detectDocumentType()` in `analyze.ts`
- ✅ Add `EXAM_OPTIONS` in `constants.ts`
- ✅ Modify `cleanArabicText()` with auto-detection
- ✅ Enhance Gemini prompts with English instructions
- ✅ Update `.env` configuration

### Phase 2: Testing & Validation (Current Phase)
- [ ] Export constants from `packages/pipeline/src/text/index.ts`
- [ ] Add unit tests for `detectDocumentType()`
- [ ] Add unit tests for EXAM_OPTIONS cleaning
- [ ] Add integration tests with sample exam PDF
- [ ] Validate all output formats (MD, TXT, JSON, DOCX, PDF)
- [ ] Set actual GEMINI_API_KEY in `.env`

### Phase 3: Production Deployment
- [ ] Update `.env.production.example` with Gemini setup
- [ ] Monitor document type detection accuracy
- [ ] Track OCR quality metrics (confidence scores)
- [ ] Gather user feedback on exam extraction quality

### Phase 4: Enhancements (Future)
- [ ] Add UI toggle for manual document type override
- [ ] Implement document type caching
- [ ] Add telemetry for pattern match scores
- [ ] Support additional exam formats (true/false, matching)
- [ ] Extend to other structured documents (forms, tables)

## Risk Mitigation

### False Positives (General Doc Classified as Exam)
**Risk:** Narrative text with numbered lists triggers exam detection  
**Mitigation:** Score threshold (≥4) requires multiple strong signals  
**Fallback:** Users can re-process with explicit `DEFAULT_OPTIONS`

### False Negatives (Exam Classified as General)
**Risk:** Exam with non-standard formatting misses patterns  
**Mitigation:** Multiple pattern types (س, سؤال, (أ), MCQ)  
**Fallback:** Users can re-process with explicit `EXAM_OPTIONS`

### Gemini API Key Missing
**Risk:** Pipeline fails if `GEMINI_API_KEY` not set  
**Mitigation:** Fallback to Surya/Tesseract in `OCR_PROVIDERS` chain  
**Monitoring:** Log warning if primary provider unavailable

### Regression in General Documents
**Risk:** Auto-detection breaks existing document processing  
**Mitigation:** Extensive regression tests for general documents  
**Rollback:** Conditional feature flag if needed

## Performance Considerations

- **Detection Overhead:** ~1ms per document (3000-char scan)
- **Memory:** No additional memory footprint
- **Latency:** No change to OCR pipeline speed
- **Accuracy:** 95%+ expected based on pattern diversity

## Dependencies

- `@google/generative-ai`: Gemini SDK (already installed)
- No new external dependencies required
- TypeScript 5.x, Node 22

## Documentation

- ✅ `docs/OCR_CONFIGURATION.md`: Comprehensive guide
- ✅ `docs/CHANGELOG_OCR_FIXES.md`: Implementation log
- ✅ `.env.example`: Configuration examples
- [ ] Update production deployment docs with Gemini setup
