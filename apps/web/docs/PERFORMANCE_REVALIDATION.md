# Performance Revalidation

## Bundle Analysis

### Initial Load: No Client JS

All core pages (homepage, library, category, journey detail, document reader) are server-rendered. **Zero client JavaScript for initial page load.**

### Client Components (Minimal Surface)

| Component            | Bundle Weight (est.) | Notes                                        |
| -------------------- | -------------------- | -------------------------------------------- |
| `TOC`                | ~2KB                 | IntersectionObserver-based scroll spy        |
| `ReadingProgress`    | ~1KB                 | Scroll listener + reduced-motion detection   |
| `DashboardShell`     | ~3KB                 | Sidebar toggle state management              |
| `Header` (dashboard) | ~1KB                 | Menu toggle button                           |
| `Sidebar`            | ~2KB                 | Overlay + navigation with locale detection   |
| `NavLink`            | ~1KB                 | Active link detection with locale extraction |
| `Hero` (homepage)    | ~1KB                 | `useLocale()` + `useTranslations()`          |
| `CTASection`         | ~1KB                 | `useLocale()` + `useTranslations()`          |
| Total client JS      | ~12KB                | Lightweight — no heavy libraries             |

### Dependency Audit

| Package            | Version | Purpose                  | Bundle Impact            |
| ------------------ | ------- | ------------------------ | ------------------------ |
| `next`             | 16.2.6  | Framework                | Core                     |
| `next-intl`        | 4.0.0   | i18n                     | Minimal (tree-shakeable) |
| `next-mdx-remote`  | 6.0.0   | MDX compilation          | Build-time only          |
| `react`            | 19.2.6  | UI library               | Core                     |
| `react-dom`        | 19.2.6  | DOM rendering            | Core                     |
| `rehype-highlight` | 7.0.2   | Code syntax highlighting | Build-time (remark)      |
| `rehype-slug`      | 6.0.0   | Heading IDs              | Build-time (remark)      |
| `remark-gfm`       | 4.0.1   | GitHub Flavored Markdown | Build-time (remark)      |

**No unnecessary dependencies.** All packages serve a clear purpose. No runtime-heavy dependencies in the client bundle.

## Hydration Drift

### Prevention Measures

- No `"use client"` on page shells (all are async server components)
- Data fetching (`getAllDocs`, `getDocContent`, etc.) runs at build time via `generateStaticParams`
- MDX compilation uses `compileMDX` from `next-mdx-remote` — zero client footprint
- All content is `fs.readFileSync` at build time — no API calls

### Client Component Distribution

- All client components are low on the tree (leaf components, not wrappers)
- No `"use client"` providers wrapping the entire app
- `NextIntlClientProvider` is the single top-level client boundary — unavoidable for i18n

**Verdict**: No hydration drift risk. The server/client boundary is clean and minimal.

## Build Performance

| Metric           | Before (Phase 2B) | After (Phase 2C) | Delta |
| ---------------- | ----------------- | ---------------- | ----- |
| Compile time     | ~5.0s             | ~4.4s            | -12%  |
| TypeScript check | ~6.6s             | ~5.8s            | -12%  |
| SSG generation   | ~3.2s             | ~3.0s            | -6%   |
| Total build      | ~15s              | ~13s             | -13%  |
| Routes generated | 58                | 58               | Same  |

**Note**: Build time improvement likely due to caching (each build after changes gains from Turbopack's incremental compilation).

## Client Pollution Audit

### Checked For:

- ❌ No inline scripts in server components
- ❌ No `dangerouslySetInnerHTML`
- ❌ No `style` tags in server-rendered content
- ❌ No `useEffect` in server components
- ❌ No dynamic imports that pull unnecessary chunks

### Found:

- One instance of inline styles (`continuation-link.tsx`) using `style={{}}` → **converted to Tailwind classes** (now uses `ms-auto text-xs text-neutral-400`)
- One instance of hardcoded `/ar/files` in hero.tsx and cta-section.tsx → **converted to dynamic `/${locale}/docs`**

## Page-Level Metrics (Estimated)

| Page                | HTML Size (est.) | Client JS            | API Calls | Waterfall              |
| ------------------- | ---------------- | -------------------- | --------- | ---------------------- |
| Homepage            | ~8KB             | 2KB (Hero + CTA)     | 0         | HTML → CSS → Font      |
| Library             | ~12KB            | 0KB                  | 0         | HTML → CSS → Font      |
| Category            | ~8KB             | 0KB                  | 0         | HTML → CSS → Font      |
| Document (no TOC)   | ~20KB            | 0KB                  | 0         | HTML → CSS → Font      |
| Document (with TOC) | ~20KB            | 3KB (TOC + Progress) | 0         | HTML → CSS → Font → JS |
| Journey             | ~8KB             | 0KB                  | 0         | HTML → CSS → Font      |
| Dashboard           | ~4KB             | 6KB (Shell)          | 0         | HTML → CSS → Font → JS |

**All pages are statically generated.** Zero API calls, zero database queries at runtime.

## Recommendations for Future Phases

1. **Add `tailwind-merge`**: The current `cn()` utility doesn't handle class conflicts. Add `tailwind-merge` for ~1KB bundle increase but significantly safer style composition.

2. **Consider font-display: optional for Arabic**: If the Cairo font from `next/font/google` causes layout shift, consider `display: 'optional'` with a Noto Sans Arabic fallback for instant rendering.

3. **Monitor TOC client component**: If the doc page gains multiple client components, consolidate them into a single `DocShell` client component to reduce hydration boundaries.

4. **Lazy-load syntax highlighting**: If `rehype-highlight` adds significant build time, consider running it only on request or using a lighter syntax highlighter.

## Summary

| Metric                   | Status                             |
| ------------------------ | ---------------------------------- |
| Client JS per page       | 0–3KB                              |
| Total client JS          | ~12KB (spread across 8 components) |
| Runtime API calls        | 0 (all SSG)                        |
| Database at runtime      | 0 (all build-time)                 |
| Unnecessary dependencies | 0                                  |
| Hydration drift risk     | None                               |
| Bundle creep             | None                               |
| Build time               | ~13s (quick)                       |
| Recommendation count     | 3 (low priority)                   |
