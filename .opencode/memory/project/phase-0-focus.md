# Memory: Phase 0 Focus

> **File:** `memory/project/phase-0-focus.md`
> **Purpose:** Persistent Phase 0 scope and deliverables.

---

## Phase 0: Documentation & Planning

**Duration:** TBD
**Status:** Complete — Awaiting gate review

## Focus

Complete all documentation, specs, infrastructure planning, and governance setup before any application code is written.

## Deliverables

### Documentation

- `README.md` — Project overview and quickstart
- `docs/00_PROJECT_BRIEF.md` — Goals and scope
- `docs/01_PRD.md` — Product requirements
- `docs/02_ROADMAP.md` — Development roadmap
- `docs/03_UX_SPEC.md` — UX specification
- `docs/04_UI_DESIGN_SYSTEM.md` — UI design system
- `docs/05_TECHNICAL_DESIGN.md` — Technical architecture
- `docs/06_API_SPEC.md` — API specification
- `docs/07_DATABASE_SCHEMA.md` — Database schema (matches Prisma)
- `docs/08_SECURITY_PRIVACY.md` — Security and privacy
- `docs/09_QA_TEST_PLAN.md` — Testing strategy
- `docs/10_DEVOPS_DEPLOYMENT.md` — Deployment guide
- `docs/13_PHASE_1_PLAN.md` — Phase 1 implementation plan
- `docs/27_MVP_SCOPE_LOCK.md` — MVP boundaries

### Specs

- `specs/INDEX.md` — Spec index
- `specs/001-auth-foundation/` — Authentication & authorization
- `specs/002-app-shell-rtl/` — App shell, layout, RTL
- `specs/003-file-upload/` — File upload & management
- `specs/004-conversion-pipeline/` — Document conversion
- `specs/005-document-viewer/` — Document viewing
- `specs/006-folder-tag-management/` — Folders & tags
- `specs/007-export-download/` — Export formats
- `specs/008-user-settings-preferences/` — User settings
- `specs/009-search-filtering/` — Search & filter (Phase 2)
- `specs/010-share-links/` — Public share links (Phase 2)

### Infrastructure

- `docker-compose.dev.yml` — PostgreSQL, Redis, MinIO
- `prisma/schema.prisma` — Database schema
- `.env.example` — Environment variables

### Governance

- `governance/SOURCE_OF_TRUTH.md` — Authority hierarchy
- `governance/REPOSITORY_BOUNDARIES.md` — Write/delete boundaries
- `governance/PHASE_LOCK_POLICY.md` — Phase enforcement
- `governance/SPEC_AUTHORITY.md` — Spec hierarchy
- `governance/CHANGE_CONTROL.md` — Change rules
- `governance/AI_AGENT_EXECUTION_CONTRACT.md` — Agent rules

### Tooling

- `package.json` — Scripts and dependencies
- `tsconfig.base.json` — TypeScript configuration
- `pnpm-workspace.yaml` — Workspace configuration
- `vitest.config.ts` — Test configuration
- `.prettierrc` / `.prettierignore` — Formatting
- `.editorconfig` — Editor settings
- `.gitignore` — Git ignore rules
- `.husky/pre-commit` — Pre-commit hooks
- `scripts/secrets-scan.mjs` — Secrets scanning
- `.github/workflows/ci.yml` — CI pipeline

### Runtime

- `.opencode/` — AI agent runtime
- `AGENTS.md` — AI agent guidelines
- `CODE_STYLE.md` — Code style guide
- `SECURITY.md` — Security policy
- `CONTRIBUTING.md` — Contribution guide

## Exclusions (Not in Phase 0)

- Any application code
- UI implementation
- API implementation
- Worker implementation
- Production deployment

## Gate Criteria

See `.opencode/PHASE_GATES.md` for full Phase 0 gate criteria.

## Last Updated

2026-05-21
