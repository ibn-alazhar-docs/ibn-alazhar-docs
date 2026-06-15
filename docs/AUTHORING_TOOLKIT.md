# Authoring Toolkit — أدوات التأليف

> **Phase:** 2A — Editorial + Authoring System  
> **Status:** Approved  
> **Last Updated:** 2026-05-24

---

## 1. Purpose

Make document creation fast, consistent, and scalable. This toolkit provides MDX templates, frontmatter starters, callout components, content composition rules, and automated scaffolds — all designed for the Ibn Al-Azhar Docs editorial system.

---

## 2. Quick Start

### Creating a New Document

```bash
# Interactive scaffold (recommended)
node scripts/generate-doc.mjs

# Or direct:
node scripts/generate-doc.mjs \
  --category introduction \
  --title-ar "عنوان المقال" \
  --title-en "Article Title" \
  --order 4
```

This creates:

```
content/ar/{category}/{slug}.mdx    ← Arabic version (template)
content/en/{category}/{slug}.mdx    ← English version (template)
```

### New Document Checklist

- [ ] Both AR and EN versions created
- [ ] Frontmatter complete (all required fields)
- [ ] `id` is unique across platform
- [ ] `slug` matches filename
- [ ] At least 3 substantive sections + summary
- [ ] All internal links validate
- [ ] Relationships are bidirectional
- [ ] `status` is set to `"draft"`

---

## 3. MDX Templates

### 3.1 Standard Document

```yaml
---
id: "doc-NNN"
title: "عنوان المستند"
subtitle: "وصف مختصر"
category: "category-slug"
readingTime: 5
date: "YYYY-MM-DD"
order: N
status: "draft"
related: ""
prerequisites: ""
continuation: ""
themes: "theme-a, theme-b"
author: "فريق التوثيق"
tags: ""
source: ""
language: "ar"
---

## المقدمة

[2-3 جمل تمهيدية تشرح موضوع المستند وأهميته.]

> اقتباس من مصدر موثوق يعزز الفكرة الرئيسية (اختياري).

## القسم الأول

[3-5 فقرات تغطي الموضوع الرئيسي.]

### القسم الفرعي الأول

[تفاصيل إضافية، أمثلة، أدلة.]

### القسم الفرعي الثاني

[تفاصيل إضافية.]

## القسم الثاني

[3-5 فقرات.]

<div class="callout callout-info">

**ملاحظة:** ملاحظة جانبية مهمة لا تتناسب مع النص الرئيسي.

</div>

## خلاصة

[فقرة تلخيصية تربط الأفكار الرئيسية وتقدم استنتاجًا.]
```

### 3.2 Reference Document

Use for external sources, citations, or static references.

```yaml
---
id: "ref-NNN"
title: "اسم المرجع"
subtitle: "وصف المرجع ومحتواه"
category: "references"
readingTime: 2
date: "YYYY-MM-DD"
order: N
status: "draft"
source: "اسم المصدر الأصلي"
language: "ar"
---

## نظرة عامة

[وصف المرجع وأهميته.]

## محتوى المرجع

[نص المرجع أو ملخصه.]

## المصادر

- [المصدر الأصلي]
- [روابط إضافية]
```

### 3.3 Guide Document

Use for how-to guides, walkthroughs, tutorials.

```yaml
---
id: "guide-NNN"
title: "دليل الاستخدام"
subtitle: "شرح خطوة بخطوة"
category: "category-slug"
readingTime: 8
date: "YYYY-MM-DD"
order: N
status: "draft"
prerequisites: "doc-NNN"
themes: "workflow"
language: "ar"
---

## المقدمة

[ما الذي سيتعلمه القارئ؟]

## المتطلبات

- [متطلب 1]
- [متطلب 2]

## الخطوة الأولى

[شرح الخطوة.]

## الخطوة الثانية

[شرح الخطوة.]

## الخطوة الثالثة

[شرح الخطوة.]

## الخلاصة

[ما الذي تعلمته؟ أين تذهب بعد ذلك؟]
```

---

## 4. Callout System

Callouts are semantic containers for non-prose content. They are implemented as HTML divs with CSS classes in the reading layout.

### 4.1 Available Callouts

