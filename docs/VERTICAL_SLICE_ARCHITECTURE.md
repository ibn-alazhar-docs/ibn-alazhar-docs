# Vertical Slice Architecture — معمارية الشريحة العمودية

> **Phase:** 1B  
> **Type:** Reference Architecture  
> **Last Updated:** 2026-05-24

---

## 1. Philosophy

The vertical slice is NOT a feature set — it is the quality standard.

Every architectural decision in this slice sets a precedent for all future work. Components, patterns, and conventions established here become the canonical reference for the entire project.

## 2. Route Architecture

```
/[locale]                     → Landing page (vertical slice)
├── /[locale]/files           → Dashboard page (placeholder)
├── /[locale]/folders         → Dashboard page (placeholder)
├── /[locale]/conversions    → Dashboard page (placeholder)
└── /[locale]/settings       → Dashboard page (placeholder)
```

### Route Group Structure

```
app/[locale]/
├── layout.tsx                    ← html, body, dir/lang, i18n provider
├── page.tsx                      ← Landing page (this slice)
├── error.tsx                     ← Locale error boundary
├── loading.tsx                   ← Locale loading state
├── not-found.tsx                 ← 404 page (from root)
└── (dashboard)/
    ├── layout.tsx                ← DashboardShell wrapper
    ├── files/page.tsx
    ├── folders/page.tsx
    ├── conversions/page.tsx
    └── settings/page.tsx
```

The landing page is outside `(dashboard)` and has its own shell (PublicHeader + sections + PublicFooter).

## 3. Component Architecture

```
pages/[locale]/page.tsx           ← Server component, composes all sections
├── PublicHeader                  ← Server: sticky nav, logo, locale-aware links
├── <main>                        ← Semantic container
│   ├── Hero                     ← Server: headline, subtitle, CTA
│   ├── Mission                  ← Server: mission text, vision blockquote
│   ├── KnowledgeAreas           ← Server: 4-card grid with icons
│   ├── ReadingPreview           ← Server: description + feature list
│   ├── Principles               ← Server: 2x2 grid with numbered cards
│   └── CTASection               ← Server: heading, subtitle, button
└── PublicFooter                  ← Server: copyright, tagline
```

### Key Design Decisions

| Decision        | Choice                                             | Rationale                                  |
| --------------- | -------------------------------------------------- | ------------------------------------------ |
| Rendering model | All server components                              | Zero client JS for landing page            |
| Animation       | CSS `@keyframes` + Tailwind utilities              | No JS animation libraries                  |
| Content         | Translation-based (messages JSON)                  | i18n-ready from day one, no hardcoded text |
| Layout          | Semantic HTML (`<main>`, `<section>`, `<article>`) | Accessibility, SEO                         |
| Typography      | Cairo font via `@font-face` + Tailwind theme       | Arabic-first, consistent scale             |
| Spacing         | Tailwind `py-24` for sections, `gap-6` for grids   | Generous vertical rhythm                   |

## 4. Data Flow

```
messages/ar.json  ──→  next-intl  ──→  Server Components (useTranslations)
                                                  │
                                  Page renders static HTML with embedded text
                                                  │
                                  Zero client-side data fetching
```

All content is compile-time static. No API calls, no database queries, no async data loading.

## 5. Rendering Strategy

| Route             | Strategy                   | Reason                          |
| ----------------- | -------------------------- | ------------------------------- |
| `/[locale]`       | SSG (generateStaticParams) | Content never changes per build |
| `/[locale]/files` | SSG (generateStaticParams) | Placeholder page                |
| All dashboard     | SSG (generateStaticParams) | Placeholder pages               |
| `_not-found`      | Static                     | Built-in Next.js 404            |

All 12 rendered routes use static generation. Middleware handles locale detection only.

## 6. Bundle Impact

| Resource          | Size                   | Notes                           |
| ----------------- | ---------------------- | ------------------------------- |
| Landing page HTML | ~12KB gzipped          | Fully static, no JS             |
| Client JS         | 0 bytes (landing page) | All server components           |
| `motion.css`      | <1KB                   | 2 keyframes, 10 utility classes |
| Font (Cairo)      | ~60KB woff2            | 3 weights, Arabic unicode-range |

## 7. Accessibility Baseline

- All interactive elements focus-visible
- Semantic landmarks: `<header>`, `<main>`, `<footer>`, `<section>`, `<article>`, `<nav>`
- `aria-label` on nav
- `aria-hidden="true"` on decorative elements
- Skip-to-content via `id="main-content"`
- Proper heading hierarchy (h1 → h2 → h3)
- `text-balance` for typographic wrapping
- `prefers-reduced-motion` support in animations

## 8. Scalability

This architecture scales by adding sections, not by adding complexity:

- New section → New `src/components/sections/*.tsx` + new message keys
- New locale → New `messages/{locale}.json`
- New animation → New `@keyframes` in `motion.css` + `@utility`
