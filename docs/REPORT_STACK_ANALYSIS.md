# REPORT_STACK_ANALYSIS — تحليل المكدس التقني

> **التاريخ:** 2026-05-24
> **البند:** Stack Detection & Validation

---

## 1. FRONTEND FRAMEWORK

| Property   | Value                                                                                    | Evidence                                                        |
| ---------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Framework  | **Next.js 16**                                                                           | `docs/00_PROJECT_BRIEF.md`, `docs/01_PRD.md`, ADR-002           |
| UI Library | **shadcn/ui** (Radix UI + Tailwind)                                                      | ADR-003, `docs/04_UI_DESIGN_SYSTEM.md`                          |
| CSS        | **Tailwind CSS v4**                                                                      | ADR-004, `BRAND_IMPLEMENTATION_GUIDE.md`                        |
| State      | **Zustand + immer**                                                                      | ADR-012                                                         |
| i18n       | **next-intl**                                                                            | ADR-013, ar.json/en.json templates in `docs/13_PHASE_1_PLAN.md` |
| PWA        | **@serwist/next** (proposal)                                                             | Decision V4-07 — needs spike                                    |
| **Status** | Framework declared, **NO CODE EXISTS**. No `apps/web/package.json`, no `next.config.ts`. |

## 2. PACKAGE MANAGER

| Property      | Value                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Manager       | **pnpm 10.33.4**                                                                                                   |
| Lock file     | `pnpm-lock.yaml` (715 bytes — essentially empty)                                                                   |
| Workspace     | `pnpm-workspace.yaml` with `apps/*`, `packages/*`, `workers/*`                                                     |
| Engine strict | Yes — `.npmrc` has `engine-strict=true`                                                                            |
| **Status**    | Declared correctly, but lock file suggests incomplete install. 890MB `node_modules/` exists but likely from cache. |

## 3. BACKEND / DATABASE

| Property       | Value                                                                                                       | Evidence                               |
| -------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Database       | **PostgreSQL 16**                                                                                           | ADR-005, `docker-compose.dev.yml`      |
| ORM            | **Prisma 6.5**                                                                                              | ADR-006, `prisma/schema.prisma` exists |
| Object Storage | **MinIO** (S3-compatible)                                                                                   | ADR-007, `docker-compose.dev.yml`      |
| Queue          | **BullMQ + Redis 7**                                                                                        | ADR-008, ADR-006                       |
| Cache          | Redis 7                                                                                                     | `docker-compose.dev.yml`               |
| **Status**     | DB schema exists (`prisma/schema.prisma`, 245 lines). Docker compose for infra exists. No backend app code. |

## 4. BACKEND LANGUAGE / RUNTIME

| Property   | Value                                                                          |
| ---------- | ------------------------------------------------------------------------------ |
| Runtime    | **Node.js 22.x**                                                               |
| Language   | **TypeScript strict**                                                          |
| Validation | **Zod**                                                                        |
| Logging    | **pino** (declared by ADR-020, not installed)                                  |
| **Status** | TypeScript config exists (`tsconfig.base.json`). No Zod, pino in dependencies. |

## 5. TESTING STACK

| Property         | Value                                                                                        | Evidence           |
| ---------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| Unit/Integration | **Vitest** (`vitest.config.ts` exists)                                                       | ADR-014, ADR-023   |
| E2E              | **Playwright**                                                                               | ADR-014, ADR-023   |
| Coverage         | **v8** (Vitest built-in)                                                                     | `vitest.config.ts` |
| **Status**       | Vitest config exists. Playwright config referenced in docs but not installed. No test files. |

## 6. LINTING / FORMATTING

| Property     | Value                                                 | Status                                                                       |
| ------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Formatter    | **Prettier 3.6.2**                                    | Config exists (`.prettierrc`, `.prettierignore`). Installed in node_modules. |
| Linter       | **ESLint**                                            | **MISSING** — no config, not in devDependencies                              |
| Type Checker | **TypeScript 5.9.3**                                  | Config exists (`tsconfig.base.json`). Installed in node_modules.             |
| Pre-commit   | **Husky**                                             | Installed. Hook runs secrets-scan only.                                      |
| **Status**   | Formatter OK, linter MISSING, typecheck OK, CI empty. |

