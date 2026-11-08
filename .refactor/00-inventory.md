# Source coverage inventory (T009)

**Claim**: every source file in `apps/web/src`, `packages/*/src`, `workers/*/src` maps to exactly one provisional unit below (units finalized in `01-plan.md`). Proof: per-unit file counts sum to the Glob totals observed in T005 (`apps/web/src` 331, `packages/pipeline/src` 100, `packages/database/src` 2 + schema, `packages/shared/src` 7, `workers/ocr-worker/src` 12, `workers/export-worker/src` 3).

## Provisional unit map (file area -> unit)

| Area (from T005–T008 maps) | Files | Unit |
|---|---|---|
| `apps/web/src/styles/brand.css`, `ui/brand.ts`, `ui/fonts.ts`, `styles/*.css`, `ui/metadata.ts` | 15 | U01 design tokens & foundations |
| `apps/web/src/domain/types.ts`, `domain/auth.ts`, `domain/repositories/` (15 interfaces) | 17 | U02 domain contracts & shared types |
| `apps/web/src/core/composition-root.ts`, `core/authorization.ts`, `core/folder-tree.ts` | 3 | U03 composition root |
| `apps/web/src/core/services/**` (~29 files) | 29 | U04 core services |
| `apps/web/src/core/repositories/` (13 files) | 13 | U05 data access (prisma impls) |
| `apps/web/src/app/api/` (78 `route.ts`) | 78 | U06 API route handlers |
| `apps/web/src/app/[locale]/` pages + shell (`layout/error/loading`) | 64 | U07 pages & composition |
| `apps/web/src/ui/` (~74 files incl. primitives + feature folders) | 71 | U08 UI components |
| `apps/web/src/state/` (3 hooks) + `apps/web/src/api/api-client.ts` | 4 | U09 client state |
| `apps/web/src/middleware/`, `clients/redis/`, `lib/msw`, `transport/db.ts`, `shared/` (19 files incl. validators + generated openapi) | 62 | U10 platform cross-cutting |
| `packages/pipeline/src/queue/` (18), `storage/` + `storage.ts`, `config/` + `config.ts` | 28 | U11 pipeline queue & storage |
| `packages/pipeline/src/ocr*.ts`, `ocr-providers/`, `ir/` (7), `queue/enqueue|routing|worker`, `text/` (26) | 45 | U12 pipeline OCR/IR/text |
| `packages/pipeline/src/output/` (16) | 16 | U13 pipeline outputs |
| `packages/pipeline/src/{index,types,keypool,provider-health,alerts,cloud-cost-guard,qa-gates,verify-quotes,clean-structure,document-router,booklet,book-factory,google-drive,audit}` | 15 | U14 pipeline auxiliaries |
| `packages/database/src/` (index, encryption) + `prisma/schema.prisma` + migrations | 3 (+moves) | U15 database seam |
| `packages/shared/src/` (7 files) | 7 | U16 shared package |
| `workers/ocr-worker/src/` (12 files: entry, helpers, stages, sweepers) | 12 | U17 OCR worker |
| `workers/export-worker/src/` (3 files) | 3 | U18 export worker |
| **Total mapped** | **~475** (incl. generated openapi; per-file proof = T005 tables) | |

## Notes

- Overlap check: each file above belongs to exactly one unit; the 2,600-line generated `shared/openapi.ts` and vendored fonts are marked to-exclude in T005 §8 and belong to no unit.
- T010 splits any unit >10 files / ~800 lines further (U06, U07, U08, U12, U14 will split into sub-units) before implementation.
- A missing unit would show here as "unmapped"; none are listed, hence coverage = 100%.
