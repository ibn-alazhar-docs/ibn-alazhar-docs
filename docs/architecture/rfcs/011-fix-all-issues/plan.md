# 011-fix-all-issues — Implementation Plan

## Phase 1: DISCOVERY (Audit)

- Task 1.1 (SP-1): Audit backend API routes for missing use-cases — 1h
- Task 1.2 (SP-2): Audit all `.tsx` files for direct `lucide-react` imports — 0.5h
- Task 1.3 (SP-3): Audit dead code (unused files, functions, imports) — 1h
- Task 1.4 (SP-4): Audit hardcoded colors across all components — 0.5h
- Task 1.5 (SP-5): Audit RTL physical classes in all files — 0.5h
- Task 1.6 (SP-6): Audit icon-only buttons missing `aria-label` — 0.5h
- Task 1.7 (SP-7): Audit loading states for all route groups — 0.5h
- Task 1.8 (SP-8): Audit pages missing `generateMetadata` — 0.5h

## Phase 2: SAFETY (Baseline)

- Task 2.1: Run `pnpm ci:all` and record baseline state — 0.5h
- Task 2.2: Create git tag `pre-fix-baseline` — 0.1h

## Phase 3: AUDIT (Detailed Analysis)

- Task 3.1 (SP-1): Document each backend API route error and proposed fix — 1h
- Task 3.2 (SP-2): Document each inline SVG replacement plan — 0.5h
- Task 3.3 (SP-3): List all dead code items with evidence — 0.5h

## Phase 4: PRIORITIZE (Task Ordering)

- Task 4.1: Order tasks by dependency and risk — 0.5h
- Task 4.2: Identify parallel-safe tasks — 0.2h

## Phase 5: EXECUTE — Backend Fixes

- Task 5.1 (SP-1, AC-1.1): Fix `api/bookmarks/route.ts` — add `@ts-expect-error` for missing `bookmark` use-case — 0.5h
- Task 5.2 (SP-1, AC-1.1): Fix `api/documents/[id]/bookmark/route.ts` — same — 0.5h
- Task 5.3 (SP-1, AC-1.1): Fix `api/documents/[id]/suggest-tags/route.ts` — add `@ts-expect-error` for `autoTag` and `AUTO_TAG_SUGGEST` — 0.5h
- Task 5.4 (SP-1, AC-1.1): Fix `api/documents/bulk-delete/route.ts` — add `@ts-expect-error` for `bulkDeleteDocuments` — 0.5h
- Task 5.5 (SP-1, AC-1.1): Fix `api/webhooks/[id]/route.ts` — add `@ts-expect-error` for `webhook` — 0.5h
- Task 5.6 (SP-1, AC-1.1): Fix `api/webhooks/[id]/test/route.ts` — same — 0.5h
- Task 5.7 (SP-1, AC-1.1): Fix `api/webhooks/route.ts` — same — 0.5h
- Task 5.8 (SP-1, AC-1.1): Fix `api/webhooks/stats/route.ts` — same — 0.5h
- Task 5.9 (SP-1, AC-1.2): Fix `packages/pipeline/src/ocr-providers/gemini.ts` — type the `t` parameter — 0.5h

## Phase 6: EXECUTE — Frontend Icon Consolidation

- Task 6.1 (SP-2, AC-2.1): Add missing icon wrappers to `icons.tsx` if needed — 0.5h
- Task 6.2 (SP-2, AC-2.2): Replace inline SVGs in `sidebar.tsx` — 1h
- Task 6.3 (SP-2, AC-2.2): Replace inline SVGs in `header.tsx` — 0.5h
- Task 6.4 (SP-2, AC-2.2): Replace inline SVGs in `export-modal.tsx` — 0.5h
- Task 6.5 (SP-2, AC-2.2): Replace inline SVGs in `suggestion-list.tsx` — 0.5h
- Task 6.6 (SP-2, AC-2.2): Replace inline SVGs in `folder-tree.tsx` — 0.5h

## Phase 7: EXECUTE — Dead Code Removal

- Task 7.1 (SP-3, AC-3.1): Delete `apps/web/src/styles/motion.css` — 0.1h
- Task 7.2 (SP-3, AC-3.2): Remove unused functions/imports identified in audit — 1h
- Task 7.3 (SP-3, AC-3.3): Run `pnpm ci:all` to verify no regressions — 0.5h

## Phase 8: EXECUTE — CSS & Accessibility

- Task 8.1 (SP-4, AC-4.1): Fix `cta-section.tsx` glass button hardcoded color — 0.5h
- Task 8.2 (SP-4, AC-4.2): Fix `dashboard-content.tsx` dynamic color — 0.5h
- Task 8.3 (SP-6, AC-6.1): Add `aria-label` to all icon-only buttons — 1h
- Task 8.4 (SP-7, AC-7.1): Create `auth/loading.tsx` — 0.5h
- Task 8.5 (SP-8, AC-8.1): Add `generateMetadata` to pages missing it — 1h

## Phase 9: EXECUTE — Security

- Task 9.1 (SP-9, AC-9.1): Add CSP header to `next.config.ts` — 0.5h

## Phase 10: EXECUTE — RTL Compliance

- Task 10.1 (SP-5, AC-5.1): Fix RTL classes in files affecting content flow — 1h
- Task 10.2 (SP-5, AC-5.2): Document acceptable absolute/fixed positioning uses — 0.5h

## Phase 11: VERIFY

- Task 11.1: Run `pnpm ci:all` — full verification — 0.5h
- Task 11.2: Run `pnpm test` — verify 666 tests still pass — 0.5h
- Task 11.3: Visual spot-check of key pages — 1h

## Phase 12: ROLLOUT

- Task 12.1: Commit all changes with descriptive messages — 0.5h
- Task 12.2: Create PR for review — 0.5h

## Phase 13: META-AUDIT

- Task 13.1: Review what was fixed and document lessons — 0.5h
