# Performance Baseline — خط الأداء الأساسي

> **Version:** 1.0.0  
> **Phase:** 1A — Foundation Execution  
> **Last updated:** 2026-05-24

---

## 1. Bundle Composition

| Package               | Purpose      | Estimated Size          |
| --------------------- | ------------ | ----------------------- |
| `next`                | Framework    | Shared runtime          |
| `react` / `react-dom` | UI rendering | Shared runtime          |
| `next-intl`           | i18n         | ≈20KB gzip              |
| Tailwind v4           | CSS (JIT)    | ≈10KB gzip (shell only) |

**No additional runtime deps.** Primitives are hand-rolled (≈50 LOC each).

---

## 2. Route Analysis

All 21 routes are **statically rendered**:

```
/ar                     → static
/en                     → static
/ar/files               → static
/en/files               → static
/ar/folders             → static
/en/folders             → static
/ar/conversions         → static
/en/conversions         → static
/ar/settings            → static
/en/settings            → static
... (×2 for each locale)
```

No server-side rendering cost. Pages are pre-built at `next build` and served as HTML.

---

## 3. Client-Side JavaScript

| Component        | Type   | Hydration Cost                      |
| ---------------- | ------ | ----------------------------------- |
| `<Header />`     | Client | Small (menu toggle button)          |
| `<Sidebar />`    | Client | Small (nav links, open/close state) |
| `<NavLink />`    | Client | Minimal (`usePathname`)             |
| Error boundaries | Client | Error recovery only                 |

Total client JS entry: **≈3KB** for the shell.

---

## 4. CSS Strategy

- **Tailwind v4 JIT** — only generates CSS for classes actually used
- **No preflight?** — Tailwind v4 handles reset via `@layer base`
- **`brand.css`** — design tokens via `@theme` directive (no runtime cost)
- **`globals.css`** — minimal base styles (scrollbar, selection, focus ring)

Current CSS output: ≈10KB gzip (projected, no measurement tooling yet).

---

## 5. Font Loading

```
Cairo-Regular (400)   → font-display: swap, unicode-range: Arabic
Cairo-Bold (700)      → font-display: swap, unicode-range: Arabic
Cairo-ExtraBold (800) → font-display: swap, unicode-range: Arabic
```

- **Swap strategy:** text visible immediately in fallback font, swaps when Cairo loads
- **unicode-range:** only downloads for Arabic text, not Latin
- **WOFF2 format:** best compression for web fonts
- **Cache:** Cache First via service worker (future, @serwist/next)

---

## 6. Middleware Cost

```typescript
// middleware.ts — locale redirect
// Matcher: "/((?!api|_next|_vercel|.*\\..).*)"
// Operation: detect locale, redirect to /{locale}/
```

Middleware runs on every request except static assets. Cost:

- Single cookie read (if `NEXT_LOCALE` cookie set)
- Single `Accept-Language` header parse (no cookie)
- Single 308 redirect

Edge runtime execution: **<5ms** per request.

---

## 7. Image Strategy

- No images currently used in shell
- Future icons: SVGs inline (heroicons-style) — no HTTP requests
- Future user avatars: `<Image>` with `next/legacy/image` or direct `<img>` with lazy loading

---

## 8. Performance Principles

| Principle                 | Rule                                                   |
| ------------------------- | ------------------------------------------------------ |
| **Minimize client JS**    | No `'use client'` unless interactivity is required     |
| **Static by default**     | All pages should be static unless data-fetching        |
| **Zero unnecessary deps** | No lodash, no UI library, no utility belt              |
| **Lazy boundaries**       | Use React.lazy or dynamic imports for heavy components |
| **CSS budget**            | Keep Tailwind output under 50KB gzip for entire app    |
| **Font budget**           | Load max 3 font weights, all with `font-display: swap` |

---

## 9. Monitoring (future)

| Metric           | Tool                          | When       |
| ---------------- | ----------------------------- | ---------- |
| Bundle size      | `next-bundle-analyzer`        | Phase 2    |
| Lighthouse score | Playwright/CI                 | Each PR    |
| Core Web Vitals  | Vercel Analytics              | Production |
| CSS size         | Tailwind CLI `--print-config` | Each build |

---

## 10. Current Score (Estimated)

| Metric                   | Estimated             | Target       |
| ------------------------ | --------------------- | ------------ |
| First Contentful Paint   | <1.5s                 | <1.0s        |
| Largest Contentful Paint | <2.0s                 | <1.5s        |
| Total Blocking Time      | <50ms                 | <50ms        |
| Cumulative Layout Shift  | <0.05                 | <0.05        |
| Lighthouse Performance   | >95                   | >95          |
| Bundle size (gzip)       | <50KB app + <10KB CSS | <100KB total |

Measurable when deployed to Vercel or when Lighthouse CI is integrated.
