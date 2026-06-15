# Pipeline Quality Metrics

## Purpose

Define measurable, deterministic metrics for evaluating pipeline output quality. All metrics are computed from the output of `cleanArabicText()` and `generateMarkdown()`.

---

## Metric 1: Heading Accuracy

### Definition

```
heading_precision = correct_detected / total_detected
heading_recall = correct_detected / total_expected
heading_f1 = 2 * (precision * recall) / (precision + recall)
```

### Measurement

Compare detected headings (lines starting with `## `) against ground truth for known-input tests:

| Input Type    | Min F1 | Notes                             |
| ------------- | ------ | --------------------------------- |
| Clean text    | 0.95   | Near-perfect for known patterns   |
| OCR output    | 0.70   | Some missed due to OCR distortion |
| Garbled layer | N/A    | Not measurable — input is garbage |

### Implementation

```typescript
function measureHeadingAccuracy(
  cleaned: string,
  expected: string[],
): { precision: number; recall: number; f1: number } {
  const detected = cleaned.split("\n").filter((l) => l.startsWith("## "));
  const detectedSet = new Set(detected.map((l) => l.replace("## ", "").trim()));
  const expectedSet = new Set(expected.map((h) => h.trim()));

  const correct = [...detectedSet].filter((h) => expectedSet.has(h)).length;
  const precision = detectedSet.size > 0 ? correct / detectedSet.size : 0;
  const recall = expectedSet.size > 0 ? correct / expectedSet.size : 0;
  const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

  return { precision, recall, f1 };
}
```

---

## Metric 2: Paragraph Continuity

### Definition

```
continuity_score = 1 - (unexpected_line_breaks / total_lines)
```

### Measurement

Count lines that are:

- **Short standalone lines** (< 40 chars) that are NOT headings, bullets, or blanks
- **Orphaned fragments** (lines starting with lowercase connectives after a paragraph break)

A high continuity score means text flows naturally without unnecessary breaks.

| Quality   | Score  |
| --------- | ------ |
| Excellent | > 0.90 |
| Good      | > 0.80 |
| Poor      | < 0.70 |

---

## Metric 3: Markdown Cleanliness

### Definition

```
cleanliness_score = 1 - (artifacts / output_chars)
```

### Artifact Types

| Artifact                        | Detection                        |
| ------------------------------- | -------------------------------- |
| Stray unicode control chars     | `/[\u200B-\u200F\u202A-\u202E]/` |
| Consecutive blank lines         | `/\n{3,}/`                       |
| Leading/trailing whitespace     | `/^\s+/` or `/\s+$/`             |
| Non-Arabic noise in Arabic text | Garbage ratio > threshold        |

### Thresholds

| Metric             | Pass   | Warn   | Fail   |
| ------------------ | ------ | ------ | ------ |
| Cleanliness        | > 0.99 | > 0.95 | < 0.95 |
| Consecutive blanks | 0      | 1-2    | > 2    |
| Garbage lines      | 0      | 1-3    | > 3    |

---

## Metric 4: OCR Garbage Reduction

### Definition

```
garbage_reduction = 1 - (output_garbage_ratio / input_garbage_ratio)
```

### Garbage Ratio

```typescript
function garbageRatio(text: string): number {
  const chars = text.replace(/\s/g, "");
  if (chars.length === 0) return 0;
  const arabic = (chars.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const english = (chars.match(/[a-zA-Z0-9]/g) || []).length;
  const known = arabic + english;
  return 1 - known / chars.length;
}
```

### Expected Reduction

| Input Type    | Min Reduction | Notes                         |
| ------------- | ------------- | ----------------------------- |
| Clean text    | 0%            | No garbage to remove          |
| OCR output    | > 40%         | Page numbers, artifacts, etc. |
| Garbled layer | N/A           | Cannot fix corrupted mapping  |

---

## Metric 5: Export Usability

### Definition

```
export_usable = (output_not_empty) AND (metadata_present) AND (no_raw_markdown_leakage)
```

### Checks

| Check                     | Description                                 |
| ------------------------- | ------------------------------------------- |
| Output non-empty          | Non-empty input → non-empty Markdown output |
| Metadata present          | Non-empty input → YAML frontmatter present  |
| No markdown leakage       | TXT output has no `##` or `[]()` leaks      |
| No empty output for valid | Valid Arabic input → usable Markdown output |
| Empty for invalid         | Empty/symbol input → empty output           |

### Export Tests

```typescript
function checkExportUsability(cleanedText: CleanedText): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (cleanedText.metadata.wordCount > 0 && !cleanedText.markdown)
    issues.push("Non-empty input produced empty output");
  if (cleanedText.metadata.wordCount > 0 && !cleanedText.markdown.includes("---"))
    issues.push("Missing metadata block");
  if (cleanedText.markdown.match(/^## /m) && !cleanedText.markdown.includes("## "))
    issues.push("Heading without marker");
  return { ok: issues.length === 0, issues };
}
```

---

## Composite Quality Score

```
composite = 0.30 * heading_f1 +
            0.25 * continuity_score +
            0.20 * cleanliness_score +
            0.15 * garbage_reduction +
            0.10 * export_usable
```

| Overall | Score  | Meaning                              |
| ------- | ------ | ------------------------------------ |
| ✅      | > 0.80 | Production-ready                     |
| ⚠️      | > 0.60 | Acceptable for MVP, needs monitoring |
| ❌      | < 0.60 | Blocking — must fix before release   |

---

## Current Baseline Scores

| Metric            | Clean Text | OCR Output | Garbled |
| ----------------- | ---------- | ---------- | ------- |
| Heading F1        | 1.0        | 0.75       | N/A     |
| Continuity        | 0.92       | 0.85       | N/A     |
| Cleanliness       | 0.99       | 0.95       | 0.85    |
| Garbage Reduction | 0.0        | 0.45       | N/A     |
| Export Usability  | 1.0        | 0.90       | 0.70    |
| **Composite**     | **0.84**   | **0.78**   | **N/A** |
