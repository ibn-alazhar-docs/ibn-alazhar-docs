# Dependency Graph & Layering (T006 / FR-006 / FR-008 lens D)

> Scope: `apps/web/src` (304 files), `packages/*`, `workers/*`. Source: grep of `^import|from "@/…"`
> + `package.json` workspace deps + `.eslintrc.json` overrides. Method: read-only grep, no cycle tool.

## A. Workspace-level direction

| From | Depends on | Evidence |
|---|---|---|
| `web` | `database`, `pipeline`, `shared` | all 3 `workspace:*`; src imports pipeline ×11, shared ×7 |
| `pipeline` | `database`, `shared` | pg-driver/pg-handler-factory/routing → database; 6 files → shared logger/types |
| `ocr-worker`, `export-worker` | `pipeline` + `database` + `shared` | index/handlers import all three (logger, prisma, loadConfig) |
| `shared` | — (root) | 0 `@ibn-al-azhar-docs/` imports |
| `database` | `@prisma/client` only | singleton + `encryption.ts` wrap |

Single direction `shared ← database ← pipeline ← workers/web`; no back-edges found.

## B. Layer direction (`apps/web/src`)

| Layer | Files | Imports from | Verdict |
|---|---|---|---|
| `app/` | 130 | `@/middleware/auth-guards` ×61, `route-helpers` ×59, `core/composition-root` ×57, `clients/redis` ×49, `shared/validation` ×26, `ui/container` ×21 | correct: app→core/middleware/shared/clients |
| `core/` | 45 | `@/shared/errors` ×21, `@prisma/client` ×16, `@/shared/constants` ×14, `@/domain/types` ×8, `domain/repositories/*.interface` ×11 | correct: core→domain+shared |
| `domain/` | 17 | `@prisma/client` types ×9, `@ibn-al-azhar-docs/shared` ×2, intra-relative | clean: no upward imports |
| `ui/` | 71 | `react` ×41, `next-intl` ×33, `@/ui/*` internal, `@/i18n/navigation` ×12, `@/shared/api` ×10; `@/core/folder-tree` ×3 | ok; only cross-layer is folder-tree helper |
| `state/` | 3 | `@/shared/api`, one `@/ui/files/document-table`, `@/api/api-client`, shared pkg ×1 | client-only, ok |
| `middleware/` | 3 | `@/transport/db` ×3, `next-auth`, `@/domain/*`, `@/shared/*`; re-exports `core/authorization` | middleware→core correct |
| `transport/db.ts` | 1 | re-exports prisma from `@ibn-al-azhar-docs/database` | seam, ok |

## C. ESLint `no-restricted-imports` audit (`.eslintrc.json` ×3 blocks)

| # | Rule | Grep count | Files / status |
|---|---|---|---|
| 1 | `core/services/**` ∌ `@prisma/client` | **1** | `core/services/export.use-cases.ts:321` — type-only `import("@prisma/client").Document[]` cast; no runtime import |
| 2 | `ui/**,state/**` ∌ `@prisma/client, pipeline, bullmq, ioredis, google-auth-library` | **0** | clean |
| 3 | `domain/**` ∌ `@/app,@/ui,@/core,@/middleware,@/transport` | **0** | clean |

## D. Non-rule findings (allowed by ESLint, note for FR-008 shrink)

- `core → @/transport/db` ×3 (`composition-root.ts`, `repositories/account.repository.ts`, `services/export/metadata.ts`) — core knows transport seam; expected for DI.
- `core/services/bookmark.use-cases.ts` type-imports `AuthSession` from `@/middleware/auth-guards` — core→middleware (edge) edge ×1, type-only.
- `ui → @/core/folder-tree` ×3 (`ui/folders/{folder-item,move-dialog,use-folders}`) — read helper+type, keep or lift to `shared/`.
- `shared/validators/auth.ts` value-imports `ROLE` from `@/domain/auth` ×1 — low→high edge; would cycle if domain ever needs shared consts (it doesn't today).
- `lib/email/**` imports `@/ui/brand` ×4 — infra→presentational constants.
- `domain` imports `@prisma/client` in 10 files (types only, incl. `prisma-types.ts`) — contracts stay DB-typed; migrate to `shared` types if Prisma swaps.
- `app/api/documents/[id]/reprocess/route.ts` imports `Prisma` from `@prisma/client` directly — thin-handler leak outside rule scope.

## E. Barrels, hubs, longest chains

- Hubs (importers): `@/middleware/auth-guards` ×62, `@/shared/route-helpers` ×60, `@/core/composition-root` ×59 (110 lines: 13 repos + 20 use-cases), `@/clients/redis` ×52, `@/transport/db` ×18.
- Barrels: `pipeline/src/index.ts` = 20 `export *` (pulls `bullmq`/`ioredis` transitively — audit comments in app warn to use deep imports instead); `pipeline/{config,ir,output,queue,text}/*`, `shared/index.ts` (43 lines), `database/index.ts` (73 lines singleton+encryption).
- Longest chain (7 hops): `app/api/documents/[id]/reprocess` → `core/composition-root` → `services/export.use-cases` → `domain/*interface` → `core/repositories/*` → `@/transport/db` → `@ibn-al-azhar-docs/database` → `@prisma/client`.
- Most-imported by core: `@/shared/errors` ×21, `@prisma/client` ×16, `@/shared/constants` ×14 → shared=shared/common is the hot path.

## F. Cycles

- No bidirectional import cycles found among `app/core/domain/ui/state/shared/lib/clients/middleware/transport` by paired-import inspection; `domain` is a sink, `shared` is a source (except one-way `→domain/auth`).
- Tool gap: `madge`/`depcruise` absent — re-run with a cycle detector before FR-008 deletes/moves modules; `composition-root` and the `pipeline` barrel are the two likely cycle seeds.

*T006 deps map — read-only grep verified 2026-11-08; counts reproducible via `grep -rn` commands in task log.*
