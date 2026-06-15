# Markdown Output Audit

## Methodology

Generated Markdown from three input types:

1. **Garbled PDF text** — corrupted text layer from actual Arabic book
2. **Simulated OCR** — clean Arabic text simulating Google Drive Export output
3. **Clean Arabic** — hand-written structured text with known headings

Output formats tested: Markdown, TXT, JSON.

---

## Quality Metrics

### Clean Arabic Input (optimal case)

| Metric                     | Value        |
| -------------------------- | ------------ |
| Heading detection accuracy | 4/4 (100%)   |
| False positive headings    | 0            |
| Missed headings            | 0            |
| Paragraph continuity       | Good         |
| Bullet list preservation   | ❌ Collapsed |
| Metadata block             | ✅ Correct   |

**Output**:

```markdown
# مقدمة في الفلسفة

## الفصل الاول

## مقدمة في الفلسفة

تعرف الفلسفة بانها محبة الحكمة. وهي كلمة يونانية الاصل مكونة من مقطعين...

## المبحث الاول: تعريف الفلسفة

للفلسفة تعريفات متعددة عبر التاريخ. فمنهم من عرفها بانها علم العلوم...

## المبحث الثاني: فروع الفلسفة

تنقسم الفلسفة الي عدة فروع رئيسية الميتافيزيقا (ما وراء الطبيعة الابستمولوجيا...
```

### Simulated OCR Input (expected real-world case)

| Metric                     | Value                                  |
| -------------------------- | -------------------------------------- |
| Heading detection accuracy | 10 (reasonable for this input)         |
| False positive headings    | ~3 (خطأ في تحديد بعض العناوين الفرعية) |
| Metadata accuracy          | ✅ Correct                             |
| TXT export                 | ✅ Clean                               |
| JSON export                | ✅ Structured                          |

### Garbled Text Input (worst case)

| Metric               | Value                                                  |
| -------------------- | ------------------------------------------------------ |
| Heading detection    | 4 (minimal — text is too corrupt for pattern matching) |
| Output usability     | ❌ None — garbage in, garbage out                      |
| Pipeline improvement | Structural cleaning only (bidi chars, artifacts)       |

---

## Structured Evaluation

### Heading Detection

| Pattern             | Correct?        | Notes                         |
| ------------------- | --------------- | ----------------------------- |
| `الفصل الأول`       | ✅              | Detected via keyword `الفصل`  |
| `المبحث الأول: ...` | ✅              | Detected via keyword `المبحث` |
| `مقدمة`             | ✅              | Detected via keyword `مقدمة`  |
| `أولاً:`            | ✅              | Detected via short keyword    |
| `تعريف الهوية`      | ⚠️ Not detected | No heading keyword, no number |
| `1. Introduction`   | ✅              | Detected as numbered          |

False positive: `تنقسم الفلسفة الي عدة فروع رئيسية` — ended with colon in original, short Arabic line. Fixed by removing the colon-triggered heading detection rule.

### Paragraph Structure

| Aspect                    | Quality | Issues                                                                      |
| ------------------------- | ------- | --------------------------------------------------------------------------- |
| Multi-sentence paragraphs | Good    | Sentences kept together when not separated by blank lines                   |
| Short standalone lines    | OK      | Lines under 40 chars kept separate (preserves headings, but also fragments) |
| Page number removal       | Good    | `removePageNoise` filters most numeric lines                                |
| Line-ending punctuation   | Fair    | Periods preserved but `"` and `) are stripped by `finalCleanup`             |

### Bullet List Detection

| Issue         | Details                                                                              |
| ------------- | ------------------------------------------------------------------------------------ |
| Detection     | `output.ts` detects `•` → converts to `- `                                           |
| Line breaks   | Bullet items are short → survive reconstruction → stay as separate lines in markdown |
| Collapsing    | Multiple consecutive short items can merge with adjacent paragraphs                  |
| Ordered lists | Numbered items (1., 2.) detected but not properly grouped                            |

Example issue — original:

```
• الميتافيزيقا
• الإبستمولوجيا
• الأكسيولوجيا
```

Pipeline output:

```
الميتافيزيقا (ما وراء الطبيعة الابستمولوجيا (نظرية المعرفة الاكسيولوجيا (علم القيم
```

Parenthetical content following each item causes line breaks to be ignored.

### Export Format Quality

#### Markdown

- **Metadata block**: Clean YAML frontmatter with stats
- **Heading prefix**: `## ` for all detected headings
- **Body text**: Single-line paragraphs (no wrapping)
- **Title**: `# ` prefix from `options.title`

#### TXT (`generateTxt`)

- **Metadata**: Clean horizontal-rule delimited header
- **Body**: `## ` stripped, `- ` → `• `, `**bold**` stripped
- **Quality**: Readable, no Markdown syntax leakage

#### JSON (`generateJson`)

- **Structure**: `{ source, generatedAt, metadata, content, markdown }`
- **Content**: Raw cleaned text
- **Markdown**: Full generated markdown
- **Quality**: Complete, well-structured

---

## Specific Weaknesses

### 1. Paragraph Merging

When consecutive short non-heading lines exist (e.g., items in a list), they are merged into one paragraph instead of remaining as separate items:

```markdown
تنقسم الفلسفة الي عدة فروع رئيسية الميتافيزيقا (ما وراء الطبيعة الابستمولوجيا (نظرية المعرفة الاكسيولوجيا (علم القيم المنطق الجماليات
```

Should be:

```markdown
تنقسم الفلسفة إلى عدة فروع رئيسية:

- الميتافيزيقا (ما وراء الطبيعة)
- الإبستمولوجيا (نظرية المعرفة)
- الأكسيولوجيا (علم القيم)
- المنطق
- الجماليات
```

### 2. Parenthetical Content Breaking

Parentheses in bullet items cause `output.ts` to miss the bullet marker. The line `• الميتافيزيقا (ما وراء الطبيعة)` contains `(` which might break detection.

**Root cause**: `output.ts` bullet detection regex: `/^[•·\-–—]\s/.test(trimmed)`. This should work for `• الميتافيزيقا (ما وراء الطبيعة)`. But if `finalCleanup` strips the `•`, the bullet detection never sees it.

**Fix needed**: Preserve bullet markers in `finalCleanup`.

### 3. Missing Heading Title Hierarchy

Only two levels exist:

- `# ` — document title (from `options.title`)
- `## ` — all detected headings

No `### ` or deeper nesting. All headings are level 2 regardless of actual hierarchy. Chapter titles (الفصل الأول) and subsections (المبحث الأول) are indistinguishable in output.

### 4. LaTeX/Equation Handling

No support for Arabic mathematical or scientific notation. OCR output of equations would pass through as raw text without formatting.

### 5. Footnote/Endnote Handling

No footnote detection. OCR footnotes would be embedded in body text at the position they appear on the page.

---

## Recommendations

### Priority 1: List Structure Preservation

Preserve bullet and numbered list structure by detecting consecutive list items and wrapping them in proper Markdown list syntax.

### Priority 2: Heading Hierarchy

Map heading patterns to appropriate Markdown levels:

- `الفصل`, `الباب` → `# ` or `## `
- `المبحث`, `المطلب` → `### `
- `المطلب`, `الفرع` → `#### `

### Priority 3: Trailing Punctuation

Preserve sentence-ending punctuation for paragraph-complete lines instead of stripping all trailing non-Arabic characters.

### Priority 4: Bullet Marker Protection

Prevent `finalCleanup` from stripping `•` and `-` markers from line starts.
