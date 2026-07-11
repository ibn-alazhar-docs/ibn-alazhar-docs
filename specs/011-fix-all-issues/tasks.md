# 011-fix-all-issues — Task Breakdown

## [X] Task 5.1: Fix api/bookmarks/route.ts

- **SP-N:** SP-1 (Backend API fixes) | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/bookmarks/route.ts
- **Acceptance:** `useCases.bookmark` error resolved with `@ts-expect-error` comment
- **Verify:** `pnpm typecheck 2>&1 | grep "bookmarks/route"` → no error from this file

## [X] Task 5.2: Fix api/documents/[id]/bookmark/route.ts

- **SP-N:** SP-1 | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/documents/[id]/bookmark/route.ts
- **Acceptance:** Both `useCases.bookmark` references resolved
- **Verify:** `pnpm typecheck 2>&1 | grep "bookmark/route"` → no error

## [X] Task 5.3: Fix api/documents/[id]/suggest-tags/route.ts

- **SP-N:** SP-1 | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/documents/[id]/suggest-tags/route.ts
- **Acceptance:** `useCases.autoTag` and `AUTO_TAG_SUGGEST` errors resolved
- **Verify:** `pnpm typecheck 2>&1 | grep "suggest-tags"` → no error

## [X] Task 5.4: Fix api/documents/bulk-delete/route.ts

- **SP-N:** SP-1 | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/documents/bulk-delete/route.ts
- **Acceptance:** `bulkDeleteDocuments` error resolved (use `deleteDocument` or `@ts-expect-error`)
- **Verify:** `pnpm typecheck 2>&1 | grep "bulk-delete"` → no error

## [X] Task 5.5: Fix api/webhooks/[id]/route.ts

- **SP-N:** SP-1 | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/webhooks/[id]/route.ts
- **Acceptance:** All 3 `useCases.webhook` references resolved
- **Verify:** `pnpm typecheck 2>&1 | grep "webhooks/\[id\]/route"` → no error

## [X] Task 5.6: Fix api/webhooks/[id]/test/route.ts

- **SP-N:** SP-1 | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/webhooks/[id]/test/route.ts
- **Acceptance:** `useCases.webhook` error resolved
- **Verify:** `pnpm typecheck 2>&1 | grep "test/route"` → no error

## [X] Task 5.7: Fix api/webhooks/route.ts

- **SP-N:** SP-1 | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/webhooks/route.ts
- **Acceptance:** Both `useCases.webhook` references resolved
- **Verify:** `pnpm typecheck 2>&1 | grep "webhooks/route"` → no error

## [X] Task 5.8: Fix api/webhooks/stats/route.ts

- **SP-N:** SP-1 | **AC:** AC-1.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/api/webhooks/stats/route.ts
- **Acceptance:** `useCases.webhook` error resolved
- **Verify:** `pnpm typecheck 2>&1 | grep "stats/route"` → no error

## [X] Task 5.9: Fix gemini.ts implicit any

- **SP-N:** SP-1 | **AC:** AC-1.2 | **Estimated:** 0.5h
- **Files:** packages/pipeline/src/ocr-providers/gemini.ts
- **Acceptance:** Parameter `t` is properly typed
- **Verify:** `pnpm typecheck 2>&1 | grep "gemini.ts"` → no error

## [X] Task 6.1: Audit icons.tsx for missing wrappers

- **SP-N:** SP-2 (Frontend icon consolidation) | **AC:** AC-2.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/components/ui/icons.tsx
- **Acceptance:** All icons used in inline SVGs have centralized wrappers
- **Verify:** `grep -r "from \"lucide-react\"" apps/web/src --include="*.tsx" | grep -v icons.tsx` → empty

## [X] Task 6.2: Replace inline SVGs in sidebar.tsx

- **SP-N:** SP-2 | **AC:** AC-2.2 | **Estimated:** 1h
- **Files:** apps/web/src/components/layout/sidebar.tsx
- **Acceptance:** All 8 inline SVGs replaced with centralized icon components
- **Verify:** `grep -c "<svg" apps/web/src/components/layout/sidebar.tsx` → 0 (or only decorative)

## [X] Task 6.3: Replace inline SVGs in header.tsx

- **SP-N:** SP-2 | **AC:** AC-2.2 | **Estimated:** 0.5h
- **Files:** apps/web/src/components/layout/header.tsx
- **Acceptance:** Inline SVGs replaced with centralized icons
- **Verify:** Visual check — icons render correctly

## [X] Task 6.4: Replace inline SVGs in export-modal.tsx

- **SP-N:** SP-2 | **AC:** AC-2.2 | **Estimated:** 0.5h
- **Files:** apps/web/src/components/pipeline/export-modal.tsx
- **Acceptance:** Inline SVGs replaced with centralized icons
- **Verify:** Visual check — icons render correctly

