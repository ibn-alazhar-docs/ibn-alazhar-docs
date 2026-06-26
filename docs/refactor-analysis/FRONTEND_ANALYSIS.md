# FRONTEND_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** UI components, state management, routing, styling, accessibility
> **System:** Ibn Al-Azhar Docs

---

## 1. Frontend Overview

**Stack:** Next.js 16 App Router + React 19 + Tailwind CSS + shadcn/ui

### 1.1 Component Inventory

| Directory               | Components                       | Purpose                  |
| ----------------------- | -------------------------------- | ------------------------ |
| `components/auth/`      | Login, Register forms            | Authentication UI        |
| `components/files/`     | Document list, upload, preview   | Core document management |
| `components/folders/`   | Folder tree, create/edit dialogs | Folder management        |
| `components/tags/`      | Tag management                   | Tag CRUD                 |
| `components/search/`    | Search UI                        | Full-text search         |
| `components/pipeline/`  | Progress indicators              | OCR progress             |
| `components/reading/`   | Document reader                  | Markdown preview         |
| `components/discovery/` | Discovery views                  | Content discovery        |
| `components/sections/`  | Page sections                    | Reusable sections        |
| `components/layout/`    | App layout, sidebar, navbar      | App shell                |
| `components/locale/`    | Language switcher                | i18n                     |
| `components/mdx/`       | Markdown rendering               | MDX components           |
| `components/theme/`     | Theme provider                   | Dark/light mode          |
| `components/ui/`        | Shadcn/UI primitives             | Base components          |

### 1.2 State Management

**Pattern:** No global store. Server components + URL params + React state.

| Pattern           | Usage                 | Examples             |
| ----------------- | --------------------- | -------------------- |
| Server Components | Data fetching         | Dashboard pages      |
| URL Params        | Filtering, pagination | Search, file listing |
| React State       | Form state, UI state  | Modals, forms        |
| SWR/React Query   | Client data fetching  | Real-time updates    |

---

## 2. Component Architecture

### 2.1 Page Structure

```
app/[locale]/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── dashboard/page.tsx
│   ├── files/page.tsx
│   ├── folders/page.tsx
│   ├── tags/page.tsx
│   ├── search/page.tsx
│   ├── conversions/page.tsx
│   ├── settings/page.tsx
│   ├── users/page.tsx
│   └── preview/[id]/page.tsx
├── (public)/
│   └── shared/[token]/page.tsx
└── docs/page.tsx
```

### 2.2 Component Patterns

| Pattern             | Usage             | Assessment |
| ------------------- | ----------------- | ---------- |
| Server Components   | All pages         | ✅ Good    |
| Client Components   | Interactive parts | ✅ Good    |
| Compound Components | Dialogs, forms    | ✅ Good    |
| Render Props        | Rare              | —          |
| HOCs                | Rare              | —          |

---

## 3. Styling Analysis

### 3.1 Tailwind CSS

- Brand colors: Green `#16A34A`, Gold `#CA8A04`, Gray `#1F2937`
- Font: Cairo (Arabic-first)
- RTL: Logical properties (`ms-`/`me-` not `ml-`/`mr-`)

### 3.2 RTL Compliance

| Check                  | Status | Notes                         |
| ---------------------- | ------ | ----------------------------- |
| Logical CSS properties | ✅     | Using `ms-`/`me-`             |
| Text direction         | ✅     | `dir="rtl"` on root           |
| Layout flip            | ✅     | Flex/Grid RTL-aware           |
| Icons                  | ⚠️     | Some icons may need mirroring |

### 3.3 CSS Issues

| Issue                       | Severity | Location                   |
| --------------------------- | -------- | -------------------------- |
| Physical properties (ml/mr) | LOW      | Check remaining components |
| Hard-coded colors           | LOW      | Some inline styles         |
| Missing dark mode support   | LOW      | Limited theme switching    |

---

## 4. Accessibility

| Check                 | Status | Notes                     |
| --------------------- | ------ | ------------------------- |
| Semantic HTML         | ✅     | Proper landmarks          |
| Keyboard navigation   | ⚠️     | Partial                   |
| ARIA labels           | ⚠️     | Some missing              |
| Focus management      | ⚠️     | Modals need work          |
| Color contrast        | ✅     | Brand colors pass WCAG AA |
| Screen reader support | ⚠️     | Arabic RTL needs testing  |

---

## 5. Performance

| Metric             | Status | Notes                |
| ------------------ | ------ | -------------------- |
| Server Components  | ✅     | Reduced client JS    |
| Code Splitting     | ✅     | Next.js automatic    |
| Image Optimization | ✅     | Next.js Image        |
| Font Loading       | ✅     | Cairo font optimized |
| Bundle Size        | ⚠️     | Monitor growth       |

---

## 6. Recommendations

| #   | Priority | Recommendation                                          |
| --- | -------- | ------------------------------------------------------- |
| 1   | P1       | Audit remaining physical CSS properties (ml/mr → ms/me) |
| 2   | P1       | Add ARIA labels to all interactive elements             |
| 3   | P2       | Implement focus management for modals                   |
| 4   | P2       | Add keyboard navigation for folder tree                 |
| 5   | P3       | Add dark mode support                                   |
| 6   | P3       | Add component storybook                                 |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
