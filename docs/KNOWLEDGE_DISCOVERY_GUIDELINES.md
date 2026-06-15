# Knowledge Discovery Guidelines

## Purpose

Define how users discover, browse, and navigate content on Ibn Al-Azhar Docs. These guidelines ensure the platform feels scholarly, calm, and intentional — never overwhelming or algorithmic.

## Design Principles

### 1. Orientation First

Before a user reads anything, they must know:

- Where they are (context)
- What's available (scope)
- Where to go next (direction)

Every page provides these three signals explicitly.

### 2. Guided, Not Driven

The platform suggests paths but does not force them. Users choose their exploration style:

- **Browsing**: Free exploration across categories
- **Following**: Pre-defined reading journeys
- **Searching**: Direct lookup (future Phase)

### 3. Progressive Disclosure

Information density increases with user intent:

- **Library homepage**: Broad overview — categories, journeys, recent docs
- **Category page**: Structured list — thematic groups, metadata
- **Document page**: Full depth — reading view, relationships, navigation

### 4. Minimal Cognitive Load

Each page has one primary action:

- Library homepage → choose a category or journey
- Category page → choose a document
- Document page → read

Secondary actions (related docs, journeys) are visually subordinate.

## Knowledge Homepage Patterns

### Sections (in order)

1. **Hero**: Brief platform description, warm tone
2. **Reading Journeys**: 3 featured paths (if exist), with "All journeys" link
3. **Categories**: All domains as cards with icon, description, doc count
4. **Recent Documents**: Last 4 updated docs

### Layout Rules

- No sidebar on homepage (keeps focus on discovery)
- Cards are calm: border, subtle hover, no shadows by default
- Journey cards get a gold accent line (editorial signal)
- Category cards use the primary green on hover

## Category Page Patterns

### Structure

1. **Back link**: "Back to Library"
2. **Category header**: Icon + title
3. **Description**: 1-2 sentences about the category
4. **Stats bar**: Document count + total reading time
5. **Thematic groups**: Documents grouped by theme with group labels
6. **Empty state**: If no documents, show a simple message

### Thematic Groups

Documents in a category are grouped by `themes` from frontmatter. Groups are ordered by size (largest first). A document can belong to multiple themes.

### Empty Category

If a category has no documents, display:

- Arabic: "لا توجد مستندات في هذا التصنيف بعد"
- English: "No documents in this category yet"

## Document Page Patterns

### Layout

```
[Breadcrumbs]
[Journey Context badge] (if part of a journey)
[Title + Subtitle + Metadata]
[Prerequisite banner] (if prerequisites exist)
[Reading content]
[Continuation link] (if continuation exists)
[Related documents] (if related docs exist)
[Prev / Next navigation]
```

### Relationship Elements

| Element       | Position          | Visual Style                        | Condition         |
| ------------- | ----------------- | ----------------------------------- | ----------------- |
| Journey badge | Above title       | Gold pill with link                 | Doc in ≥1 journey |
| Prerequisite  | Before content    | Blue info banner with links         | Has prerequisites |
| Related docs  | After content     | Light gray list with links          | Has related docs  |
| Continuation  | After content     | Gold bar with link and reading time | Has continuation  |
| Prev/Next nav | Bottom of article | Grid with doc titles                | Always present    |

### Reading Calmness

- No ads
- No popups
- No "you might also like" popups
- No infinite scroll
- No commenting widgets
- No social sharing buttons (Phase 2 feature, if at all)

## Journey Pages Patterns

### Journey Index

1. Back link to Library
2. Title + description
3. Journey cards (same layout as homepage)

### Journey Detail

1. Back link to Journeys index
2. Journey header: icon, title, description, stats
3. Timeline: numbered steps with doc cards connected by a vertical line
4. Each step shows: step number, title, subtitle, metadata

## Mobile Patterns

### Breakpoints

| Breakpoint | Width    | Behavior                       |
| ---------- | -------- | ------------------------------ |
| Mobile     | < 640px  | Single column, reduced padding |
| Tablet     | 640-1023 | Two-column category grid       |
| Desktop    | ≥ 1024px | Full layout with TOC sidebar   |

### Navigation on Mobile

- Category grid collapses to single column
- Journey grid collapses to single column
- Recent docs grid collapses to single column
- TOC sidebar is hidden (no replacement — too complex for small screens)

## Visual Hierarchy

### Typography Scale (Discovery)

| Element          | Size      | Weight | Color       |
| ---------------- | --------- | ------ | ----------- |
| Hero heading     | 2.5rem    | 800    | Neutral-900 |
| Section heading  | 1.5rem    | 700    | Neutral-900 |
| Card title       | 1.125rem  | 700    | Neutral-900 |
| Card description | 0.875rem  | 400    | Neutral-500 |
| Card meta        | 0.75rem   | 400    | Neutral-400 |
| Thematic label   | 0.8125rem | 700    | Neutral-400 |
| Step number      | 0.75rem   | 700    | Gold-500    |

### Color Usage

| Element        | Color                                |
| -------------- | ------------------------------------ |
| Journey accent | Gold-400 (border-left on cards)      |
| Categories     | Primary-600 (hover, links)           |
| Prerequisites  | Info-50/800 (banner background/text) |
| Continuation   | Gold-50/800 (bar background/text)    |
| Related docs   | Neutral-50 (list background)         |

## Accessibility

### Keyboard Navigation

- All cards are `<a>` tags (navigable by Tab)
- Jump links in TOC (desktop only, scrolls smoothly)
- Breadcrumbs are a `<nav>` with aria-label
- Journey timeline is semantic HTML (ordered list)

### Screen Reader Considerations

- Icons use `aria-hidden="true"` (decorative only)
- Card groups are `<section>` elements
- Journey context badge announces "Part of [journey name]"
- Reading progress is `aria-hidden="true"` (visual only)

## Scalability Assumptions

| Stage              | Docs | Categories | Journeys | UX Strategy                         |
| ------------------ | ---- | ---------- | -------- | ----------------------------------- |
| Current (Phase 1D) | 6    | 2          | 3        | Manual browse + journeys            |
| Phase 2            | 30   | 5          | 5        | Browse + journeys + basic search    |
| Phase 3            | 100  | 10         | 10       | Search primary + journeys secondary |
| Post-MVP           | 500+ | 15         | 20       | Full-text search + filters          |

## Anti-Patterns to Avoid

- ❌ Dashboard-style metrics (doc count as primary focus)
- ❌ Social media patterns (likes, shares, comments)
- ❌ Algorithmic recommendations
- ❌ Notification badges
- ❌ Progress tracking per user (Phase 2 at earliest)
- ❌ Gamification elements
- ❌ Popup interstitials
- ❌ Autoplay or infinite scroll
