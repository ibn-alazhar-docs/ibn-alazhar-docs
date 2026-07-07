# 011-fix-all-issues — Comprehensive Project Fix Specification

## Goals

Fix all known issues across the Ibn Al-Azhar Docs codebase: backend type errors, frontend remaining issues, dead code removal, security hardening, refactoring, and debugging. The project must pass `pnpm ci:all` cleanly (format + lint + typecheck + test + secrets:scan) with zero errors.

## Stakeholders

- **Developer (Abdulrahman)**: Needs a clean, maintainable codebase that passes all CI checks
- **End Users (Azhar Students)**: Need a working, secure, accessible document processing platform

## Requirements

### Functional Requirements

- FR-1 (SP-1): All backend API routes must reference existing use-cases (no missing `bookmark`, `autoTag`, `webhook`, `bulkDeleteDocuments`)
- FR-2 (SP-2): All frontend components must use centralized `icons.tsx` (no direct `lucide-react` imports)
- FR-3 (SP-3): All dead code must be identified and removed
- FR-4 (SP-4): All hardcoded colors must use CSS variables
- FR-5 (SP-5): All RTL physical classes must use logical equivalents where appropriate
- FR-6 (SP-6): All icon-only buttons must have `aria-label` attributes
- FR-7 (SP-7): All loading states must exist for every route group
- FR-8 (SP-8): All pages must have `generateMetadata` for SEO
- FR-9 (SP-9): CSP headers must be configured in `next.config.ts`
- FR-10 (SP-10): All inline SVGs must be replaced with centralized icons where possible

### Non-Functional Requirements

- NFR-1 (SP-11): `pnpm ci:all` must pass with zero errors (excluding pre-existing backend module resolution issues that are out of scope)
- NFR-2 (SP-12): No `transition: all` CSS anti-patterns
- NFR-3 (SP-13): Reduced motion preferences must be respected
- NFR-4 (SP-14): Dark mode must work correctly across all components

## Acceptance Criteria

### SP-1: Backend API route fixes

- AC-1.1: Given backend API routes reference non-existent use-cases (`bookmark`, `autoTag`, `webhook`, `bulkDeleteDocuments`), When the typecheck runs, Then these routes either reference existing use-cases or are marked with `@ts-expect-error` with a clear comment explaining the backend gap
- AC-1.2: Given `gemini.ts` has an implicit `any` parameter, When typecheck runs, Then the parameter is properly typed

### SP-2: Frontend icon consolidation

- AC-2.1: Given `icons.tsx` is the centralized icon wrapper, When any `.tsx` file imports from `lucide-react`, Then it must be `icons.tsx` only
- AC-2.2: Given inline SVGs exist in `sidebar.tsx`, `header.tsx`, `export-modal.tsx`, `suggestion-list.tsx`, `folder-tree.tsx`, When feasible, Then they are replaced with centralized icon components

### SP-3: Dead code removal

- AC-3.1: Given `motion.css` is a 1-line stub not imported anywhere, When cleanup runs, Then the file is deleted
- AC-3.2: Given unused functions exist in lib files, When cleanup runs, Then they are removed
- AC-3.3: Given `pnpm ci:all` runs after cleanup, Then no new errors are introduced

### SP-4: CSS variable consistency

- AC-4.1: Given `cta-section.tsx` has `rgba(0,0,0,0.2)` in glass button, When fix runs, Then it uses `var(--shadow-color, ...)` or appropriate CSS variable
- AC-4.2: Given `dashboard-content.tsx` has dynamic `style={{ color: accentColor }}`, When fix runs, Then it uses CSS variables where possible

### SP-5: RTL compliance

- AC-5.1: Given 20+ files have physical RTL classes (`left-`, `right-`, `pl-`, `pr-`), When audit runs, Then files that affect content flow use logical classes (`start-`, `end-`, `ps-`, `pe-`)
- AC-5.2: Given absolute/fixed positioning uses `left-0`/`right-0`, When audit runs, Then these are documented as acceptable (positioning is not content-flow)

### SP-6: Accessibility

- AC-6.1: Given icon-only buttons exist (tag-chip remove, sidebar toggles, header actions), When fix runs, Then all have `aria-label` attributes
- AC-6.2: Given color picker buttons in tags page, When fix runs, Then all have descriptive `aria-label`

### SP-7: Loading states

- AC-7.1: Given auth routes lack `loading.tsx`, When fix runs, Then `loading.tsx` exists for `(auth)` route group
- AC-7.2: Given all dashboard sub-routes have loading states, When audit runs, Then no route group is missing a loading boundary

### SP-8: SEO metadata

- AC-8.1: Given 8+ page files lack `generateMetadata`, When fix runs, Then all page files have proper metadata with Arabic titles and descriptions

### SP-9: Security headers

- AC-9.1: Given `next.config.ts` lacks CSP headers, When fix runs, Then a basic Content-Security-Policy is configured

### SP-10: Inline SVG replacement

- AC-10.1: Given `sidebar.tsx` has 8 inline SVGs, When feasible, Then they are replaced with centralized icons
- AC-10.2: Given `export-modal.tsx` and `suggestion-list.tsx` have inline SVGs, When feasible, Then they are replaced

## Out of Scope

- Backend use-case implementation (`bookmark`, `autoTag`, `webhook`, `bulkDeleteDocuments`) — these are backend gaps, not frontend fixes
- Prisma schema changes
- New feature development
- Test suite fixes for module resolution (pre-existing `@/core/use-cases/*` resolution issues)
- Deployment configuration changes
- Database migrations

## Risks

- **Risk 1**: Replacing inline SVGs may break visual appearance — Mitigation: Test each replacement visually, keep SVGs that are decorative/custom
- **Risk 2**: Adding CSP headers may break existing functionality — Mitigation: Start with report-only mode, then enforce
- **Risk 3**: RTL class changes may break layouts — Mitigation: Only change classes that affect content flow, not absolute positioning
- **Risk 4**: Backend type errors may require backend changes — Mitigation: Use `@ts-expect-error` with clear comments as temporary fix

## Dependencies

- Node.js 22.x
- pnpm workspace
- Next.js 16 + React 19
- Tailwind CSS
- lucide-react (icon library)
- TypeScript strict mode

## Constraints

- Must not break existing 666 passing tests
- Must maintain `pnpm ci:all` format + lint + secrets:scan passing
- Must follow Cairo font integration and RTL-first design principles
- Must use centralized `icons.tsx` for all icon imports
- Must not add AI boilerplate comments

## Origin

`reverse-engineered` — spec generated from codebase analysis and known issues