| Type        | Class             | Color      | Purpose               | Example Usage          |
| ----------- | ----------------- | ---------- | --------------------- | ---------------------- |
| Information | `callout-info`    | Blue       | Context, side notes   | Background explanation |
| Warning     | `callout-warning` | Amber/Gold | Important cautions    | Limitations, caveats   |
| Success     | `callout-success` | Green      | Positive affirmations | Examples, applications |
| Error       | `callout-error`   | Red        | Critical alerts       | Misconceptions, errors |
| Quote       | `callout-quote`   | Gray       | Extended quotations   | Source citations       |

### 4.2 Usage

```mdx
<div class="callout callout-info">

**ملاحظة:** هذا ملاحظة جانبية مهمة.

</div>
```

### 4.3 Rules

- Callouts are used sparingly — no more than 2-3 per document
- Callouts supplement the main text, they do not replace it
- Every callout must have a bolded label (`**ملاحظة:**`, `**تنبيه:**`, etc.)
- Nested callouts are prohibited
- Callouts at the top of a document should be avoided (except important warnings)

---

## 5. Content Composition Rules

### 5.1 Section Structure

| Section       | Required | Position | Content                                      |
| ------------- | -------- | -------- | -------------------------------------------- |
| Introduction  | Yes      | First    | 2-3 paragraphs, defines scope and importance |
| Body sections | Yes      | Middle   | 3+ sections, each focused on one idea        |
| Summary       | Yes      | Last     | 1 paragraph, synthesis and conclusion        |

### 5.2 Paragraph Length

- Maximum: 6 sentences (≈ 150 words for AR, ≈ 120 words for EN)
- Ideal: 3-5 sentences
- Single-sentence paragraphs are allowed for emphasis, not as default

### 5.3 Lists

- Use bullet lists for unordered items
- Use numbered lists for sequential steps or rankings
- Maximum list length: 7 items
- No nested lists deeper than 2 levels
- Every list item must be substantive (no single-word items)

### 5.4 Tables

- Use for structured comparisons, specifications, or reference data
- Maximum: 6 columns, 15 rows
- Every table must have a header row
- Tables must be preceded by an introductory sentence

### 5.5 Code Blocks

- Use for taxonomy trees, structured examples, file paths
- Specify language when possible:
  ````
  ```yaml
  key: value
  ```
  ````
- Inline code (`\`code\``) for short references (file paths, IDs, slugs)

### 5.6 Blockquotes

- Use for significant quotations or emphasized principles
- Always attribute the source: `> "نص" — المصدر`
- Maximum: 1 per section
- Not a substitute for a paragraph

---

## 6. Cross-Reference System

### 6.1 Internal References

Reference another document by its ID:

```mdx
راجع [منصة ابن الأزهر دوكس](/ar/docs/introduction/doc-001-platform-overview) للمقدمة.
```

### 6.2 Relationship Fields

Set relationships in frontmatter:

```yaml
related: "doc-002, doc-003" # Bidirectional convention
prerequisites: "doc-001" # Must-read before this doc
continuation: "doc-003" # Next doc in linear series
```

---

## 7. Authoring Workflow

```
1. Identify need       → Create issue in GitHub
2. Draft AR version    → Use scaffold, write AR content first
3. Draft EN version    → Translate/extend from AR
4. Set status: draft   → Commit both files
5. Editorial review    → PR with reviewer
6. Set status: review  → Address feedback
7. Set status: published → Merge
8. Monitor             → Check analytics, update if needed
```

---

## 8. Validation

Before submitting any document:

```bash
# Validate all content
node scripts/validate-content.mjs

# Or validate a single document
node scripts/validate-content.mjs --file apps/web/content/ar/introduction/doc-001-platform-overview.mdx
```

The validator checks:

- Frontmatter completeness
- Required fields present
- Unique ID across platform
- Category exists
- All relationships resolve
- Date format valid
- Minimum section requirements
- Locale parity (both AR and EN exist)

---

## 9. Related Documents

- `docs/DOCUMENT_GOVERNANCE.md` — Standards and lifecycle
- `docs/EDITORIAL_STYLE_GUIDE.md` — Tone, formatting, citations
- `docs/MULTILINGUAL_WORKFLOW.md` — AR ↔ EN synchronization
- `scripts/generate-doc.mjs` — Document scaffold script
- `scripts/validate-content.mjs` — Content validation script
