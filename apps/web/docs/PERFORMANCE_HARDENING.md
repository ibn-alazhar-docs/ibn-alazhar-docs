# Performance Hardening

## Current State

| Metric              | Value                                  |
| ------------------- | -------------------------------------- |
| Build time          | ~13s                                   |
| Total routes        | 58                                     |
| Client JS (max)     | ~12KB                                  |
| Client JS (typical) | 0KB (SSG)                              |
| Font loading        | `display: swap` via `next/font/google` |
| Image strategy      | None (no images)                       |

## Image Strategy

Currently **zero images** in the codebase. When images are added:

- **Always use `next/image`** (built-in optimization, WebP/AVIF auto-conversion)
- Provide explicit `width`/`height` to prevent CLS
- Use `priority` on above-the-fold images
- Lazy-load (`loading="lazy"`) all others (default in Next.js)
- Host on Vercel or same origin — no external image hosts needed
- Consider `placeholder="blur"` with `blurDataURL` for progressive loading

## Font Loading

Already optimal:

- `next/font/google` with `display: swap` ensures text remains visible
- Subset `arabic` + `latin` only (not full character set)
- `variable: "--font-cairo"` avoids duplicate CSS custom property
- Self-hosted at build time (0 external font requests)
- Font appears in CSS bundle, not as separate network request

## Caching Headers

Configured in `next.config.ts`:

| Asset pattern          | Cache header                          |
| ---------------------- | ------------------------------------- |
| `/_next/static/:path*` | `public, max-age=31536000, immutable` |
| `/favicon.svg`         | `public, max-age=86400, immutable`    |
| All other routes       | Vercel Edge Cache (default)           |

## Bundle Integrity

- All pages SSG → zero JS on most page loads
- Client components: `reading-progress.tsx` (~1KB), `toc.tsx` (~2KB) only
- Shared components imported statically (no dynamic imports needed at < 12KB)
- MDX rendered at build time — zero runtime parsing
- `rehype-highlight` runs at build time, no syntax highlighting JS shipped

## Rendering Strategy

| Route type     | Strategy | Data source |
| -------------- | -------- | ----------- |
| Home           | SSG      | None        |
| Docs index     | SSG      | Local MDX   |
| Doc detail     | SSG      | Local MDX   |
| Category       | SSG      | Local MDX   |
| Journeys       | SSG      | Local MDX   |
| Journey detail | SSG      | Local MDX   |

All routes use `generateStaticParams` — no ISR, no `fallback: blocking`, no runtime fetching.

## Recommendations

1. **Monitor bundle size at each PR** — keep client JS under 20KB total
2. **Avoid `use client`** unless interactivity is required
3. **No analytics script** — adds ~20-50KB and blocks render
4. **Consider `output: "export"`** for stricter static verification (but loses Vercel edge benefits)
5. **Audit MDX content size** — large documents (50K+ chars) increase build time
