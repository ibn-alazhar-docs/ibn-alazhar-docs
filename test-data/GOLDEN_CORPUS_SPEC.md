# Golden Corpus Specification

## Purpose

Permanent, versioned, reproducible test corpus for the Arabic document transformation pipeline. Every corpus entry tests a specific failure pattern or document type. All entries are CI-runnable.

---

## Corpus Structure

```
test-data/corpus/
├── categories.json          # Category index
├── clean/                   # Clean Arabic text (known correct)
│   ├── 001-philosophy.txt   # Heading-dense educational text
│   ├── 002-islamic.txt      # Quran/hadith text with سورة/الحديث headings
│   └── README.md
├── ocr/                     # Simulated realistic OCR output
│   ├── 001-book-extract.txt # Typical Google Drive OCR output
│   ├── 002-article.txt      # Short article with mixed Arabic/English
│   └── README.md
├── garbled/                 # Actual garbled PDF text layer output
│   ├── 001-watermark.txt    # A-PDF Watermark corruption
│   └── README.md
├── edge/                    # Edge cases and stress tests
│   ├── 001-empty.txt
│   ├── 002-symbols.txt
│   ├── 003-bidi-chars.txt
│   ├── 004-ocr-artifacts.txt
│   └── README.md
├── educational/             # Real Arabic educational PDFs (scanned)
│   ├── README.md
│   └── samples/             # Actual extracted text
└── schema.json              # Validation schema for corpus entries
```

## Corpus Entry Format

Each text file in the corpus includes a YAML header with metadata:

```yaml
---
id: "CLEAN-001"
category: "clean"
source: "Original Arabic composition"
description: "Philosophy textbook excerpt with headings, lists, and paragraphs"
headings_expected: 5
words_expected: 350
issues: ["Clean text — no OCR distortion"]
---
```

## Categories

| Category       | Purpose                                           | Source                    |
| -------------- | ------------------------------------------------- | ------------------------- |
| `clean/`       | Known-good Arabic text, no distortion             | Hand-written, verified    |
| `ocr/`         | Simulated OCR output with common errors           | Generated from clean text |
| `garbled/`     | Real corrupted PDF text layers                    | `pdftotext` of bad PDFs   |
| `edge/`        | Boundary and stress-test inputs                   | Synthetic                 |
| `educational/` | Real scanned Arabic educational PDF text extracts | `pdftotext` of real docs  |

## Test Requirements

Each corpus entry MUST test:

1. **Heading detection**: Does the pipeline detect all expected headings?
2. **Paragraph continuity**: Are broken lines properly reconstructed?
3. **Noise removal**: Are page numbers, decorations, garbage removed?
4. **Export quality**: Is the Markdown/TXT output usable?
5. **Regression**: Does this still pass when pipeline code changes?

## CI Integration

```yaml
# .github/workflows/test.yml
- name: Golden Corpus Validation
  run: pnpm test:corpus
```

The `test:corpus` script loads each corpus file, runs it through the pipeline, and asserts:

- `headings_detected >= expected_headings * 0.8` (at least 80% recall)
- `words_retained >= expected_words * 0.7` (at least 70% content preserved)
- `output_not_empty` for non-empty inputs
- `output_empty` for empty/symbol inputs

## Adding Entries

1. Create text file with YAML header in appropriate category
2. Run `pnpm test:corpus --add <file>` to validate entry
3. Commit with message: `corpus: add <category>/<id> - <description>`

## Versioning

Corpus version follows the pipeline version (`packages/pipeline/package.json`). Major version bump when entries are removed or re-categorized.

## Corpus Maintenance

- Entries are NEVER deleted — only deprecated (moved to `deprecated/`)
- New entries SHOULD be created for each new failure pattern discovered
- Entries MUST be reproducible (deterministic input, no randomness)

## Current Entries

| ID        | Category | Description                               | Headings | Words |
| --------- | -------- | ----------------------------------------- | -------- | ----- |
| CLEAN-001 | clean    | Philosophy text with chapter/section hdrs | 5        | 350   |
| OCR-001   | ocr      | Simulated Google Drive OCR with errors    | 8        | 2500  |
| OCR-002   | ocr      | Short article with mixed Arabic/English   | 2        | 150   |
| GARB-001  | garbled  | A-PDF Watermark corrupted text layer      | 0        | N/A   |
| EDGE-001  | edge     | Empty string                              | 0        | 0     |
| EDGE-002  | edge     | Symbols only                              | 0        | 0     |
| EDGE-003  | edge     | Bidi control characters                   | 0        | 0     |
| EDGE-004  | edge     | OCR exclamation mark artifacts            | 0        | 0     |
| EDGE-005  | edge     | Broken definite articles (ال + space)     | 0        | 0     |
