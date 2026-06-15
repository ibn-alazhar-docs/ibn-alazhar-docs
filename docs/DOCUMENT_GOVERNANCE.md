# Document Governance — حوكمة المحتوى

> **Phase:** 2A — Editorial + Authoring System  
> **Status:** Approved  
> **Last Updated:** 2026-05-24

---

## 1. Purpose

Define the standards, lifecycle, naming conventions, metadata requirements, and quality controls that govern every document in Ibn Al-Azhar Docs.

This is the **canonical reference** for document governance — nothing is published without meeting these rules.

---

## 2. Document Lifecycle

Every document passes through four states:

```
  [Draft] ──► [Review] ──► [Published] ──► [Archived]
     │            │
     └──◄─────────┘
```

| State         | Meaning                                  | Requirements                                          | Visible On                       |
| ------------- | ---------------------------------------- | ----------------------------------------------------- | -------------------------------- |
| **Draft**     | Being written, not ready for consumption | Complete frontmatter, valid MDX                       | No                               |
| **Review**    | Submitted for editorial review           | All sections complete, AR + EN parity                 | URL only with `?preview`         |
| **Published** | Live and indexed                         | Passed review, full metadata, all relationships valid | All routes                       |
| **Archived**  | Superseded or deprecated                 | Has pointer to replacement document (if any)          | Only via direct link with banner |

### Transition Rules

| Transition           | Trigger              | Validation Required                                     |
| -------------------- | -------------------- | ------------------------------------------------------- |
| Draft → Review       | Author submits PR    | Frontmatter complete, MDX compiles                      |
| Review → Published   | Editorial approval   | All governance rules pass                               |
| Published → Archived | Deprecation decision | Replacement doc exists (or explicit decision to orphan) |
| Archived → Published | Content revision     | Full re-review required                                 |

### Lifecycle in Frontmatter

The lifecycle state is tracked via the `status` field in frontmatter:

```yaml
status: "published" # draft | review | published | archived
```

---

## 3. Metadata Requirements

### 3.1 Required Fields

Every MDX file **must** include all required fields:

| Field         | Type   | Example                            | Validation                                     |
| ------------- | ------ | ---------------------------------- | ---------------------------------------------- |
| `id`          | string | `"doc-001"`                        | Must be unique across all locales              |
| `title`       | string | `"منصة ابن الأزهر دوكس"`           | Non-empty, ≤ 120 chars                         |
| `subtitle`    | string | `"نظرة شاملة على الرؤية والرسالة"` | Non-empty, ≤ 200 chars                         |
| `category`    | string | `"introduction"`                   | Must match an existing category directory      |
| `readingTime` | number | `4`                                | Integer ≥ 1                                    |
| `date`        | string | `"2026-05-24"`                     | ISO 8601 date (YYYY-MM-DD)                     |
| `order`       | number | `1`                                | Integer ≥ 1, unique per category within locale |
| `status`      | string | `"published"`                      | One of: draft, review, published, archived     |

### 3.2 Optional Fields

| Field           | Type   | Example                   | Purpose                                      |
| --------------- | ------ | ------------------------- | -------------------------------------------- |
| `related`       | string | `"doc-002, doc-003"`      | Comma-separated list of related doc IDs      |
| `prerequisites` | string | `"doc-001"`               | Comma-separated list of prerequisite doc IDs |
| `continuation`  | string | `"doc-002"`               | Single doc ID that continues this one        |
| `themes`        | string | `"methodology, workflow"` | Comma-separated thematic labels              |
| `author`        | string | `"فريق التوثيق"`          | Author name or team                          |
| `tags`          | string | `"فقه, أصول, منهجية"`     | Comma-separated tags for filtering           |
| `source`        | string | `"المكتبة الشاملة"`       | Source attribution                           |
| `language`      | string | `"ar"`                    | Document language code                       |

### 3.3 Relationship Integrity Rules

- `related` must reference valid doc IDs that exist in at least one locale
- `prerequisites` must reference valid doc IDs
- `continuation` must reference a single valid doc ID (not a list)
- If doc A lists doc B as continuation, doc B must exist
- Relationships are **bidirectional by convention**: if doc A lists doc B as related, doc B should also list doc A (the platform does not auto-invert)
- Circular relationships are prohibited (A → B → A)
- `related` self-reference is prohibited

