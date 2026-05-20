# PHASE_GATES.md — Phase Gate Enforcement Rules

> **Purpose:** Define phase gate structure, criteria, and enforcement.
> **Scope:** All phases of Ibn Al-Azhar Docs development.

---

## What Is a Phase Gate?

A phase gate is a formal review checkpoint between phases. It verifies that the current phase is complete, correct, and ready for the next phase to begin.

**Phase gates are mandatory.** No phase transition occurs without a gate review.

---

## Gate Structure

Each gate review produces a gate decision document:

```markdown
# Phase Gate: Phase N → Phase N+1

- Date: YYYY-MM-DD
- Reviewer: [name/agent]
- Status: PASS | FAIL | CONDITIONAL

## Deliverables Checklist
- [ ] Deliverable 1
- [ ] Deliverable 2
- ...

## Blocking Issues
- None | [list]

## Conditional Requirements
- None | [list with deadline]

## Decision
[Pass / Fail / Conditional with conditions]
```

**Template:** `templates/phase-gate-template.md`

---

## Phase 1 Gate Criteria

Phase 1 is the foundation phase. Gate review verifies:

### Infrastructure
- [ ] `docker compose up` starts all services (PostgreSQL, Redis, MinIO)
- [ ] Container naming convention: `ibn-al-azhar-docs-*`
- [ ] Health checks configured and passing
- [ ] `.env.example` is complete

### Application
- [ ] Next.js 16 app boots without errors
- [ ] TypeScript strict mode enabled
- [ ] Tailwind CSS v4 configured
- [ ] shadcn/ui initialized
- [ ] Cairo font loaded
- [ ] Brand tokens defined (#16A34A, #CA8A04, #1F2937, #FFFFFF)

### i18n / RTL
- [ ] next-intl configured (ar/en)
- [ ] Arabic is default locale
- [ ] RTL is default direction
- [ ] Language switch works

### Auth
- [ ] NextAuth.js v5 configured (JWT strategy, 24h)
- [ ] Credentials provider working
- [ ] Auth pages render (ar/en)
- [ ] Middleware protects routes

### Database
- [ ] Prisma schema defined
- [ ] Initial migration applied
- [ ] Seed script creates admin user
- [ ] Prisma Studio accessible

### App Shell
- [ ] Dashboard layout (Sidebar + Header + Content)
- [ ] Responsive behavior (mobile hamburger)
- [ ] Navigation between pages

### State Management
- [ ] authStore (Zustand)
- [ ] uiStore (Zustand, persisted)

### CI/CD
- [ ] GitHub Actions workflow (lint + test + build)
- [ ] CI passes on main branch
- [ ] Branch protection configured

### Documentation
- [ ] README with Docker-first quickstart
- [ ] `.opencode/` runtime populated
- [ ] Specs folder structure created
- [ ] ADRs created for key decisions

### Quality
- [ ] ESLint passes (no errors)
- [ ] TypeScript typecheck passes (no errors)
- [ ] ≥5 Vitest tests pass
- [ ] No secrets in repository

---

## Phase 2 Gate Criteria (Preview)

Phase 2 covers file upload and management. Gate review will verify:

- [ ] File upload (PDF + JPG/PNG, 100MB limit)
- [ ] MinIO storage integration
- [ ] File listing with sorting and filtering
- [ ] Folder hierarchy (create, rename, delete, move)
- [ ] Soft delete + trash recovery
- [ ] File rename + download
- [ ] Basic search (file/folder names)
- [ ] All Phase 1 criteria still pass

---

## Gate Enforcement

### Who Runs the Gate?
1. **Architect agent** — Runs automated checks, produces draft gate report.
2. **Human engineer** — Reviews draft, confirms findings, records decision.

### Gate Decision Types
| Decision | Meaning |
|----------|---------|
| PASS | All criteria met. Next phase authorized. |
| FAIL | Blocking issues exist. Next phase not authorized. |
| CONDITIONAL | Non-blocking issues exist. Next phase authorized with conditions. |

### Gate Record
All gate decisions are recorded in:
- `docs/19_DECISION_LOG.md`
- Gate decision document in `reviews/`
- `memory/project/current-status.md` updated

### Gate Failure Protocol
1. Identify all blocking issues.
2. Create remediation tasks.
3. Assign owners and deadlines.
4. Schedule re-review.
5. Do not start next phase until gate passes.

---

## Phase Scope Lock

Once a phase gate passes, the phase scope is **locked**. Changes to scope require:

1. Open question in `docs/18_OPEN_QUESTIONS.md`.
2. Discussion and decision.
3. Update to relevant scope document.
4. Approval from Product Lead + Tech Lead (for MVP scope).

**Rule:** No scope expansion without documented approval.

---

## Gate History

| Gate | Date | Status | Notes |
|------|------|--------|-------|
| Phase 1 → Phase 2 | TBD | Pending | Phase 1 in progress |
