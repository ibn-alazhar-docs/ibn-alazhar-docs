# AI_OPERATING_RULES.md — Rules All AI Agents Must Follow

> **Purpose:** Define mandatory operating rules for all AI agents in this runtime.
> **Scope:** All agents, all sessions, all tasks.

---

## Mandatory Rules

### 1. Read Specs Before Writing Code

Never implement a feature without first reading its specification. The spec defines what to build, how to build it, and what success looks like.

**Violation:** Implementing without reading the spec.
**Consequence:** Implementation may not match requirements. Must be reworked.

---

### 2. Use Phase Terminology

Always use "Phase" terminology, not "Sprint." This is a deliberate product decision.

- Phase 1, Phase 2, Phase 3 — correct.
- Sprint 1, Sprint 2, Sprint 3 — incorrect.

**Violation:** Using sprint terminology in docs, comments, or commits.
**Consequence:** Confusion with agile terminology. Must be corrected.

---

### 3. Phase 1 Is Foundation Only

Phase 1 scope is locked to foundation. Do not implement features outside Phase 1 scope.

**Phase 1 includes:** Repo setup, Next.js foundation, TypeScript strict, Tailwind/shadcn, Cairo font, brand tokens, RTL/i18n, Docker Compose, PostgreSQL, Redis, MinIO, worker skeleton, Prisma, auth skeleton, app shell, CI baseline, .env.example, README, specs folder.

**Phase 1 excludes:** Full OCR pipeline, full upload pipeline, production deployment, admin panel, public sharing, advanced search, full offline file access, enterprise features.

**Violation:** Implementing Phase 2+ features in Phase 1.
**Consequence:** Scope creep. Must be reverted.

---

### 4. Do Not Expand MVP Without Approval

MVP scope is locked in `docs/27_MVP_SCOPE_LOCK.md`. Any expansion requires Product Lead + Tech Lead approval.

**Violation:** Adding features to MVP without documented approval.
**Consequence:** Scope creep. Must be reverted.

---

### 5. Arabic-First and RTL-First

Arabic is the default language. RTL is the default direction. Every UI decision starts from Arabic/RTL, not from English/LTR.

**Violation:** Building LTR-first and adding RTL as an afterthought.
**Consequence:** RTL bugs, poor Arabic UX. Must be reworked.

---

### 6. Use Official Brand Colors

| Color | Value | Note |
|-------|-------|------|
| Primary Green | `#16A34A` | NOT `#10B981` (Emerald) |
| Heritage Gold | `#CA8A04` | |
| Dark Text Gray | `#1F2937` | |
| Pure White | `#FFFFFF` | |

**Violation:** Using wrong brand colors.
**Consequence:** Brand inconsistency. Must be corrected.

---

### 7. Docker-First Local Development

All local development runs in Docker Compose. No local service installations.

**Violation:** Requiring local PostgreSQL/Redis/MinIO installation.
**Consequence:** Inconsistent dev environments. Must be fixed.

---

### 8. Conversion ≠ Export

- **Conversion** extracts canonical text/data from source files (OCR).
- **Export** generates TXT/DOCX/JSON outputs from canonical results.

These are separate steps. Do not conflate them.

**Violation:** Mixing conversion and export logic.
**Consequence:** Architectural confusion. Must be separated.

---

### 9. No Prototype/Production Mixing

Prototype hosting and production hosting are separate. Do not mix them.

**Violation:** Using prototype hosting for production or vice versa.
**Consequence:** Unreliable infrastructure. Must be separated.

---

### 10. No Free-Forever Hosting Claims

The platform is free-first, not free-forever. Do not claim free-forever hosting.

**Violation:** Claiming the platform will always be free.
**Consequence:** Misleading users. Must be corrected.

---

### 11. No Secrets in Files

All secrets (API keys, passwords, tokens) must be in environment variables. Never commit secrets to the repository.

**Violation:** Hardcoded secrets in code or config.
**Consequence:** Security breach. Must be rotated immediately.

---

### 12. No Unrelated File Changes

Do not modify many unrelated files without explaining why. Changes should be focused and minimal.

**Violation:** Modifying 20 files for a 1-line change.
**Consequence:** Review difficulty, merge conflicts. Must be justified.

---

### 13. ADR Before Architecture Changes

Before changing architecture, create or update an ADR in `docs/ADR/`.

**Violation:** Changing architecture without documenting the decision.
**Consequence:** Lost context, inconsistent decisions. Must be documented.

---

### 14. Prisma Schema Before DB Changes

Before database changes, update the Prisma schema and migration notes.

**Violation:** Changing database without updating Prisma schema.
**Consequence:** Schema drift, migration failures. Must be corrected.

---

### 15. API Spec Before API Changes

Before API changes, update the API contract/spec in `docs/06_API_SPEC.md`.

**Violation:** Changing API without updating spec.
**Consequence:** API drift, client breakage. Must be corrected.

---

### 16. Define UI States Before UI Pages

Before UI pages, define empty/loading/error/success states.

**Violation:** Building UI without defining all states.
**Consequence:** Incomplete UX. Must be completed.

---

### 17. Tests or Test Plan for Every Feature

Every feature must have tests or a clear test plan.

**Violation:** Shipping features without tests or test plan.
**Consequence:** Unverified functionality. Must be tested.

---

### 18. Small Changes Over Giant Rewrites

Prefer small, reviewable changes over giant rewrites.

**Violation:** Rewriting 50 files in one PR.
**Consequence:** Review impossibility, high risk. Must be split.

---

### 19. Use Context7 for Library Docs

When touching unfamiliar APIs or libraries, use Context7 for up-to-date documentation.

**Violation:** Guessing library APIs or using outdated patterns.
**Consequence:** Incorrect implementation. Must be corrected.

---

### 20. Use Playwright for UI Verification

When UI exists, use Playwright MCP for browser/UI/RTL/responsive verification.

**Violation:** Claiming UI works without verification.
**Consequence:** Unverified UI. Must be tested.

---

## Rule Enforcement

| Rule | Enforced By |
|------|------------|
| 1-4 | Spec-guardian agent |
| 5 | RTL-auditor agent |
| 6 | Frontend-polish agent |
| 7 | Docker-auditor agent |
| 8-9 | Architect agent |
| 10 | Docs-sync agent |
| 11 | Security-reviewer agent |
| 12-18 | All agents + human review |
| 19-20 | Human engineer + tool usage |
