# Characterization map (T011, FR-005)

Single new test file lives in `tests/backend/characterization-t011.test.ts`
(the `unit` vitest project only includes `tests/backend/**`; this README is
the map, so nothing is duplicated).

## (a) Queue driver — default `redis`, PG only when `=pg`

| Rule | Existing coverage | New in `characterization-t011.test.ts` |
|---|---|---|
| Default `redis` | `tests/backend/pg-queue.unit.test.ts:17-30` (driver `toBeDefined`, weak); `tests/integration/redis-default.test.ts:27-33` (instanceof, integration project) | instanceof table: unset/`redis` -> `RedisQueueDriver` (unit, no services) |
| PG only when `=pg` | `tests/integration/pg-no-redis.test.ts:32-33`; `tests/e2e/pg-pipeline.e2e.spec.ts:19` | Same table: `"PG"`/`"postgres"`/`""` -> `RedisQueueDriver`; `"pg"` -> `PgQueueDriver` (exact, case-sensitive match) |
| `validateQueueConfig` (PG needs both DB URLs) | `tests/backend/pg-queue-phase5.unit.test.ts:38-58` (throws / not-throws for `pg`) | Redis no-op: unset flag + no DB URLs -> does not throw |
| Never set in runtime config | `.refactor/map/rules-design-smells.md:11` (infra violations recorded; `wrangler.jsonc` omits it) — documented, not unit-testable | — |

## (b) Upload validation limits (50 / 100 fallback, documented as-is)

| Rule | Existing coverage | New |
|---|---|---|
| Web `MAX_UPLOAD_SIZE_MB` fallback 50 (`apps/web/src/shared/validators/document.ts:14`) | `tests/backend/database-constraints.test.ts:148-166`; `tests/security/upload-security.test.ts:143-176` (env override, invalid-env fallback) | Exact pin: env unset -> `50`, 50 MiB passes, 50 MiB + 1 fails |
| Pipeline `|| 100` fallback (`packages/pipeline/src/storage/validation.ts:17`) | `tests/backend/storage-rate-limit.test.ts:160-182` (100 MiB pass / 101 MiB `FILE_TOO_LARGE`) — pinned under ambient env | None (would duplicate the 101 MiB allocation) |
| Client hardcoded 50 MiB (`apps/web/src/state/use-file-upload.ts:7-10`) | `tests/frontend/hooks/use-file-upload.test.tsx:33-38` (6 GiB rejected; exact 50 MiB boundary not pinned) | None (frontend project; gap accepted) |

Contradictions kept as-is (see `rules-design-smells.md` smell #1): web 50 vs
pipeline 100-fallback vs `.env.example:22` 2048 — pinned, not fixed.

## (c) `ownedWhere` — `deletedAt:null` + ADMIN/userId rules

| Rule | Existing coverage | New |
|---|---|---|
| Non-admin scoped by `userId` + `deletedAt:null` | `tests/backend/authorization.test.ts:56-82` | TEACHER session scoped like STUDENT (was only role-checked, not scoped) |
| ADMIN not scoped by `userId` | `tests/backend/authorization.test.ts:62-66` | ADMIN strips a `userId` already present in `baseWhere` |
| Explicit `deletedAt` preserved | `tests/backend/authorization.test.ts:73-76` | `baseWhere` is not mutated (copied via spread) |

## Smoke (G3)

- Lightweight fetch smoke (unchanged): `tests/smoke/pre-deploy.ts` (3 checks only).
- New full route smoke: `tests/e2e/smoke-routes.spec.ts` — walks
  `apps/web/src/app` (19 `page.tsx` + 78 `route.ts`), visits every URL,
  fails on `pageerror`, console errors, or HTTP 5xx.
- Screenshots: `tests/e2e/visual-pages.spec.ts` (4 viewports); before-baseline
  command in `.refactor/visual-baseline/README.md`.
