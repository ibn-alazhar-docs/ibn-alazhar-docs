# REFACTORING_MASTER_PLAN.md — Ibn Al-Azhar Docs

> **Updated:** 2026-06-23 (v2 — includes frontend audit findings)
> **Scope:** Architecture-level refactoring across entire codebase
> **Constraint:** Preserve all behavior, tests, APIs, and security
> **Gate:** All 677 unit tests must remain green after each phase

---

## Phase Overview

| Phase  | Focus                             | Files    | Risk   | Status       |
| ------ | --------------------------------- | -------- | ------ | ------------ |
| **0**  | Dead code + DRY cleanup (backend) | 36       | LOW    | ✅ `731018a` |
| **1**  | Error handling consolidation      | 8        | LOW    | ✅ `1fae152` |
| **2**  | Missing use-case layers           | 15       | MEDIUM | ✅ `a001ceb` |
| **3**  | DocumentUseCases split            | 8        | MEDIUM | ⬜ NEXT      |
| **4**  | Route modernization               | 32       | LOW    | ⬜           |
| **5**  | Frontend dead code cleanup        | 20       | LOW    | ⬜           |
| **6**  | Frontend DRY consolidation        | 15       | LOW    | ⬜           |
| **7**  | Frontend bug fixes                | 6        | MEDIUM | ⬜           |
| **8**  | Pipeline quality fixes            | 6        | LOW    | ⬜           |
| **9**  | Worker improvements               | 2        | LOW    | ⬜           |
| **10** | Export subsystem cleanup          | 4        | LOW    | ⬜           |
|        | **Total**                         | **~152** |        |              |

---

## Phase 3: DocumentUseCases Split

**Goal:** Break the 304-line god class into 4 focused use-case classes.

### 3.1 Create `DocumentCrudUseCases`

- **Methods:** `getDocuments`, `getDocumentById`, `updateDocument`, `deleteDocument`, `restoreDocument`
- **Lines:** ~100

### 3.2 Create `DocumentMoveUseCases`

- **Methods:** `moveDocument`, `bulkMoveDocuments`
- **Lines:** ~60

### 3.3 Create `DocumentTagUseCases`

- **Methods:** `getDocumentTags`, `addTagToDocument`, `setDocumentTags`, `removeTagFromDocument`, `bulkTagDocuments`, `bulkUntagDocuments`
- **Lines:** ~100

### 3.4 Create `DocumentShareUseCases`

- **Methods:** `getShareLink`, `createShareLink`, `regenerateShareLink`, `deleteShareLink`
- **Lines:** ~80

### 3.5 Update barrel export + route imports

---

## Phase 4: Route Modernization

**Goal:** Migrate all remaining routes to `withAuth` + `handleRouteError`.

### 4.1 Migrate document routes (15 files)

### 4.2 Migrate folder routes (4 files)

### 4.3 Migrate export routes (5 files)

### 4.4 Migrate remaining routes (profile, stream, auth/register)

### 4.5 Remove duplicate share delete route

---

## Phase 5: Frontend Dead Code Cleanup

**Goal:** Remove 20 dead/unused component files.

### Files to delete:

| File                                                | Reason                   |
| --------------------------------------------------- | ------------------------ |
| `components/ui/drawer-dialog.tsx`                   | Entirely commented out   |
| `components/ui/toast.tsx`                           | Entirely commented out   |
| `components/ui/tubelight-navbar.tsx`                | Not imported anywhere    |
| `components/ui/direction-aware-hover.tsx`           | Not imported anywhere    |
| `components/ui/setting-card.tsx`                    | Not imported by any view |
| `components/settings/settings-form.tsx`             | Entirely commented out   |
| `components/settings/settings-header.tsx`           | Entirely commented out   |
| `components/settings/general-settings-form.tsx`     | Not imported by any view |
| `components/settings/advanced-settings-form.tsx`    | Not imported by any view |
| `components/settings/storage-settings-form.tsx`     | Not imported by any view |
| `components/settings/cache-settings-form.tsx`       | Not imported by any view |
| `components/settings/integration-settings-form.tsx` | Not imported by any view |
| `components/layout/layout-shell.tsx`                | Entirely commented out   |
| `components/layout/sidebar-layout.tsx`              | Not imported by any page |
| `components/layout/auth-layout.tsx`                 | Not imported by any page |
| `app/[locale]/(dashboard)/settings/view.tsx`        | Entirely commented out   |

---

## Phase 6: Frontend DRY Consolidation

**Goal:** Extract shared constants and deduplicate patterns.

### 6.1 Create `lib/constants.ts` with shared values:

- `formatBytes`, `formatDate`, `formatConfidence`
- `LANGUAGES`, `OCR_LANGUAGES`, `STORAGE_PROVIDERS`, `CACHE_STRATEGIES`
- `WEBHOOK_EVENTS`, `API_SCOPES`

### 6.2 Create generic `DeleteConfirmDialog` component

- Replace 3 identical delete dialog components

### 6.3 Update all consumers to import from shared locations

---

## Phase 7: Frontend Bug Fixes

**Goal:** Fix 6 identified bugs.

| Bug                                 | File                   | Fix                             |
| ----------------------------------- | ---------------------- | ------------------------------- |
| `as` prop unused                    | `typography.tsx`       | Implement polymorphic rendering |
| `<slot>` invalid JSX                | `form.tsx`             | Change to `<Slot>` from Radix   |
| Locale double-prefix                | `login-form.tsx`       | Remove locale from callbackUrl  |
| XSS via dangerouslySetInnerHTML     | `template-preview.tsx` | Add DOMPurify sanitization      |
| CardTitle=CardDescription className | `card.tsx`             | Differentiate styles            |
| Overlay color inconsistency         | `alert-dialog.tsx`     | Standardize to bg-black/60      |

---

## Phase 8-10: Pipeline, Workers, Export

See original plan phases 5-7 (unchanged).

---

## Execution Order

```
Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10
```

Phases 5-7 (frontend) are independent of Phases 3-4 (backend) and can be interleaved.
