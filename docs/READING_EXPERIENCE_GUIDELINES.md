# Reading Experience Guidelines — إرشادات تجربة القراءة

> **Phase:** 1C  
> **Type:** Design / UX Reference  
> **Last Updated:** 2026-05-24

---

## 1. Design Principles

### 1.1 Typography is the Interface

In a reading platform, text IS the interface. Every visual decision serves readability:

- **Font**: Cairo (3 weights: 400/700/800) for Arabic-first excellence
- **Body size**: 1.125rem (18px) — optimal for long-form reading
- **Line height**: 2 (32px at 18px) — generous leading for Arabic script
- **Max width**: 42rem (672px) on mobile, 48rem (768px) on desktop — prevents line fatigue
- **Text balance**: `text-wrap: pretty` prevents orphaned words

### 1.2 Calm Reading Environment

- **Background**: Pure white for maximum contrast
- **Text color**: `neutral-800` (#1F2937) — soft black, not pure black
- **Muted elements**: `neutral-500` (#6B7280) — secondary information
- **Accents**: Green only for interactive elements (links, highlights)
- **Gold**: Reserved for blockquotes and heritage accents

### 1.3 Distraction-Free

- No sidebar clutter
- No popups or interstitials
- No auto-playing media
- No excessive animations
- TOC is hidden on mobile, shown on desktop

---

## 2. Reading Layout

### 2.1 Two-Column Layout (Desktop)

```
┌────────────────────────────┬──────────────┐
│                            │  CONTENTS     │
│   Breadcrumbs              │  ──────────  │
│                            │  · Intro      │
│   Document Title           │  · Vision     │
│                            │  · Principles │
│   Metadata Bar             │              │
│   ─────────────────────    │              │
│                            │              │
│   Content                  │              │
│                            │              │
│   ─────────────────────    │              │
│   Prev / Next Navigation   │              │
└────────────────────────────┴──────────────┘
```

### 2.2 Single-Column (Mobile/Tablet)

```
┌────────────────────┐
│   Breadcrumbs       │
│                     │
│   Document Title    │
│                     │
│   Metadata Bar      │
│   ──────────────    │
│                     │
│   Content           │
│                     │
│   ──────────────    │
│   Prev / Next Nav   │
└────────────────────┘
```

---

## 3. Typography Scale

| Element       | Size           | Weight          | Line Height | Usage              |
| ------------- | -------------- | --------------- | ----------- | ------------------ |
| Page title    | 2.25rem (4xl)  | 800 (extrabold) | 1.2         | Document H1        |
| Section title | 1.75rem (3xl)  | 700 (bold)      | 1.3         | Content H2         |
| Sub-section   | 1.375rem (2xl) | 700 (bold)      | 1.4         | Content H3         |
| Mini-section  | 1.125rem (lg)  | 700 (bold)      | 1.5         | Content H4         |
| Body          | 1.125rem (lg)  | 400 (regular)   | 2.0         | Paragraphs         |
| Small         | 0.875rem (sm)  | 400             | 1.7         | Captions, metadata |
| Code          | 0.875rem       | 400             | 1.7         | Code blocks        |

---

## 4. Reading Rhythm

### 4.1 Vertical Spacing

```
H2 → content:       3rem top margin
H3 → content:       2.5rem top margin
H4 → content:       2rem top margin
P → P:              1.5rem bottom margin
Blockquote → P:     2rem top/bottom margin
Code block → P:     1.5rem top/bottom margin
Table → P:          1.5rem top/bottom margin
HR:                 2.5rem top/bottom margin
```

### 4.2 Section Breaks

- H2 has a bottom border (1px `neutral-100`) for visual section breaks
- H3 and H4 have no border, relying on spacing alone
- Horizontal rules (`---`) provide major thematic breaks

---

## 5. Navigation Elements

### 5.1 Reading Progress Bar

- Fixed at top of viewport (below main header)
- 3px height, green gradient
- CSS-only implementation using `animation-timeline: scroll(root)`
- Hidden on mobile? No, it's always visible (subtle)

### 5.2 Table of Contents

- Desktop only (hidden below 1024px)
- Sticky sidebar (top: 6rem, below header)
- Shows H2 and H3 headings from the document
- Active heading highlighted with green border
- Scroll tracking via Intersection Observer (lightweight)

### 5.3 Breadcrumbs

Format: `Home › Library › Category › Document Title`

- Each segment is linked except the current document
- Uses CSS logical properties for RTL support

### 5.4 Prev/Next Navigation

- Two-column grid at the bottom of each document
- Previous on the left (or right in RTL)
- Next on the right (or left in RTL)
- Shows document title, not just "Previous/Next"
- Empty state: placeholder div maintains grid layout

---

## 6. Component Behaviors

### 6.1 Headings (Auto-linked)

Every H2, H3, and H4 automatically receives:

1. An `id` attribute based on the heading text (via `rehype-slug`)
2. A `#` anchor link that appears on hover

### 6.2 Code Blocks

- Dark background (`neutral-900`)
- Syntax highlighting via `rehype-highlight`
- Horizontal scroll for long lines (`overflow-x: auto`)
- `tabIndex={0}` for keyboard scroll access
- Direction forced to LTR regardless of page direction

### 6.3 Tables

- Full width with `border-collapse`
- Header row has green bottom border
- Alternating hover states on rows
- Responsive: horizontal scroll on small screens

### 6.4 Blockquotes

- Gold left (or right in RTL) border
- Light gold background (`gold-50`)
- Slightly smaller text, italic style
- Used for pull quotes and vision statements

---

## 7. Accessibility

- All interactive elements are keyboard accessible
- Heading anchors have `aria-label`
- Reading progress is `aria-hidden`
- Semantic HTML: `<article>`, `<nav>`, `<aside>`, `<header>`, `<footer>`
- Schema.org `Article` markup via `itemScope itemType`
- Focus-visible outlines maintained throughout
- `prefers-reduced-motion` respected (no reading animations)

---

## 8. Performance

- **0 client JS** on document pages (except TOC scroll tracking)
- TOC component is the ONLY client component (uses `useState` + `useEffect`)
- Reading progress is pure CSS
- All MDX compiled at build time
- No runtime data fetching
- No image optimization overhead (future concern)
