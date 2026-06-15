# 01_EXECUTION_MASTERPLAN — خطة التنفيذ الرئيسية

> **التاريخ:** 2026-05-24
> **الغرض:** Phase 1 execution rules, architectural boundaries, and operational framework
> **المُعد:** Lead Bootstrap Engineer

---

## 1. Phase 1 GOALS

| #   | Goal                          | Exit Criteria                                                             |
| --- | ----------------------------- | ------------------------------------------------------------------------- |
| 1   | **Next.js 16 app scaffold**   | `apps/web/` with package.json, tsconfig, next.config, App Router skeleton |
| 2   | **Docker dev stack running**  | PostgreSQL + Redis + MinIO healthy via `pnpm docker:up`                   |
| 3   | **Prisma schema + migration** | All tables created, seed script creates admin user                        |
| 4   | **Auth skeleton**             | NextAuth.js v5 JWT (24h), register + login pages, middleware              |
| 5   | **RTL/i18n foundation**       | Arabic as default, next-intl, ar.json + en.json                           |
| 6   | **Design system tokens**      | brand.css with colors, typography, spacing — Cairo font                   |
| 7   | **App Shell**                 | Sidebar + Header + responsive dashboard layout                            |
| 8   | **Zustand stores**            | authStore + uiStore with persistence                                      |
| 9   | **CI pipeline**               | GitHub Actions: lint + typecheck + test                                   |
| 10  | **≥5 passing unit tests**     | Vitest confirms auth and utility functions                                |

## 2. LOCKED SCOPE ASSUMPTIONS

> These assumptions are locked per `docs/27_MVP_SCOPE_LOCK.md` and governance policies.

### IN SCOPE (Phase 1 only)

