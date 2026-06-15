# Search Architecture Notes — ملاحظات معمارية البحث

> **Phase:** 1C (Preparatory)  
> **Status:** Design Complete, Not Yet Implemented  
> **Last Updated:** 2026-05-24

---

## 1. Design Constraints

1. **No backend search service yet** — Search will be implemented in a later phase
2. **Static-first** — Search preparation must not introduce runtime dependencies
3. **Locale-aware** — Arabic and English content need separate indexing strategies
4. **RTL-aware** — Search results UI must support RTL natively

## 2. Indexing Assumptions

When search is implemented, it will index:

| Data Source     | Indexed Fields                       | Priority |
| --------------- | ------------------------------------ | -------- |
| MDX frontmatter | title, subtitle, category            | High     |
| MDX content     | Full text (headings weighted higher) | High     |
| File metadata   | date, readingTime, id                | Medium   |
| Category labels | category name                        | Medium   |

## 3. Metadata Preparation (Already Complete)

The content system already prepares search-relevant metadata:

```typescript
interface DocMetadata {
  id: string; // Unique identifier for deduplication
  title: string; // Search title
  subtitle: string; // Search description
  category: string; // Facet filter
  readingTime: number; // Display metadata
  date: string; // Sort by recency
  order: number; // Sort by order
}
```

## 4. Future Search Approaches

### Option A: Client-Side Search (Low-Complexity)

Use Fuse.js or MiniSearch in the browser:

```
Pros: No backend needed, instant deployment
Cons: Index downloaded per locale, limited to ~1000 docs
Implementation: Build search index JSON at compile time
```

### Option B: PostgreSQL Full-Text Search (Medium-Complexity)

When the database is available:

```sql
CREATE INDEX idx_docs_search ON documents USING GIN(to_tsvector('arabic', content));
```

### Option C: Elasticsearch / Meilisearch (High-Complexity)

For large-scale deployments with hundreds of thousands of documents.

## 5. Route-Safe Search UI (Recommended: Option A)

```
/[locale]/search?q=...    — Search results page (static shell, client-side search)
```

The search page shell can be created now with a static placeholder, and client-side search logic can be added later.

## 6. Index Build Script (Future)

```typescript
// scripts/build-search-index.mjs
// Generates static JSON search index at build time
// Run as part of next.config build step

interface SearchIndexEntry {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  url: string;
  locale: string;
}
```

## 7. What NOT to Do Now

- ❌ Do NOT add a search database or service
- ❌ Do NOT add real-time indexing
- ❌ Do NOT add search analytics
- ❌ Do NOT add autocomplete infrastructure
- ❌ Do NOT add full-text search engine

## 8. What IS Ready

- ✅ Metadata structure supports search facets
- ✅ URL structure is search-friendly (`/[locale]/docs/{category}/{slug}`)
- ✅ Content pipeline can produce search indices at build time
- ✅ i18n routing supports locale-aware search
- ✅ Static pages work with client-side search libraries
