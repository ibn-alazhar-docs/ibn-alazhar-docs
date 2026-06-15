# Scalability Strategy — استراتيجية التوسع

> **Phase:** 2A — Editorial + Authoring System  
> **Status:** Approved  
> **Last Updated:** 2026-05-24

---

## 1. Purpose

Prepare Ibn Al-Azhar Docs for growth from 6 documents to hundreds, from 2 categories to 15+, from 1 author to multiple contributors.

This document defines the architectural assumptions, organizational patterns, and operational limits that ensure the platform can scale without collapsing into chaos.

---

## 2. Scaling Dimensions

| Dimension     | Current | Phase 2 (Near) | Phase 3 (Medium) | Beyond |
| ------------- | ------- | -------------- | ---------------- | ------ |
| Documents     | 6       | 30-50          | 100-200          | 500+   |
| Categories    | 2       | 5-7            | 10-15            | 20+    |
| Themes        | 6       | 15-20          | 30-40            | 50+    |
| Journeys      | 3       | 5-8            | 10-15            | 20+    |
| Locales       | 2       | 2              | 2-3              | 4-5    |
| Contributors  | 1       | 2-5            | 5-15             | 10-30  |
| Content files | 12      | 60-100         | 200-400          | 1000+  |

---

## 3. Architectural Assumptions

### 3.1 What Scales

| Component   | Scaling Strategy                          | Limit              |
| ----------- | ----------------------------------------- | ------------------ |
| MDX files   | Flat per-category, no nested dirs         | ~200 files/dir     |
| Frontmatter | Schema-enforced via TypeScript            | No practical limit |
| SSG routes  | `generateStaticParams` enumerates all     | ~1000 routes       |
| Build time  | Incremental builds, category-based        | ~30s for 1000 docs |
| Navigation  | Thematic groups absorb subcategory need   | ~15 categories     |
| Search      | Build-time JSON index, client Fuse.js     | ~5000 entries      |
| CSS         | Utility-first (Tailwind) + minimal custom | ~20KB              |

### 3.2 What Does NOT Scale (And Must Change)

| Current Approach                                  | Breaking Point | Replacement                                                     |
| ------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| All categories in single `getCategoryLabel()` map | ~20 categories | Dynamic label resolution from config file                       |
| All journeys in single `getJourneys()` array      | ~30 journeys   | Journeys as individual JSON files                               |
| `content.ts` dual-purpose (reader + builder)      | ~50 functions  | Split into `content.ts` (reader) + `content-utils.ts` (builder) |
| Monolithic `content.test.ts`                      | ~100 tests     | Split into per-category test files                              |

---

## 4. Category Expansion Plan

### 4.1 Current Categories

| ID             | AR            | EN                     | Docs |
| -------------- | ------------- | ---------------------- | ---- |
| `introduction` | مقدمة         | Introduction           | 2    |
| `organization` | تنظيم المعرفة | Knowledge Organization | 1    |

### 4.2 Phase 2 Categories

| ID                | AR            | EN               | Priority | Docs Planned |
| ----------------- | ------------- | ---------------- | -------- | ------------ |
| `usul-al-fiqh`    | أصول الفقه    | Legal Theory     | High     | 5-8          |
| `tafsir`          | التفسير       | Quranic Exegesis | High     | 5-8          |
| `hadith`          | الحديث        | Hadith Studies   | High     | 5-8          |
| `arabic-language` | اللغة العربية | Arabic Language  | Medium   | 3-5          |
| `aqidah`          | العقيدة       | Creed            | Medium   | 3-5          |

### 4.3 Adding a New Category — Checklist

1. Create `content/ar/{category}/` and `content/en/{category}/`
2. Add label to `getCategoryLabel()` in `content.ts`
3. Add description to `getCategoryDescription()` in `content.ts`
4. Add icon to `getCategoryIcon()` in `content.ts`
5. Add theme labels to `getCategoryThemes()` in `content.ts`
6. Create first document(s) in both locales
7. Run validation: `node scripts/validate-content.mjs`
8. Build and verify route generation
9. Update INFORMATION_ARCHITECTURE.md with new category

### 4.4 Category ID Conventions

| Convention               | Example                                        |
| ------------------------ | ---------------------------------------------- |
| Single concept           | `tafsir`, `hadith`, `aqidah`                   |
| Compound (Arabic origin) | `usul-al-fiqh`, `mustalah-al-hadith`           |
| Compound (descriptive)   | `arabic-language`, `islamic-history`           |
| Avoid                    | Acronyms, abbreviations, non-descriptive names |

---

## 5. Content Growth Model

### 5.1 Organic Growth

Content grows based on editorial priorities, not artificial targets:

```
Phase 2:  Fill core Islamic sciences (fiqh, tafsir, hadith)
Phase 3:  Deepen existing categories, add secondary categories
Beyond:   Specialized sub-fields, advanced topics
```

