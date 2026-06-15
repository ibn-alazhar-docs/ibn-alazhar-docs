# Navigation System Notes

## Purpose

Document the navigation components, their relationships, and architectural decisions. Serves as reference for Phase 1D and future navigation development.

## Navigation Components

### Routing Tree

```
/[locale]                           Landing page
├── docs                            Knowledge homepage
│   ├── [category]                  Category listing (thematic groups)
│   │   └── [slug]                  Document page (reading view)
├── journeys                        Reading journeys index
│   └── [slug]                      Journey detail (timeline)
├── files                           File manager (future)
├── folders                         Folder manager (future)
├── conversions                     Conversion tool (future)
└── settings                        User settings (future)
```

### Component Architecture

```
public-header.tsx          ← global nav (Home, Library, Journeys, Files)
└── docs/page.tsx          ← Knowledge homepage
    ├── KnowledgeHero      ← Hero section
    ├── JourneyCard[]      ← Feature journeys (max 3)
    ├── CategoryCard[]     ← All categories
    └── RecentDocCard[]    ← Recent documents

docs/[category]/page.tsx  ← Category page
    ├── Breadcrumbs        ← Back link
    ├── ThematicGroup[]    ← Documents by theme
    └── DocCard[]          ← Individual doc cards

docs/[category]/[slug]/page.tsx ← Document page
    ├── ReadingProgress    ← CSS-only progress bar
    ├── Breadcrumbs        ← Home > Library > Category > Title
    ├── JourneyContext     ← "Part of [journey]" badge(s)
    ├── DocMetadataBar     ← Category, reading time, date
    ├── PrerequisiteBanner ← Recommended pre-reading
    ├── TOC                ← Table of contents (desktop only)
    ├── ContinuationLink   ← Next in series
    ├── RelatedDocs        ← Related documents
    └── DocNavigation      ← Prev / Next document

journeys/page.tsx         ← Journeys index
    └── JourneyCard[]      ← All journeys

journeys/[slug]/page.tsx  ← Journey detail
    └── JourneyStep[]      ← Timeline of documents
```

## Discovery Components

### KnowledgeHero

| Prop     | Type   | Description    |
| -------- | ------ | -------------- |
| `locale` | string | Current locale |

Simple hero with heading and paragraph. No images, no CTAs — just orientation.

### CategoryCard

| Prop               | Type   | Description           |
| ------------------ | ------ | --------------------- |
| `id`               | string | Category slug         |
| `label`            | string | Localized name        |
| `description`      | string | Localized description |
| `icon`             | string | Emoji icon            |
| `docCount`         | number | Number of documents   |
| `totalReadingTime` | number | Sum of reading times  |
| `locale`           | string | Current locale        |

An `<a>` tag styled as a card. No images, no hover animations beyond color change.

### JourneyCard

| Prop      | Type         | Description    |
| --------- | ------------ | -------------- |
| `journey` | JourneyEntry | Journey data   |
| `locale`  | string       | Current locale |

An `<a>` tag with gold left-border accent. No images.

### JourneyContext

| Prop       | Type           | Description                  |
| ---------- | -------------- | ---------------------------- |
| `journeys` | JourneyEntry[] | Journeys containing this doc |
| `locale`   | string         | Current locale               |

Renders pill badges above document title. Returns `null` if empty.

### RelatedDocs

| Prop     | Type       | Description              |
| -------- | ---------- | ------------------------ |
| `docs`   | DocEntry[] | Related document entries |
| `locale` | string     | Current locale           |

Renders a flat list of related documents. Returns `null` if empty.

### PrerequisiteBanner

| Prop     | Type       | Description                   |
| -------- | ---------- | ----------------------------- |
| `docs`   | DocEntry[] | Prerequisite document entries |
| `locale` | string     | Current locale                |

Renders a blue info banner with links. Returns `null` if empty.

### ContinuationLink

| Prop     | Type           | Description           |
| -------- | -------------- | --------------------- |
| `doc`    | DocEntry\|null | Continuation document |
| `locale` | string         | Current locale        |

Renders a gold bar with link to the next document in series. Returns `null` if null.

## Data Flow

All navigation data flows through `src/lib/content.ts`:

```
getAllDocs(locale)         → all documents (sorted by order)
getDocBySlug(locale, slug) → single document
getDocNavigation(...)      → prev / next docs
getRelatedDocs(...)        → related document entries
getPrerequisiteDocs(...)   → prerequisite entries
getContinuationDoc(...)    → continuation or null
getDocJourneys(...)        → journeys containing this doc
getJourneys(locale)        → all journeys
getJourney(slug, locale)   → single journey
getCategoryThemes(...)     → thematic groups with docs
getContentCollection(...)  → categorized doc structure
generateSearchIndex(...)   → searchable metadata array
getRecentDocs(...)         → recent documents (by date)
getCategoryDescription(...)→ category description
getCategoryIcon(...)       → category emoji
getCategoryTotalReadingTime(...) → sum of reading times
```

## Caching Strategy

Since this is static-first SSG:

- **Build time**: All content read from filesystem
- **Runtime**: Zero data fetching per request
- **Revalidation**: Full rebuild on content change
- **No caching headers needed**: HTML is static

## Search Preparation

`generateSearchIndex(locale)` produces an array of:

```typescript
interface SearchIndexEntry {
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

This index can be:

1. **JSON-serialized** at build time into `/public/search-index-{locale}.json`
2. **Consumed by Fuse.js** for client-side search (Phase 1E)
3. **Extended with content preview** when needed

### Build-Time Index Generation (Future)

```typescript
// next.config.ts or build script
import { generateSearchIndex } from "@/lib/content";
import fs from "node:fs";

const arIndex = generateSearchIndex("ar");
const enIndex = generateSearchIndex("en");

fs.writeFileSync("public/search-index-ar.json", JSON.stringify(arIndex));
fs.writeFileSync("public/search-index-en.json", JSON.stringify(enIndex));
```

## Breadcrumb Hierarchy

```
Home / [locale]
├── Library / [locale]/docs
│   ├── [Category] / [locale]/docs/[category]
│   │   └── [Title] / [locale]/docs/[category]/[slug]
└── Journeys / [locale]/journeys
    └── [Journey Title] / [locale]/journeys/[slug]
```

Current breadcrumbs are defined in `Breadcrumbs` component (reading/breadcrumbs.tsx). Journey breadcrumbs are not yet implemented.

## Responsive Navigation

### Mobile (< 640px)

- Public header: logo + hamburger menu (or minimal links)
- Knowledge homepage: single column
- No TOC sidebar
- Journey timeline: full width

### Tablet (640px - 1023px)

- Public header: full links
- Category grid: 2 columns
- Journey grid: 2 columns
- Recent docs: 2 columns

### Desktop (≥ 1024px)

- Full layout
- Category grid: 2 columns
- Journey grid: 3 columns
- Document page: 2-column (content + TOC sidebar)
- TOC sticky sidebar on the right

## Future Navigation Enhancements

### Phase 2

- Breadcrumbs for journey pages
- Back-to-top button on long documents
- Category filter/pagination (when docs > 20)
- Document sub-navigation (sections within a long doc)

### Phase 3

- Client-side search (Fuse.js)
- Search results page with highlights
- Keyboard shortcuts (j/k for navigation)
- Collapsible TOC for mobile

### Post-MVP

- User bookmarks
- Reading history
- Personal reading lists
