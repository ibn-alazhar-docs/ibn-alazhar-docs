# REPORT_BOOTSTRAP_AUDIT — فحص المستودع

> **التاريخ:** 2026-05-24
> **البند:** Bootstrap Audit — Phase 0 → Phase 1 readiness
> **المُعد:** Lead Bootstrap Engineer

---

## 1. DUPLICATED FOLDERS

| Path                                                                                     | Type                           | Issue                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00_Inbox/`, `09_Archive/`, `archive/`                                                   | 3 separate archive directories | Duplicated purpose. Governance says `00_Inbox/` and `09_Archive/` are non-canonical; `archive/` also exists with overlapping content (legacy-root, legacy-tooling, speculative-runtime, tooling-claude).                                        |
| `.opencode/_legacy/` (9 files)                                                           | Legacy runtime docs            | Contains BOOT_SEQUENCE, EXECUTION_ENGINE, OPENCODE_POWERHOUSE, PHASE_GATES, REVIEW_PIPELINE, runtime-manifest, RUNTIME_MANIFESTO, SYSTEM, WORKFLOW — all now superseded by files in `.opencode/runtime/`, `.opencode/` root, and `governance/`. |
| `docs/_reports/` (27 files, 737KB)                                                       | Audit/agent reports            | Stale outputs from various AI agent runs. Not canonical.                                                                                                                                                                                        |
| `docs/TESTING_STRATEGY.md`, `docs/09_QA_TEST_PLAN.md`, `docs/QA_PHASE1_TEST_STRATEGY.md` | 3 testing strategy docs        | Overlapping content. `09_QA_TEST_PLAN.md` is canonical per spec-authority hierarchy.                                                                                                                                                            |
| `docs/tools/CODERABBIT_REVIEW_GUIDE.md` + `docs/tools/SECRETS_POLICY.md`                 | Tooling docs                   | Should live in `.github/` or root, not inside `docs/`.                                                                                                                                                                                          |

## 2. DEAD / STALE SCRIPTS

| File                           | Size       | Status                                                                                                            |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `scripts/install_skill.sh`     | ~1KB       | Dead — clones entire vercel-labs/skills repo to install one skill. Skills are now managed via `skills-lock.json`. |
| `scripts/runtime/bootstrap.sh` | Unknown    | Not executed by any package.json script or pre-commit hook.                                                       |
| `scripts/secrets-scan.mjs`     | Unknown    | Called in `.husky/pre-commit`. Functional but minimal.                                                            |
| `.aider.chat.history.md`       | ~227 lines | Leftover from aider sessions. Should be gitignored.                                                               |
| `.aider.input.history`         | ~23 lines  | Aider artifact.                                                                                                   |
| `.aider.tags.cache.v4/`        | 4.1MB      | Large aider cache. Gitignored but taking disk space.                                                              |

## 3. CONFLICTING / INCONSISTENT CONFIGS

| Config                                                                                                      | Issue                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.example` uses `POSTGRES_USER=ibn_docs`, `POSTGRES_PASSWORD=ibn_docs_password`, `POSTGRES_DB=ibn_docs` | `docker-compose.dev.yml` matches. BUT `docs/13_PHASE_1_PLAN.md` and `docs/22_REPO_STRUCTURE.md` use `ibn_al_azhar_docs` for DB name/user. Inconsistent naming.                                                 |
| `docker-compose.dev.yml` container names: `ibn-postgres`, `ibn-redis`, `ibn-minio`                          | `docs/22_REPO_STRUCTURE.md` specifies `ibn-al-azhar-docs-*` naming pattern (e.g., `ibn-al-azhar-docs-postgres`). Actual compose file uses short names.                                                         |
| `.gitignore` duplicates                                                                                     | `node_modules/`, `.turbo/`, `.vercel/`, `.next/`, `dist/`, `build/`, `out/`, `coverage/`, `playwright-report/`, `test-results/`, `tmp/`, `.cache/`, `uploads/` all appear twice.                               |
| `.prettierignore` references `.claude/` paths                                                               | `.claude/agents`, `.claude/skills/ibn-*`, `.claude/skills/impeccable`, `.claude/skills/speckit-*` — these paths don't exist. Also references `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md` which don't exist at root. |
| CI workflows (`.github/workflows/ci.yml`, `lint.yml`, `typecheck.yml`)                                      | All **zero bytes** — empty stubs. No CI runs.                                                                                                                                                                  |
| `pnpm-lock.yaml`                                                                                            | Only 715 bytes — suggests no deps actually installed (node_modules was populated from cache or dev install, but lock file is tiny).                                                                            |
| `ARCHITECTURE.md`                                                                                           | **Empty file** — zero content.                                                                                                                                                                                 |

## 4. MISSING DEPENDENCIES

| Item                      | Status                                                          |
| ------------------------- | --------------------------------------------------------------- |
| ESLint config             | **MISSING** — No `.eslintrc.*`, no `eslint` in devDependencies  |
| LICENSE file              | **MISSING** — README says MIT, but no LICENSE file exists       |
| `.dockerignore`           | **MISSING** — Needed for efficient Docker builds                |
| `apps/web/package.json`   | **MISSING** — No Next.js dependency declared                    |
| `apps/web/tsconfig.json`  | **MISSING** — No app-level TypeScript config                    |
| `apps/web/next.config.ts` | **MISSING** — No Next.js config                                 |
| `packages/shared/`        | **MISSING** — Referenced in workspace, doesn't exist            |
| `packages/ui/`            | **MISSING** — Referenced in docs, doesn't exist                 |
| `workers/`                | **MISSING** — Referenced in README and workspace, doesn't exist |
| `apps/worker/`            | **MISSING** — Referenced in docs as BullMQ worker               |

