# Memory: Phase 1 Focus

> **File:** `memory/project/phase-1-focus.md`
> **Purpose:** Persistent Phase 1 scope and deliverables.

---

## Phase 1: Foundation

**Duration:** 5 days (Week 1)
**Status:** In Progress

## Focus

Establish the technical and design foundation for Ibn Al-Azhar Docs using Docker-first, Spec-Driven Development, and brand-aligned UI foundations.

## Deliverables

### Infrastructure

- Docker Compose dev stack (PostgreSQL, Redis, MinIO)
- Container naming: `ibn-al-azhar-docs-*`
- `.env.example` complete

### Application

- Next.js 16 with TypeScript strict
- Tailwind CSS v4 + shadcn/ui initialized
- Cairo font loaded
- Brand tokens defined (#16A34A, #CA8A04, #1F2937, #FFFFFF)

### i18n / RTL

- next-intl configured (ar/en)
- Arabic default locale
- RTL default direction
- Language switch working

### Auth

- NextAuth.js v5 (JWT strategy, 24h maxAge)
- Credentials provider
- Auth pages (ar/en)
- Middleware protecting routes

### Database

- Prisma schema defined
- Initial migration applied
- Seed script creates admin user

### App Shell

- Dashboard layout (Sidebar + Header + Content)
- Responsive behavior (mobile hamburger)
- Navigation between pages

### State Management

- authStore (Zustand)
- uiStore (Zustand, persisted)

### CI/CD

- GitHub Actions (lint + test + build)
- Branch protection

### Documentation

- README with Docker-first quickstart
- `.opencode/` runtime populated
- Specs folder structure
- ADRs for key decisions

## Exclusions (Not in Phase 1)

- Full OCR pipeline
- Full upload pipeline
- Production deployment
- Admin panel
- Public sharing
- Advanced search
- Full offline file access
- Dark mode

## Gate Criteria

See `PHASE_GATES.md` for full Phase 1 gate criteria.

## Last Updated

2026-05-20
