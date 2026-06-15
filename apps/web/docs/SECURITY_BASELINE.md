# Security Baseline

## Overview

Lightweight production security for a static SSG platform. No backend, no databases, no authentication — surface area is minimal by design.

## Implemented Protections

### Security Headers (applied via `next.config.ts`)

| Header                   | Value                                                          | Purpose                    |
| ------------------------ | -------------------------------------------------------------- | -------------------------- |
| `X-Content-Type-Options` | `nosniff`                                                      | Prevent MIME-type sniffing |
| `X-Frame-Options`        | `DENY`                                                         | Prevent clickjacking       |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`                              | Leak minimal referrer info |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Disable unused features    |
| `X-Powered-By`           | Removed (Next.js default: `poweredByHeader: false`)            | Reduce fingerprinting      |

### Content Security Policy (CSP)

Not currently enforced via header — the platform has zero inline scripts (except the JSON-LD block), zero external resources, and zero user-generated content rendering.

**Recommended CSP** for production domain:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';  /* Tailwind generates inline styles */
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Note: `'unsafe-inline'` for styles is unavoidable with Tailwind CSS. Review after potential migration to CSS-only approach. CSP can be added when domain is finalized.

### MDX Safety

- MDX is parsed at **build time** — no runtime `compileMDX` on the client
- All MDX source comes from the repository's own `content/` directory
- No user-supplied MDX, no remote MDX fetching
- `rehype-sanitize` is **not needed** — content is fully trusted (first-party, git-tracked)
- Frontmatter is validated structurally in `parseFrontmatter()`

### Data Handling

| Concern          | Status              |
| ---------------- | ------------------- |
| User data stored | None                |
| API endpoints    | None (fully static) |
| Cookies          | None                |
| localStorage     | None                |
| Form inputs      | None                |
| External embeds  | None                |

## Platform Security

Dependency audit runs as part of CI (`pnpm audit` should be added). Dependencies are minimal:

| Dependency             | Risk Profile                               |
| ---------------------- | ------------------------------------------ |
| `next`                 | Low (widely audited, actively maintained)  |
| `next-intl`            | Low (formatting/text only, no data access) |
| `next-mdx-remote`      | Low (build-time only in this project)      |
| `react` / `react-dom`  | Low                                        |
| `rehype-*`, `remark-*` | Low (build-time, ecosystem-maintained)     |

## What We DON'T Need

The following are **not required** for this static SSG platform:

- Authentication (no user accounts)
- CSRF tokens (no state-changing endpoints)
- Rate limiting (no API endpoints)
- SQL injection protection (no database)
- CORS configuration (no cross-origin API calls)
- Input sanitization (no user inputs)
- Session management (no sessions)