## 5. BROKEN REFERENCES

| Reference                                    | Location                                       | Problem                                         |
| -------------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `pnpm dev` command                           | `README.md` line 68, `docs/13_PHASE_1_PLAN.md` | No `dev` script in `package.json`               |
| `pnpm build` command                         | `.github/workflows/ci.yml` (in docs)           | Not in CI configs (they're empty)               |
| `workers/` directory                         | `README.md`, `pnpm-workspace.yaml`             | Directory does not exist                        |
| `apps/worker/`                               | `docs/22_REPO_STRUCTURE.md`                    | Does not exist                                  |
| `packages/shared/`                           | `docs/22_REPO_STRUCTURE.md`                    | Does not exist                                  |
| `packages/ui/`                               | `docs/22_REPO_STRUCTURE.md`                    | Does not exist                                  |
| `docs/28_TERMINOLOGY_AND_NAMING_STANDARD.md` | Referenced                                     | Exists but is not listed in canonical docs list |
| LICENSE reference                            | `README.md` line 125                           | `LICENSE` file doesn't exist                    |

## 6. NAMING INCONSISTENCIES

| Item                      | Inconsistency                                                           |
| ------------------------- | ----------------------------------------------------------------------- |
| DB naming                 | `.env.example` = `ibn_docs` / docs say `ibn_al_azhar_docs`              |
| Container naming          | `docker-compose.dev.yml` = `ibn-*` / docs say `ibn-al-azhar-docs-*`     |
| DB constant in docs       | `Phase 1 Plan` says `ibn_al_azhar_docs` but env example says `ibn_docs` |
| Workspace package pattern | `@ibn-al-azhar-docs/*` (per docs) but no packages use this yet          |

## 7. OBSOLETE ARTIFACTS

| Artifact                                 | Size            | Reason                                                         |
| ---------------------------------------- | --------------- | -------------------------------------------------------------- |
| `docs/00_MEGA_COMPLETE_SPEC.md`          | 112KB           | Superseded by individual `docs/NN_*.md` + `specs/NNN-*/`       |
| `docs/_reports/`                         | 737KB, 27 files | Stale AI agent audit reports                                   |
| `.opencode/_legacy/`                     | ~40KB, 9 files  | Superseded by runtime/ and governance/                         |
| `docs/AI_ENGINEERING_PLATFORM/README.md` | Unknown         | Stale platform concept                                         |
| `docs/TESTING_STRATEGY.md`               | Unknown         | Superseded by `docs/09_QA_TEST_PLAN.md`                        |
| `docs/QA_PHASE1_TEST_STRATEGY.md`        | Unknown         | Overlaps with `docs/09_QA_TEST_PLAN.md`                        |
| `archive/` duplicates                    | ~15+ files      | Duplicates of now-canonical root docs, ADRs, and runtime specs |

## 8. STRUCTURAL RISKS

| Risk                                                       | Severity   | Details                                                                                                                                    |
| ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| No app code exists, but README describes fully working app | **HIGH**   | Misleading. Visitor expects working app, finds empty directories.                                                                          |
| Lock file is 715 bytes                                     | **HIGH**   | Suggests `pnpm install` was never run successfully, or was run with no workspace packages.                                                 |
| CI workflows are empty                                     | **HIGH**   | No automated quality gates. PRs cannot be validated.                                                                                       |
| husky pre-commit only scans secrets                        | **MEDIUM** | No lint, format, or typecheck step. Easy to commit broken code.                                                                            |
| 3 archive directories                                      | **MEDIUM** | Confusion about where to put files. Governance says `archive/` is non-canonical but it's not listed in REPOSITORY_BOUNDARIES.md exclusion. |
| `.prettierignore` references ghost paths                   | **LOW**    | Doesn't break anything but misleading.                                                                                                     |
| 890MB node_modules with no app code                        | **LOW**    | Expected for bootstrap, but wasteful.                                                                                                      |

## 9. MISSING ENVIRONMENT STANDARDS

| Standard                               | Status                                                      |
| -------------------------------------- | ----------------------------------------------------------- |
| `.env` template with CI-specific vars  | Missing (`DATABASE_URL` for CI in postgres service section) |
| `.env.production` example              | Missing                                                     |
| `.env.staging` example                 | Missing                                                     |
| Environment variable naming convention | Missing (SOME_PATTERN vs some.pattern vs somePattern)       |
| Secret rotation docs                   | Missing                                                     |

---

## AUDIT SCORE: 4.5/10

> **Critical issues:** Empty CI workflows, no app code structure, inconsistent DB naming, missing LICENSE, ESLint, `.dockerignore`
> **Medium issues:** Duplicate archive dirs, stale docs, dead scripts, empty lock file
> **Low issues:** Prettierignore ghost files, README aspirational content
