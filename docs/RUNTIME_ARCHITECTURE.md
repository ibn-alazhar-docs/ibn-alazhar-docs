# Runtime Architecture — هندسة زمن التشغيل

> **Version:** 1.0.0  
> **Phase:** 1A — Foundation Execution  
> **Last updated:** 2026-05-24

---

## 1. Directory Structure

```
apps/web/src/
├── app/
│   ├── layout.tsx                      # Root layout (imports globals.css)
│   ├── error.tsx                       # Root error boundary (client)
│   ├── loading.tsx                     # Root loading state
│   ├── not-found.tsx                   # 404 page
│   └── [locale]/
│       ├── layout.tsx                  # Locale layout (dir, lang, next-intl provider)
│       ├── page.tsx                    # Landing page (server)
│       ├── error.tsx                   # Locale error boundary (client)
│       ├── loading.tsx                 # Locale loading spinner
│       ├── (auth)/                     # Auth group (future)
│       │   ├── login/page.tsx          # Placeholder
│       │   └── register/page.tsx       # Placeholder
│       └── (dashboard)/                # Dashboard group
│           ├── layout.tsx              # Dashboard shell (sidebar + header)
│           ├── files/page.tsx          # Files page placeholder
│           ├── folders/page.tsx        # Folders page placeholder
│           ├── conversions/page.tsx    # Conversions page placeholder
│           └── settings/page.tsx       # Settings page placeholder
├── components/
│   ├── layout/
│   │   ├── dashboard-shell.tsx         # Client: sidebar + header + main
│   │   ├── header.tsx                  # Client: sticky header with menu toggle
│   │   ├── sidebar.tsx                 # Client: nav sidebar with overlay
│   │   └── nav-link.tsx                # Client: active-aware navigation link
│   └── ui/
│       ├── container.tsx               # Max-width content wrapper
│       ├── stack.tsx                   # Flex column with gap
│       ├── grid.tsx                    # CSS grid wrapper (responsive)
│       ├── section.tsx                 # Vertical spacing section
│       ├── heading.tsx                 # h1-h6 with color variants
│       ├── text.tsx                    # Typography primitive
│       └── visually-hidden.tsx         # Accessibility only
├── i18n/
│   ├── request.ts                      # next-intl request config
│   └── routing.ts                      # Locale definitions
├── lib/
│   ├── cn.ts                           # Class name utility
│   └── cn.test.ts                      # Unit tests
├── messages/
│   ├── ar.json                         # Arabic strings
│   └── en.json                         # English strings
├── styles/
│   ├── globals.css                     # Tailwind v4 + brand import
│   └── brand.css                       # Design tokens (@theme)
└── middleware.ts                       # Locale redirect
```

---

## 2. Rendering Strategy

| Route group                   | Strategy              | Why                                   |
| ----------------------------- | --------------------- | ------------------------------------- |
| `[locale]/page.tsx` (landing) | Server Component      | Static content, no interactivity      |
| `(dashboard)/layout.tsx`      | Server → Client shell | Shell is interactive (sidebar toggle) |
| `(dashboard)/*/page.tsx`      | Server Component      | Data fetching from server             |
| `error.tsx`                   | Client Component      | Error recovery needs state            |
| `loading.tsx`                 | Server Component      | Static skeleton/spinner               |

### Rules

1. **Default to Server Component** — only move to client when interactivity is needed
2. **Islands of interactivity** — keep client boundaries small (dashboard-shell, header, sidebar)
3. **No `use client` on layout.tsx** — layouts pass children, don't manage state

---

## 3. i18n Architecture

```
Request → middleware.ts → locale detection → redirect to /{locale}/
  → [locale]/layout.tsx → dir={rtl|ltr}, lang={ar|en}
    → NextIntlClientProvider provides messages
      → pages consume via useTranslations() / getTranslations()
```

- **Locales:** `ar` (Arabic, default), `en` (English)
- **Strategy:** `localePrefix: "always"` — URL always contains locale
- **Messages:** JSON files in `src/messages/{locale}.json`
- **Time zone:** `Asia/Riyadh`
- **Formatting:** Native `Intl` APIs

---

## 4. Component Architecture

### Primitives (lowest level)

```
Container  →  max-width wrapper (sm/md/lg/xl/full)
Stack      →  flex-col with gap scale (0-16)
Grid       →  responsive grid (auto cols)
Section    →  vertical padding (none/sm/md/lg)
Heading    →  h1-h6 with color variants (default/primary/gold)
Text       →  p/span with size, weight, color
```

### Shell (layout level)

```
DashboardShell
├── Header (sticky, backdrop-blur, menu button)
├── Sidebar (fixed, overlay on mobile, persistent on desktop)
│   └── NavLink[] (active state, localized hrefs)
└── <main> {children}
```

### Page level

Each page is a Server Component that composes primitives and shell.

---

## 5. State Management

| Concern            | Solution                     | Scope       |
| ------------------ | ---------------------------- | ----------- |
| Sidebar open/close | `useState` in DashboardShell | Local only  |
| Active navigation  | `usePathname()` in NavLink   | URL-derived |
| i18n               | next-intl (React context)    | Global      |
| Theme              | CSS (brand.css tokens)       | Global      |

No global state library (Zustand) yet — not needed for the shell. Will be added when file/conversion stores are needed.

---

## 6. Error Boundaries

```
Root error.tsx       →  catches rendering errors at app level
Root not-found.tsx   →  catches 404 (unknown routes)
Locale error.tsx     →  catches errors within locale group
Locale loading.tsx   →  shows spinner during page transitions
```

---

## 7. Performance Baseline

- **Zero runtime deps** beyond Next.js, React, next-intl
- **No UI library** — primitives are hand-rolled (≈50 LOC each)
- **All pages are static** — no server-side rendering cost
- **Middleware is minimal** — locale redirect only
- **CSS via Tailwind v4** — JIT compiler, zero unused styles
- **Font loading** — `font-display: swap` with Arabic unicode-range

---

## 8. Key Decisions

| Decision                 | Rationale                                            |
| ------------------------ | ---------------------------------------------------- |
| No Zustand yet           | Shell doesn't need global state — one local useState |
| Primitives not shadcn/ui | shadcn adds 40+ components we don't need yet         |
| i18n in URL path         | SEO-friendly, no cookie dependency, CDN cacheable    |
| (auth) route group       | Future auth pages grouped but not implemented        |
| (dashboard) route group  | Dashboard pages share layout with sidebar            |