- Monorepo scaffold (apps/web, packages/db, packages/shared)
- Docker Compose (PostgreSQL, Redis, MinIO — named `ibn-al-azhar-docs-*`)
- Prisma schema with User, Account, Session, Document, Folder, Tag, ConversionJob
- NextAuth.js v5 — **Credentials only**, JWT strategy (24h maxAge)
- Arabic-first RTL: next-intl with `ar` as default locale
- Design tokens: brand colors (#16A34A, #CA8A04, #1F2937), Cairo font
- App Shell: Sidebar + Header + responsive layout
- Zustand: authStore + uiStore (persisted)
- CI: GitHub Actions (lint + typecheck + vitest)
- Vitest: ≥5 passing tests
- README + .env.example + all foundational configs

### OUT OF SCOPE

| Feature                | Reason                        | Target  |
| ---------------------- | ----------------------------- | ------- |
| File upload            | Depends on File Management UI | Phase 2 |
| OCR pipeline           | Depends on Upload + BullMQ    | Phase 3 |
| Export (TXT/DOCX/JSON) | Depends on Conversion         | Phase 3 |
| Admin panel            | Depends on Auth + Data        | Phase 2 |
| Sharing                | Depends on Conversion         | Phase 3 |
| Search                 | Depends on File Management    | Phase 2 |
| PWA / Service Worker   | Depends on Layout             | Phase 2 |
| Dark mode              | Design polish                 | Phase 2 |
| Google OAuth           | Security hardening            | Phase 2 |
| Forgot password        | Auth epic                     | Phase 2 |
| Email verification     | Auth epic                     | Phase 2 |

## 3. EXECUTION RULES

### 3.1 Spec-First

- Every feature must have an approved `spec.md` in `specs/NNN-name/`
- No implementation before spec approval
- Specs override docs if conflicting

### 3.2 Phase-Locked

- No Phase 2 code during Phase 1
- Phase transitions require governance gate approval (`governance/PHASE_LOCK_POLICY.md`)
- Track all changes in `docs/19_DECISION_LOG.md`

### 3.3 Docker-First

- All services run in containers
- Dev environment = Production environment
- One command to start everything: `pnpm docker:up`

### 3.4 Arabic-First, RTL-First

- Default UI language: Arabic
- Default text direction: RTL
- English as secondary (LTR)
- All layouts tested in both directions

### 3.5 Security-Aware

- No secrets in committed code
- All inputs validated via Zod
- HTTP security headers on every response
- Secrets scan on every commit (husky)

## 4. ARCHITECTURAL BOUNDARIES

### 4.1 Dependency Direction

```
apps/web → packages/shared → nothing
apps/web → packages/db → prisma
apps/worker → packages/shared → nothing
apps/worker → packages/db → prisma
```

- `apps/web` NEVER imports from `apps/worker` directly
- Communication between web and worker is via Redis PubSub + BullMQ
- `packages/*` NEVER imports from `apps/*`

### 4.2 Module Boundaries

| Directory              | Responsibility      | May Import From                                             |
| ---------------------- | ------------------- | ----------------------------------------------------------- |
| `apps/web/app/`        | Pages + API routes  | `@/components`, `@/lib`, `@/stores`, `@ibn-al-azhar-docs/*` |
| `apps/web/components/` | React components    | `@/lib`, `@/stores`, `@ibn-al-azhar-docs/*`                 |
| `apps/web/lib/`        | Utilities + clients | `@ibn-al-azhar-docs/*`                                      |
| `apps/web/stores/`     | Zustand stores      | `@ibn-al-azhar-docs/*`                                      |
| `apps/web/validators/` | Zod schemas         | Nothing from apps                                           |
| `apps/web/services/`   | Business logic      | `@/lib`, `@ibn-al-azhar-docs/*`                             |
| `packages/shared/`     | Types + constants   | External deps only (zod)                                    |
| `packages/db/`         | Prisma client       | Prisma, `@ibn-al-azhar-docs/shared`                         |
| `workers/converter/`   | OCR processing      | `@ibn-al-azhar-docs/*`                                      |
| `workers/exporter/`    | Export processing   | `@ibn-al-azhar-docs/*`                                      |

### 4.3 Naming Conventions

| Artifact          | Convention             | Example                            |
| ----------------- | ---------------------- | ---------------------------------- |
| Packages          | `@ibn-al-azhar-docs/*` | `@ibn-al-azhar-docs/shared`        |
| Database          | `ibn_al_azhar_docs`    | Schema name                        |
| Docker containers | `ibn-al-azhar-docs-*`  | `ibn-al-azhar-docs-postgres`       |
| S3 buckets        | `ibn-al-azhar-docs-*`  | `ibn-al-azhar-docs-files`          |
| Zustand persist   | `ibn-al-azhar-docs-*`  | `ibn-al-azhar-docs-ui-preferences` |
| Environment vars  | `UPPER_SNAKE_CASE`     | `DATABASE_URL`                     |

## 5. GIT WORKFLOW

### 5.1 Branch Strategy

```
main          # Protected — requires PR + passing CI
├── feat/*    # New features (e.g., feat/auth-foundation)
├── fix/*     # Bug fixes
├── docs/*    # Documentation only
└── infra/*   # Infrastructure/tooling changes
```

### 5.2 Commit Conventions

```
<type>(<scope>): <description>

Types: feat, fix, docs, infra, chore, refactor, test
Scope: web, worker, db, docker, docs, specs, governance, ci
```

### 5.3 PR Requirements

- [ ] All CI checks pass (lint + typecheck + test)
- [ ] At least 1 reviewer approved
- [ ] No `any` types without justification
- [ ] Arabic/RTL considerations documented (if UI change)
- [ ] Spec compliance verified (if feature change)

## 6. DEFINITION OF DONE

### For Code

- [ ] ESLint passes (0 warnings)
- [ ] TypeScript typecheck passes (0 errors)
- [ ] No `console.log` (use logger or remove)
- [ ] Environment variables documented in `.env.example`
- [ ] No hardcoded secrets or URLs

### For Tests

- [ ] Unit tests for new functions (≥80% coverage for new code)
- [ ] `vitest run` passes
- [ ] Manual test on Chrome + Firefox (for UI changes)

### For Integration

- [ ] `pnpm docker:up` works without errors
- [ ] `pnpm lint && pnpm typecheck && pnpm test` passes
- [ ] CI pipeline succeeds on PR

### For Documentation

- [ ] README updated if setup changed
- [ ] ADR created/updated for architectural decisions
- [ ] Spec updated if implementation diverged

## 7. REVIEW GATES

| Gate            | Trigger                  | Reviewer      | SLA     |
| --------------- | ------------------------ | ------------- | ------- |
| Code Review     | PR created               | 1 maintainer  | 48h     |
| Security Review | Auth/crypto/data changes | Security lead | 24h     |
| Spec Review     | New spec                 | Tech lead     | 1 week  |
| Phase Gate      | Phase transition         | Full team     | 2 weeks |
| ADR Review      | Architecture decision    | Tech lead     | 1 week  |

## 8. AI-AGENT OPERATING RULES

### 8.1 Session Protocol

```
Load Context → Read Specs → Execute Task → Verify → Log → End
```

### 8.2 Rules

1. **Read before writing** — always read relevant files before making changes
2. **Respect phase locks** — no Phase 2 code during Phase 1
3. **Minimal changes** — never refactor beyond what the task requires
4. **No hallucination** — all claims must be verifiable
5. **Canonical sources only** — use `docs/`, `specs/`, `governance/` not `archive/`
6. **Verify after changes** — run lint + typecheck + test
7. **Log decisions** — update `docs/19_DECISION_LOG.md` for significant choices

### 8.3 Prohibited

- Writing features outside current phase scope
- Committing secrets, keys, or credentials
- Deleting files without verification
- Ignoring governance policies
- Using archived docs as active references

## 9. DEPLOYMENT WORKFLOW

### Local Development

```
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

### Preview Deployment

```
git push origin feat/my-feature
→ GitHub Actions CI runs lint + typecheck + test
→ Preview deploy (future: Vercel / self-hosted)
```

### Production Deployment

```
git checkout main
→ GitHub Actions CI runs full pipeline
→ Docker build + push to registry
→ Deploy to production host
```

## 10. PHASE 1 EXECUTION ORDER

| Step | Task                                           | Depends On |
| ---- | ---------------------------------------------- | ---------- |
| 1    | Workspace scaffold (dirs, configs, workspaces) | —          |
| 2    | Docker infrastructure (compose, volumes)       | —          |
| 3    | Prisma schema + db package                     | Step 2     |
| 4    | Next.js app scaffold                           | Step 1     |
| 5    | Design tokens + Tailwind + Cairo font          | Step 4     |
| 6    | i18n setup (next-intl)                         | Step 5     |
| 7    | Auth skeleton (NextAuth.js)                    | Steps 3, 6 |
| 8    | App Shell (Sidebar + Header + layout)          | Steps 5, 6 |
| 9    | Zustand stores (auth + ui)                     | Step 7     |
| 10   | CI pipeline + tests                            | Steps 4–9  |
| 11   | Phase 1 verification + demo                    | All above  |
