# Authoring Workflow — سير عمل التأليف

> **Phase:** 1C  
> **Type:** Developer / Author Guide  
> **Last Updated:** 2026-05-24

---

## 1. Creating a New Document

### Step 1: Choose a Category

Categories are directories under `content/{locale}/`. Existing categories:

| Directory      | Arabic        | English                | When to Use                    |
| -------------- | ------------- | ---------------------- | ------------------------------ |
| `introduction` | مقدمة         | Introduction           | Platform overview, methodology |
| `organization` | تنظيم المعرفة | Knowledge Organization | Classification, taxonomy       |

To create a new category:

```bash
mkdir -p content/ar/my-category
mkdir -p content/en/my-category
```

Then add the label in `src/lib/content.ts`:

```typescript
const labels: Record<string, Record<string, string>> = {
  "my-category": {
    ar: "تصنيفي الجديد",
    en: "My New Category",
  },
  // ... existing labels
};
```

### Step 2: Create the MDX File

```
content/{locale}/{category}/{slug}.mdx
```

Slug convention: `{prefix}-{number}-{kebab-case-title}`

Example:

```
content/ar/introduction/doc-004-new-topic.mdx
content/en/introduction/doc-004-new-topic.mdx
```

### Step 3: Write Frontmatter

```yaml
---
id: "doc-004"
title: "العنوان"
subtitle: "وصف مختصر"
category: "introduction"
readingTime: 5
date: "2026-05-24"
order: 4
---
```

### Step 4: Write Content

Use standard Markdown with MDX extensions.

### Step 5: Create the English Version (Required)

Every document must have both Arabic and English versions with identical slugs.

---

## 2. MDX Authoring Guide

### Available Elements

| Element         | Markdown             | Notes                               |
| --------------- | -------------------- | ----------------------------------- |
| Heading 2       | `## Title`           | Auto-linked with `#` anchor         |
| Heading 3       | `### Title`          | Auto-linked, shown in TOC           |
| Heading 4       | `#### Title`         | Auto-linked                         |
| Bold            | `**text**`           |                                     |
| Italic          | `*text*`             |                                     |
| Links           | `[text](url)`        | External links open in new tab      |
| Lists           | `- item` / `1. item` |                                     |
| Blockquotes     | `> text`             | Gold border, italic style           |
| Code inline     | `` `code` ``         | Green tint background               |
| Code block      | ` ``` `              | Dark background, syntax highlighted |
| Tables          | `\| col \| col \|`   | Striped rows, responsive            |
| Horizontal rule | `---`                |                                     |
| Images          | `![alt](src)`        | Centered, rounded corners           |

### Callouts

Use HTML divs for callouts:

```html
<div class="callout callout-info">**Note:** Your note text here.</div>

<div class="callout callout-warning">**Caution:** Your warning text here.</div>

<div class="callout callout-success">**Tip:** Your success tip here.</div>
```

### Code Blocks with Language

````md
```typescript
const x = 1;
```
````

```

Syntax highlighting is automatic via `rehype-highlight`.

---

## 3. File Naming Conventions

| Asset | Convention | Example |
|-------|-----------|---------|
| MDX file | `{prefix}-{number}-{kebab-title}.mdx` | `doc-001-platform-overview.mdx` |
| Category dir | `{kebab-case}` | `introduction`, `knowledge-organization` |
| Image asset | Store in `public/images/` | `public/images/doc-001-hero.png` |

### Ordering

Documents are sorted by `order` (ascending). Use gaps in numbering for future insertions:

```

order: 10
order: 20
order: 30

````

---

## 4. Localization Workflow

1. Write the Arabic version first (primary language)
2. Create the English version with identical structure
3. Both files must have the same:
   - `id`
   - `slug` (filename)
   - `category`
   - `order`
4. Only `title`, `subtitle`, and content differ

---

## 5. Validation Checklist

Before submitting a new document:

- [ ] Frontmatter has all required fields
- [ ] Arabic AND English versions exist
- [ ] Category exists in `lib/content.ts` labels
- [ ] Slug follows naming convention
- [ ] Order does not conflict with existing documents
- [ ] All links work (internal and external)
- [ ] Callouts use the correct CSS classes
- [ ] No lorem ipsum or placeholder text
- [ ] Build succeeds (`pnpm build`)

---

## 6. Quick Reference

```bash
# Add new category label
# Edit: src/lib/content.ts → labels object

# Preview content
pnpm dev  # → localhost:3000/ar/docs

# Verify build
pnpm build
````