---

## 4. Naming Conventions

### 4.1 Document Slugs

```
doc-{NNN}-{kebab-case-description}
```

| Part        | Rule                                                            | Example             |
| ----------- | --------------------------------------------------------------- | ------------------- |
| Prefix      | `doc-` for articles, `ref-` for references, `guide-` for guides | `doc-`              |
| Number      | 3-digit zero-padded, sequential                                 | `001`               |
| Description | Kebab-case English, ≤ 5 words                                   | `platform-overview` |

**Full example:** `doc-001-platform-overview`

**Rules:**

- Slugs are locale-independent (same slug for AR and EN)
- Must be unique across the entire platform
- Re-numbering is prohibited once a doc is published
- Deprecated slugs are never reused

### 4.2 Category Slugs

```
{kebab-case-category-id}
```

- Single word or kebab-case compound
- Must match the directory name under `content/{locale}/`
- Examples: `introduction`, `organization`, `usul-al-fiqh`

### 4.3 File Names

- Must match the slug exactly: `{slug}.mdx`
- No spaces, no special characters except hyphens
- Example: `doc-001-platform-overview.mdx`

### 4.4 Directory Structure

```
content/
├── {locale}/
│   ├── {category}/
│   │   ├── {slug}.mdx
│   │   └── ...
│   └── ...
└── ...
```

---

## 5. Document Structure Standards

### 5.1 Required Sections

Every published document must have:

1. **Frontmatter** (see §3)
2. **Introduction** — `## المقدمة` / `## Introduction` (or equivalent)
3. **Body** — Minimum 3 substantive sections
4. **Summary** — `## خلاصة` / `## Summary` (or equivalent)

### 5.2 Heading Hierarchy

```
# Document Title        (H1 — derived from frontmatter title, not in MDX)
├── ## Section          (H2 — major divisions)
│   ├── ### Subsection  (H3 — within sections)
│   │   ├── #### Unit   (H4 — within subsections, use sparingly)
│   │   └── ...
│   └── ...
└── ## Summary          (H2 — final section)
```

- No skipping levels (H2 → H4 is prohibited)
- No multiple H1s in MDX (title comes from frontmatter)
- Every H2 must have at least 2 paragraphs before the next H2

---

## 6. Frontmatter Template

```yaml
---
id: "doc-NNN"
title: "Document Title"
subtitle: "Brief subtitle describing the document"
category: "category-slug"
readingTime: 5
date: "YYYY-MM-DD"
order: N
status: "published"
related: "doc-NNN, doc-MMM"
prerequisites: "doc-NNN"
continuation: "doc-MMM"
themes: "theme-a, theme-b"
author: "Author Name"
tags: "tag1, tag2"
source: "Source attribution"
language: "ar"
---
```

---

## 7. Enforcement

| Rule                     | Enforced By                    | When           |
| ------------------------ | ------------------------------ | -------------- |
| Frontmatter completeness | `scripts/validate-content.mjs` | CI (pre-merge) |
| Unique slugs             | `scripts/validate-content.mjs` | CI             |
| Relationship integrity   | `scripts/validate-content.mjs` | CI             |
| Category existence       | Build (Next.js SSG)            | Build          |
| MDX compilation          | Build (Next.js)                | Build          |
| Locale parity            | `scripts/validate-content.mjs` | CI             |
| No broken paths          | Build (Next.js)                | Build          |

---

## 8. Document Deprecation

When a document is archived:

1. Set `status: "archived"` in frontmatter
2. Add `superseded_by: "doc-NNN"` to frontmatter pointing to replacement
3. Remove from all journeys
4. Remove `continuation` pointers from predecessor
5. Update any `prerequisites` fields that referenced it
6. The platform displays a deprecation banner on the doc page

---

## 9. Related Documents

- `docs/AUTHORING_TOOLKIT.md` — Templates and authoring guides
- `docs/EDITORIAL_STYLE_GUIDE.md` — Tone and formatting rules
- `docs/CONTENT_ARCHITECTURE.md` — Directory structure and route mapping
- `docs/INFORMATION_ARCHITECTURE.md` — Taxonomy and hierarchy
- `scripts/validate-content.mjs` — Validation implementation
