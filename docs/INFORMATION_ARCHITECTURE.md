# Information Architecture — Ibn Al-Azhar Docs

## Purpose

Define the taxonomy, hierarchy, naming conventions, and scaling strategy for all content in the platform.

This document is the canonical reference for how knowledge is structured, classified, and navigated.

## Taxonomy Strategy

### Three-Tier Hierarchy

```
Domain (المجال)                    → top-level category directory
  └── Sub-domain (الفن)            → thematic grouping within domain
       └── Document (النص)         → individual MDX file
```

**Current domains:**

| Domain ID      | AR Label      | EN Label               | Scope                               |
| -------------- | ------------- | ---------------------- | ----------------------------------- |
| `introduction` | مقدمة         | Introduction           | Platform overview, methodology      |
| `organization` | تنظيم المعرفة | Knowledge Organization | Classification, taxonomy, standards |

### Thematic Groups

Within each domain, documents are grouped by **theme** (a frontmatter field). Themes provide ad-hoc grouping without creating a rigid subcategory layer. Examples:

| Theme ID      | AR Label  | EN Label    |
| ------------- | --------- | ----------- |
| `overview`    | نظرة عامة | Overview    |
| `methodology` | منهجية    | Methodology |
| `principles`  | مبادئ     | Principles  |
| `workflow`    | سير العمل | Workflow    |
| `standards`   | معايير    | Standards   |
| `taxonomy`    | تصنيف     | Taxonomy    |

### Reading Journeys (Cross-Cutting)

Journeys are **editorial constructs** — curated paths that cross domain boundaries. They are not a taxonomy level but a navigation overlay.

Journeys live in `src/lib/content.ts` as data definitions, not in the filesystem.

## Hierarchy Rules

### Rule 1: Domain directories are categories

- Each domain = one directory under `content/{locale}/`
- Domain IDs must be kebab-case English (`my-domain`)
- Domain labels are defined in `getCategoryLabel()` (content.ts)
- Domain descriptions are defined in `getCategoryDescription()` (content.ts)

### Rule 2: No subcategory nesting

- Content is flat within each domain directory
- Thematic grouping (via frontmatter) provides virtual subcategories
- This avoids deep filesystem paths and simplifies routing (`/[category]/[slug]`)

### Rule 3: Every document exists in both locales

- Same slug across `ar/` and `en/` directories
- Same category across both locales
- Content independently written (NOT machine-translated)
- Locale-parity enforced by convention; build will not break but UX will degrade

### Rule 4: Order is explicit

- `order` in frontmatter controls sort within domain
- 1-based, no gaps required
- Default: 99 (appears last)

## Slug Conventions

### Document Slugs

```
doc-{NNN}-{kebab-case-description}
```

Examples:

- `doc-001-platform-overview`
- `doc-002-methodology-principles`

Rules:

- Sequential numeric prefix (`doc-NNN`) for stable ordering
- Descriptive kebab-case suffix
- Same slug used for both Arabic and English versions
- Slugs must be unique across the entire platform (not just per domain)

### Journey Slugs

```
{kebab-case-path-name}
```

Examples:

- `beginner-path`
- `methodology-path`
- `knowledge-organization`

Rules:

- Descriptive kebab-case
- Locale-independent (the same slug works for both locales)
- Reflects the path's editorial purpose

### Category Slugs

```
{kebab-case-domain-id}
```

Examples:

- `introduction`
- `organization`

Rules:

- Single word or kebab-case compound
- Must match the directory name under `content/{locale}/`

## Category Scaling Strategy

### Adding a New Category

1. Create directory: `content/{locale}/{category-id}/`
2. Add MDX files with frontmatter
3. Add label to `getCategoryLabel()` in `src/lib/content.ts`
4. Add description to `getCategoryDescription()` in `src/lib/content.ts`
5. Add icon to `getCategoryIcon()` in `src/lib/content.ts`
6. Category page auto-generates via `generateStaticParams`

### Planned Categories (Post-MVP)

| Category ID       | AR Label      | EN Label         | Priority |
| ----------------- | ------------- | ---------------- | -------- |
| `usul-al-fiqh`    | أصول الفقه    | Legal Theory     | High     |
| `tafsir`          | التفسير       | Quranic Exegesis | High     |
| `hadith`          | الحديث        | Hadith Studies   | High     |
| `arabic-language` | اللغة العربية | Arabic Language  | Medium   |
| `aqidah`          | العقيدة       | Creed            | Medium   |
| `manhaj`          | المنهج        | Scholarly Method | Medium   |
| `references`      | المراجع       | References       | Low      |

### Scaling Limits

| Dimension       | Current | Planned Max | Notes                    |
| --------------- | ------- | ----------- | ------------------------ |
| Categories      | 2       | 10-15       | Hard limit by navigation |
| Docs/category   | 1-2     | 50-200      | Thematic groups help     |
| Themes/category | 1-2     | 5-10        | Editorial choice         |
| Journeys        | 3       | 10-15       | Editorial choice         |
| Locales         | 2       | 2-3         | Future: French, Turkish  |

## Future Growth Model

### Phase 2 (Auth & Sharing)

- Categories grow to 5-7
- Documents grow to 20-30
- Journeys remain editorial (3-5)

### Phase 3 (Polish & Scale)

- Categories reach 10-15
- Documents reach 100+
- Thematic groups become essential for navigation
- Search becomes primary discovery mechanism

### Beyond Phase 3

- Subcategories may be needed (depth > 2)
- Metadata-based filtering becomes necessary
- User-contributed tags/categories may be introduced
- Taxonomy may need revision based on usage patterns

## File System Architecture

```
content/
├── ar/
│   ├── introduction/
│   │   ├── doc-001-platform-overview.mdx
│   │   ├── doc-002-methodology-principles.mdx
│   │   └── ...
│   ├── organization/
│   │   ├── doc-003-knowledge-taxonomies.mdx
│   │   └── ...
│   └── {new-category}/
│       └── ...
├── en/
│   ├── introduction/
│   │   ├── doc-001-platform-overview.mdx
│   │   └── ...
│   └── ...
└── (no journeys/ — journeys are code-defined)
```

## Related Documents

- `docs/CONTENT_ARCHITECTURE.md` — Content directory structure and routing
- `docs/KNOWLEDGE_DISCOVERY_GUIDELINES.md` — User-facing discovery experience
- `docs/READING_PATHS_STRATEGY.md` — Editorial journey creation
- `docs/NAVIGATION_SYSTEM_NOTES.md` — Navigation component architecture
