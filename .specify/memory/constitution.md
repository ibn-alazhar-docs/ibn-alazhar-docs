# Ibn Al-Azhar Docs Constitution
<!-- Project: ابن الأزهر دوكس — Islamic document digitization platform -->

## Core Principles

### I. Spec-First Development

All features begin with a written specification. No production code is written before reading the relevant spec. Every implementation task must reference a spec section. Specs define empty/loading/error/success states before UI pages are created.

### II. Phase-Foundation Delivery

Work is organized into Phases, not Sprints. Phase 1 is strictly foundation-only. Scope expansion beyond MVP requires explicit stakeholder approval. Phase terminology is mandatory in all planning and communication.

### III. Arabic-First and RTL-First

All UI surfaces must be designed Arabic-first with RTL layout as the default. Non-Arabic content must not degrade RTL quality. Brand tokens (Cairo font, Primary Green #16A34A, Heritage Gold #CA8A04, Dark Text Gray #1F2937, Pure White #FFFFFF) are mandatory across all visual output.

### IV. Docker-First Local Development

Local development environment MUST run via Docker Compose. No local installation of databases, queues, or object storage is permitted. Production parity between local and deployed environments is non-negotiable.

### V. Separation of Concerns

Conversion (extracting canonical text/data from source files) and Export (generating TXT/DOCX/JSON/PDF outputs from canonical results) are separate operations. Prototype hosting and production hosting are separate. Security review gates apply to all features touching auth, uploads, or permissions.

### VI. Quality Gates

Every feature must have tests or a documented test plan. Before DB changes: update Prisma schema and migration notes. Before API changes: update API contract/spec. Before architecture changes: create or update an ADR. UI pages require defined empty/loading/error/success states. Small, reviewable changes are preferred over giant rewrites.

### VII. Security and Secrets

Secrets MUST NOT be stored in files. Environment variables and secrets management tools are the only permitted approach. Auth, sessions, file uploads, sharing links, and permissions require dedicated security review before implementation. Do not claim free-forever hosting in any documentation.

## Phase Boundaries

**Phase 1 Allowed**: Repo setup, Next.js app foundation, TypeScript strict, Tailwind/shadcn, Cairo font, brand tokens, RTL/i18n, Docker Compose local stack, PostgreSQL, Redis, MinIO, worker skeleton, Prisma setup, auth skeleton, app shell, CI baseline, .env.example, README, specs folder.

**Phase 1 NOT Allowed**: Full OCR pipeline, full upload pipeline, production deployment, admin panel, public sharing, advanced search, full offline file access, enterprise features.

## Development Workflow

All tasks follow this sequence:
1. Read relevant docs/specs first
2. State the intended scope
3. Produce a short implementation plan
4. Make minimal focused changes
5. Run relevant checks
6. Summarize changed files
7. Mention risks and follow-ups

Context7 is used for up-to-date library documentation when touching unfamiliar APIs. Playwright MCP is used for browser/UI/RTL/responsive verification when UI exists.

## Governance

**Versioning**: Semantic versioning (MAJOR.MINOR.PATCH) applies to this constitution.
- MAJOR: Backward-incompatible governance changes, principle removals or redefinitions.
- MINOR: New principle or section added, materially expanded guidance.
- PATCH: Clarifications, wording, typo fixes, non-semantic refinements.

**Amendment Procedure**:
1. Proposed changes must be documented in the spec sync process before implementation.
2. Major and Minor amendments require explicit approval before merging.
3. All PRs and reviews must verify constitution compliance.
4. Complexity must be justified against simpler alternatives.

**Compliance Review**: Before any implementation, `ibn-spec-sync` skill must be invoked to verify alignment with this constitution. Phase-lock decisions use `ibn-phase-lock` skill. Security-sensitive changes require `ibn-security-review`.

**Runtime Guidance**: See CLAUDE.md for day-to-day development guidance. See docs/27_MVP_SCOPE_LOCK.md, docs/13_PHASE_1_PLAN.md, docs/31_SPEC_KIT_WORKFLOW.md, docs/04_UI_DESIGN_SYSTEM.md, docs/29_BRAND_IMPLEMENTATION_GUIDE.md, docs/05_TECHNICAL_DESIGN.md, docs/10_DEVOPS_DEPLOYMENT.md, and docs/25_GO_NO_GO_REVIEW.md for contextual reference.

**Version**: 0.2.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-18