### 5.2 Growth Ratios

For healthy content distribution:

| Metric              | Target | Warning     |
| ------------------- | ------ | ----------- |
| Docs per category   | 5-15   | < 3 or > 50 |
| Themes per category | 3-6    | < 2 or > 10 |
| Docs per journey    | 3-6    | < 2 or > 10 |
| Journeys per locale | 5-10   | < 3 or > 15 |

### 5.3 When to Create a New Category

A new category is warranted when:

- 3+ documents exist on the same subject
- The subject has a distinct scholarly identity
- The content does not fit naturally into existing categories
- There is a clear editorial need (not just because)

---

## 6. Contributor Guidelines

### 6.1 Roles

| Role           | Responsibility                           | Access      |
| -------------- | ---------------------------------------- | ----------- |
| **Author**     | Writes content, follows templates        | Submit PRs  |
| **Reviewer**   | Checks accuracy, style, and completeness | Approve PRs |
| **Editor**     | Maintains governance, resolves disputes  | Merge PRs   |
| **Translator** | Creates EN versions from AR originals    | Submit PRs  |

### 6.2 Contribution Workflow

```
1. Identify need      → Browse existing content, check for gaps
2. Propose            → Open an issue with scope, category, outline
3. Approve            → Editor confirms fit
4. Write AR           → Use scaffold, follow editorial style guide
5. Write EN           → Adapt/translate from AR
6. Validate           → node scripts/validate-content.mjs
7. Submit PR          → Include both locales
8. Review             → Passes governance + style + accuracy checks
9. Merge              → Editor merges after approval
```

### 6.3 Communication

- All discussions in GitHub Issues and PRs
- Editorial decisions documented in ADRs
- Style questions resolved by updating the Editorial Style Guide

---

## 7. Search Indexing Assumptions

### 7.1 Current Approach

Build-time JSON index via `generateSearchIndex()`:

```typescript
export interface SearchIndexEntry {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  categoryLabel: string;
  slug: string;
  path: string;
  readingTime: number;
  date: string;
  themes: string[];
}
```

### 7.2 Scaling Limits

| Metric              | Current | Limit                 | Action at Limit            |
| ------------------- | ------- | --------------------- | -------------------------- |
| Index file size     | ~2KB    | 500KB                 | Split by locale → category |
| Fuse.js search time | Instant | 100ms at 5000 entries | Add category pre-filter    |
| Index generation    | 5ms     | 200ms at 1000 docs    | Cache index in build       |

### 7.3 Future: Server-Side Search

When document count exceeds 500:

- Move from Fuse.js to PostgreSQL full-text search
- Keep static index for offline/fallback
- Index documents on publish via webhook

---

## 8. Repository Scaling

### 8.1 File Count Growth

```
Phase 1:  12 content files (6×2 locales)
Phase 2:  60-100 content files
Phase 3:  200-400 content files
Beyond:   1000+ content files
```

### 8.2 Git Performance

- Repo size with 1000 MDX files: ~10MB uncompressed
- Git handles this efficiently — no special measures needed
- `git status`, `git diff` remain fast (< 1s)
- Clone times limited by images (place in `public/` not `content/`)

### 8.3 CI/CD Scaling

- Lint + typecheck + validate: < 30s at 1000 docs
- Test: < 60s at 500 tests
- Build: < 60s at 1000 routes
- Shard by category if build exceeds 120s

---

## 9. Operational Limits

| Resource          | Limit        | Monitoring           |
| ----------------- | ------------ | -------------------- |
| Categories        | 20 (hard)    | CI warning at 15     |
| Docs per category | 200 (soft)   | CI warning at 150    |
| Journeys          | 20 (soft)    | Editorial review     |
| Locales           | 5 (hard)     | Translation capacity |
| Build time        | 120s (hard)  | CI timeout           |
| Test suite        | 5 min (soft) | CI monitoring        |

---

## 10. Migration Paths

### 10.1 From Phase 2 to Phase 3

1. Split `content.ts` into focused modules
2. Move journey definitions to JSON files
3. Add server-side search
4. Implement contributor dashboard (simple, admin-level)

### 10.2 From Single-Author to Multi-Contributor

1. Document the contribution workflow (this document)
2. Create governance and style guides (completed in Phase 2A)
3. Set up PR templates
4. Review process per `governance/REVIEW_PIPELINE.md`

---

## 11. Related Documents

- `docs/INFORMATION_ARCHITECTURE.md` — Taxonomy and hierarchy
- `docs/DOCUMENT_GOVERNANCE.md` — Standards and lifecycle
- `docs/CONTENT_ARCHITECTURE.md` — Directory structure
- `docs/NAVIGATION_SYSTEM_NOTES.md` — Navigation scaling
- `docs/SEARCH_ARCHITECTURE_NOTES.md` — Search strategy
- `governance/CONTRIBUTING.md` — Contribution guidelines