## [X] Task 6.5: Replace inline SVGs in suggestion-list.tsx

- **SP-N:** SP-2 | **AC:** AC-2.2 | **Estimated:** 0.5h
- **Files:** apps/web/src/components/search/suggestion-list.tsx
- **Acceptance:** Inline SVGs replaced with centralized icons
- **Verify:** Visual check — icons render correctly

## [X] Task 6.6: Replace inline SVGs in folder-tree.tsx

- **SP-N:** SP-2 | **AC:** AC-2.2 | **Estimated:** 0.5h
- **Files:** apps/web/src/components/folders/folder-tree.tsx
- **Acceptance:** Inline SVGs replaced with centralized icons
- **Verify:** Visual check — icons render correctly

## [X] Task 7.1: Delete motion.css

- **SP-N:** SP-3 (Dead code removal) | **AC:** AC-3.1 | **Estimated:** 0.1h
- **Files:** apps/web/src/styles/motion.css
- **Acceptance:** File deleted, no imports reference it
- **Verify:** `ls apps/web/src/styles/motion.css` → file not found

## [X] Task 7.2: Remove unused functions/imports

- **SP-N:** SP-3 | **AC:** AC-3.2 | **Estimated:** 1h
- **Files:** Various (identified in Phase 1 audit)
- **Acceptance:** All dead code removed
- **Verify:** `pnpm lint` → no unused variable warnings

## [X] Task 7.3: Verify no regressions after dead code removal

- **SP-N:** SP-3 | **AC:** AC-3.3 | **Estimated:** 0.5h
- **Files:** N/A
- **Acceptance:** `pnpm ci:all` passes
- **Verify:** Full CI run green

## [X] Task 8.1: Fix cta-section.tsx glass button color

- **SP-N:** SP-4 (CSS consistency) | **AC:** AC-4.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/components/sections/cta-section.tsx
- **Acceptance:** `rgba(0,0,0,0.2)` replaced with CSS variable
- **Verify:** No hardcoded rgba in file

## [X] Task 8.2: Fix dashboard-content.tsx dynamic color

- **SP-N:** SP-4 | **AC:** AC-4.2 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/[locale]/(dashboard)/dashboard-content.tsx
- **Acceptance:** Dynamic `style={{ color: accentColor }}` uses CSS variable
- **Verify:** No inline color styles where CSS variables work

## [X] Task 8.3: Add aria-labels to icon-only buttons

- **SP-N:** SP-6 (Accessibility) | **AC:** AC-6.1 | **Estimated:** 1h
- **Files:** Various components with icon-only buttons
- **Acceptance:** All icon-only buttons have descriptive `aria-label`
- **Verify:** `grep -r "aria-label" apps/web/src --include="*.tsx" | wc -l` → increased count

## [X] Task 8.4: Create auth/loading.tsx

- **SP-N:** SP-7 (Loading states) | **AC:** AC-7.1 | **Estimated:** 0.5h
- **Files:** apps/web/src/app/[locale]/(auth)/loading.tsx
- **Acceptance:** Loading boundary exists for auth routes
- **Verify:** `ls apps/web/src/app/[locale]/\(auth)/loading.tsx` → file exists

## [X] Task 8.5: Add generateMetadata to pages

- **SP-N:** SP-8 (SEO) | **AC:** AC-8.1 | **Estimated:** 1h
- **Files:** Page files missing metadata (identified in audit)
- **Acceptance:** All pages have Arabic titles and descriptions
- **Verify:** `grep -r "generateMetadata" apps/web/src/app --include="page.tsx" | wc -l` → matches page count

## [X] Task 9.1: Add CSP header

- **SP-N:** SP-9 (Security) | **AC:** AC-9.1 | **Estimated:** 0.5h
- **Files:** apps/web/next.config.ts
- **Acceptance:** Content-Security-Policy header configured
- **Verify:** `grep -i "content-security-policy" apps/web/next.config.ts` → found

## [X] Task 10.1: Fix RTL content-flow classes

- **SP-N:** SP-5 (RTL compliance) | **AC:** AC-5.1 | **Estimated:** 1h
- **Files:** Files with physical classes affecting content flow
- **Acceptance:** Content-flow classes use logical equivalents
- **Verify:** Spot-check key pages in RTL mode

## [X] Task 10.2: Document acceptable positioning uses

- **SP-N:** SP-5 | **AC:** AC-5.2 | **Estimated:** 0.5h
- **Files:** N/A (documentation)
- **Acceptance:** Comment explaining why absolute/fixed positioning keeps physical classes
- **Verify:** Code review
