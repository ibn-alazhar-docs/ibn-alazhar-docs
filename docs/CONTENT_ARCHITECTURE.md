# Content Architecture — معمارية المحتوى

> **Phase:** 1C  
> **Type:** Reference Architecture  
> **Last Updated:** 2026-05-24

---

## 1. Philosophy

Content is the product. Every architectural decision prioritizes:

1. **Authoring simplicity** — MDX files in folders, no database required
2. **Locale parity** — Every document exists in Arabic and English
3. **Static-first** — All content compiled at build time, zero runtime overhead
4. **Future scalability** — Categories, metadata, and slugs are forward-compatible

## 2. Directory Structure

```
apps/web/content/
├── {locale}/
│   ├── {category}/
│   │   ├── {slug}.mdx
│   │   └── ...
│   └── ...
└── ...
```

### Example

```
content/
├── ar/
│   ├── introduction/
│   │   ├── doc-001-platform-overview.mdx
│   │   └── doc-002-methodology-principles.mdx
│   └── organization/
│       └── doc-003-knowledge-taxonomies.mdx
└── en/
    ├── introduction/
    │   ├── doc-001-platform-overview.mdx
    │   └── doc-002-methodology-principles.mdx
    └── organization/
        └── doc-003-knowledge-taxonomies.mdx
```

## 3. Slug System

Slugs follow the convention: `{prefix}-{number}-{kebab-case-title}`

```
doc-001-platform-overview
doc-002-methodology-principles
doc-003-knowledge-taxonomies
```

**Rules:**

- Prefix identifies document type (`doc` for articles, expandable later)
- Number ensures ordering and uniqueness
- Kebab-case title provides readability in URLs

## 4. Metadata (Frontmatter)

Every MDX file requires frontmatter:

```yaml
---
id: "doc-001" # Unique identifier
title: "منصة ابن الأزهر دوكس" # Display title
subtitle: "نظرة شاملة" # Subtitle / description
category: "introduction" # Category slug
readingTime: 4 # Estimated reading time (minutes)
date: "2026-05-24" # Publication date
order: 1 # Sort order within category
---
```

| Field         | Required | Purpose                                  |
| ------------- | -------- | ---------------------------------------- |
| `id`          | ✅       | Unique identifier, used for references   |
| `title`       | ✅       | Display title in navigation and metadata |
| `subtitle`    | ✅       | Short description for cards and SEO      |
| `category`    | ✅       | Category slug for routing                |
| `readingTime` | ✅       | Estimated reading time in minutes        |
| `date`        | ✅       | Publication date (ISO 8601)              |
| `order`       | ✅       | Sort order within category (ascending)   |

## 5. Route Mapping

```
/[locale]/docs                              → Content index (all categories)
/[locale]/docs/{category}                   → Category listing
/[locale]/docs/{category}/{slug}            → Document page
```

All routes use SSG via `generateStaticParams`. Content is enumerated at build time from the filesystem.

## 6. Category System

Categories are defined by directory names. The label mapping is in `lib/content.ts`:

| Directory      | Arabic Label  | English Label          |
| -------------- | ------------- | ---------------------- |
| `introduction` | مقدمة         | Introduction           |
| `organization` | تنظيم المعرفة | Knowledge Organization |

To add a new category: create a directory + add a label mapping.

## 7. Future-Proofing

The architecture supports:

- **Multiple document types**: Prefix system (`doc-`, `ref-`, `guide-`)
- **Subcategories**: Nested directories (e.g., `organization/taxonomies/`)
- **Tags**: Additional frontmatter fields (`tags: ["فقه", "أصول"]`)
- **Authors**: Frontmatter `author` field
- **Related content**: Frontmatter `related: ["doc-002"]` references
- **Assets**: Per-document or per-category asset directories

## 8. Authoring Constraints

- All documents must have both Arabic and English versions
- Slugs must be identical across locales
- `order` values determine navigation sequence
- Frontmatter is validated at compile time (TypeScript types)
- No binary assets in content directories (use `public/` instead)