## 7. CI/CD ASSUMPTIONS

| Property    | Value                                              | Status                                                      |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------- |
| CI Platform | **GitHub Actions**                                 | `.github/workflows/` exists                                 |
| Workflows   | ci.yml, lint.yml, typecheck.yml                    | **All empty** (0 bytes)                                     |
| Code Review | **CodeRabbit**                                     | `.coderabbit.yaml` exists (169 lines, comprehensive config) |
| PR Template | Exists                                             | `.github/pull_request_template/default.md`                  |
| **Status**  | CI infrastructure declared but **non-functional**. |

## 8. DESIGN TOOLING

| Property      | Value                                                             | Status                                       |
| ------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| Design System | Custom tokens + shadcn/ui                                         | `brand.css` exists at `apps/web/src/styles/` |
| Font          | **Cairo** (400, 700, 800)                                         | Declared in brand docs                       |
| Brand Colors  | `#16A34A` primary, `#CA8A04` gold, `#1F2937` text                 | Declared                                     |
| Animation     | Not declared                                                      | —                                            |
| Iconography   | Not declared                                                      | —                                            |
| **Status**    | Design tokens CSS exists. Font/color declared. No component code. |

## 9. DEPLOYMENT STACK

| Property      | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| Container     | **Docker** (Docker-first)                                         |
| Reverse Proxy | **Caddy 2**                                                       |
| Hosting       | **Self-hosted** (free-first, not free-forever)                    |
| Monitoring    | Prometheus + Sentry + Uptime Kuma (ADR-024)                       |
| **Status**    | Docker compose for dev exists. Nothing for prod. No Caddy config. |

## 10. AI / AGENT TOOLING

| Property          | Value                                                                                                 | Status                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Agent Platform    | **OpenCode**                                                                                          | `.opencode/` fully configured with 50+ files            |
| Skills            | Multiple skills (brand, rtl, security, speckit, etc.)                                                 | `skills-lock.json` exists                               |
| Agent Definitions | 9 agent types defined                                                                                 | `.opencode/agents/*.md`                                 |
| MCP Config        | 3 MCP tool configs                                                                                    | `.opencode/mcp/` (context7, docker, playwright, github) |
| Spec Kit          | Fully configured                                                                                      | `.specify/` with workflows, templates, memory           |
| **Status**        | AI tooling is the **most mature** part of the project. OpenCode runtime ~60+ files, fully configured. |

---

## STACK MATURITY RATING

| Layer                 | Maturity       | Notes                                          |
| --------------------- | -------------- | ---------------------------------------------- |
| Declared architecture | ✅ HIGH        | 24 ADRs, 10 specs, comprehensive docs          |
| AI/Agent tooling      | ✅ HIGH        | OpenCode fully configured                      |
| Docker/infrastructure | 🟡 MEDIUM      | Dev compose works, no prod setup               |
| DB schema             | 🟡 MEDIUM      | Prisma schema exists, no migrations run        |
| Design tokens         | 🟡 MEDIUM      | brand.css exists, not used in any component    |
| Formatting            | 🟡 MEDIUM      | Prettier set up, no ESLint                     |
| Linting               | ❌ MISSING     | No ESLint                                      |
| Testing setup         | ❌ NOT READY   | Vitest config exists, no tests, no Playwright  |
| CI/CD                 | ❌ BROKEN      | Empty workflow files                           |
| App scaffolding       | ❌ NOT STARTED | No `package.json` in `apps/web/`               |
| Package scaffold      | ❌ MISSING     | `packages/shared/`, `packages/ui/` don't exist |
| Workers               | ❌ MISSING     | `workers/` directory doesn't exist             |
| License               | ❌ MISSING     | No LICENSE file                                |

---

## VERDICT

The project has **excellent documentation and AI-tooling maturity** but **zero application code, broken CI, and missing foundational scaffolding**. Phase 1 is declared in docs but the repository is not ready to begin execution.
