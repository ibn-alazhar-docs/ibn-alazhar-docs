# FRONTEND_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** UI Components, State Management, Render Cycles, Composability
> **System:** Ibn Al-Azhar Docs

## 1. Component Boundaries & State

**Observation:**
The Next.js App Router (React Server Components + Client Components) implementation shows a mixture of exceptional patterns and significant anti-patterns.

**Issues Detected:**
- **Prop Drilling & State Leaks:** Certain deep component trees pass layout and state properties down 4-5 levels instead of leveraging React Context or component composition (`children` / slots).
- **Client Boundary Bloat:** `use client` directives are pushed too high up the component tree. Whole page layouts are becoming Client Components because of minor interactive elements (like a toggle), breaking the performance benefits of React Server Components.
- **Dead Code:** 20 unused component files (`drawer-dialog`, `settings-form` variants, etc.) litter the workspace, increasing bundle size analysis overhead.

## 2. Reusability & DRY

**Issues Detected:**
- **Duplicated UI Logic:** There are 3 distinct implementations of a "Delete Confirmation Dialog" across the Documents, Folders, and Tags interfaces.
- **Magic Strings / Hardcoded Locales:** UI defaults to Arabic, but hardcoded Arabic text exists directly in JSX rather than routing through an i18n abstraction dictionary.
- **Constant Duplication:** Utility constants (`formatBytes`, `formatDate`) are re-implemented or redefined in multiple files rather than centralized.

## 3. Accessibility (A11y) & UX

- **Semantic HTML:** Mostly good, but custom interactive elements (dropdowns, dialogs) sometimes miss `aria-` labels or focus trapping when bypassing standard Radix primitives.
- **XSS Risk in UI:** `template-preview.tsx` uses `dangerouslySetInnerHTML` without proper sanitization (DOMPurify).
- **RTL Integrity:** Logical CSS properties (`ms-`, `me-`) are generally used, but legacy physical properties (`ml-`, `mr-`) still exist in older components, breaking layout continuity in RTL.

## 4. Remediation Strategy

1. **Purge Dead Code:** Immediately delete the 20 unused components identified in the asset tree.
2. **Optimize Server Components:** Push `use client` boundaries to the lowest possible leaf nodes. Use composition to pass Server Components as `children` into interactive Client wrappers.
3. **Component Consolidation:** Create a generic `DeleteConfirmDialog` and refactor all consumers.
4. **Sanitize Data:** Wrap `dangerouslySetInnerHTML` inputs with `DOMPurify.sanitize()`.
5. **Enforce RTL CSS:** Implement a stylelint rule to forbid `ml-`, `mr-`, `pl-`, `pr-` Tailwind classes, enforcing `ms-`, `me-`, `ps-`, `pe-`.
