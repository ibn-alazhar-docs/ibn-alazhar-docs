# PROJECT_RUNTIME.md — Ibn Al-Azhar Docs Project Context

> **Purpose:** Project-specific runtime context for AI agents.
> **Scope:** What the project is, where it stands, what constraints apply.

---

## Project Identity

- **Name:** Ibn Al-Azhar Docs — ابن الأزهر دوكس
- **Repository:** `ibn-al-azhar-docs`
- **License:** MIT
- **Type:** Progressive Web App (PWA) for educational document management and OCR conversion
- **Tagline:** في بيت كل طالب أزهري
- **Brand Promise:** محتوى تعليمي يليق بتفوق طالب الثانوية الأزهرية

---

## Problem Statement

Educational institutions in the Arab world lack integrated Arabic-capable document management tools. Teachers and researchers daily deal with scanned PDFs and document images. Existing tools are English-only, inadequate for Arabic, require expensive subscriptions, or don't work reliably on mobile devices.

---

## Solution

A PWA that transforms the proven concept from `tahweel-tauri` (desktop research app) into a browser-based platform. Users access from any device via browser with native-like experience through PWA install support. Full conversion pipeline: upload → OCR → export (TXT/DOCX/JSON). Conversion and export are separate steps. Deep Arabic support with RTL-first UI built on customized shadcn/ui components.

---

## Target Users

1. **Students & Researchers** — 5-20 files/month. Need scanned-to-text conversion for research.
2. **Teachers** — 20-100 files/month. Need bulk conversion and file sharing with students.
3. **Technical Supervisors** — Need admin dashboard with statistics and user management.

---

## Tech Stack

| Layer          | Technology                                |
| -------------- | ----------------------------------------- |
| Frontend       | Next.js 16 App Router + React 19          |
| UI             | shadcn/ui + Tailwind CSS v4               |
| State          | Zustand                                   |
| i18n           | next-intl (ar/en)                         |
| Auth           | NextAuth.js v5 (JWT strategy, 24h maxAge) |
| Database       | PostgreSQL 16 + Prisma                    |
| Object Storage | MinIO                                     |
| Queue          | BullMQ + Redis                            |
| OCR (MVP)      | Google Drive API                          |
| Reverse Proxy  | Caddy                                     |
| PWA            | @serwist/next (candidate, needs spike)    |
| Testing        | Vitest                                    |
| CI             | GitHub Actions                            |
| Local Dev      | Docker Compose                            |

---

## Current Phase

**Phase 1: Foundation**

Focus: Repository setup, Next.js app foundation, TypeScript strict, Tailwind/shadcn foundation, Cairo font, brand tokens, RTL/i18n foundation, Docker Compose local stack, PostgreSQL, Redis, MinIO, worker skeleton, Prisma setup, auth skeleton, app shell, CI baseline, .env.example, README, specs folder.

**Not in Phase 1:**

- Full OCR pipeline
- Full upload pipeline
- Production deployment
- Admin panel
- Public sharing
- Advanced search
- Full offline file access

See `memory/project/phase-1-focus.md` for details.

---

## Brand Rules

| Token          | Value     | Usage                           |
| -------------- | --------- | ------------------------------- |
| Primary Green  | `#16A34A` | Buttons, links, primary actions |
| Heritage Gold  | `#CA8A04` | Heritage accents, distinctions  |
| Dark Text Gray | `#1F2937` | Body text, headings             |
| Pure White     | `#FFFFFF` | Backgrounds, surfaces           |
| Font           | Cairo     | Primary Arabic font             |

**NOT #10B981 (Emerald).** The primary green is `#16A34A`.

See `memory/brand/brand-rules.md` for full rules.

---

## Key Constraints

1. **Arabic-first** — Arabic is the default language. English is secondary.
2. **RTL-first** — RTL is the default direction. LTR is the alternate.
3. **Docker-first** — All local development runs in containers.
4. **Docs-first** — Specs and docs drive implementation, not the reverse.
5. **Phase-gated** — No implementation before phase lock.
6. **No secrets in files** — All secrets via environment variables.
7. **Conversion ≠ Export** — Conversion extracts text. Export generates formats from conversion results.
8. **No prototype/production mixing** — Prototype hosting is separate from production hosting.
9. **No free-forever hosting claims** — The platform is free-first, not free-forever.
10. **No MVP expansion without approval** — MVP scope is locked.

---

## Key Documents

| Document                   | Path                                    | Purpose                       |
| -------------------------- | --------------------------------------- | ----------------------------- |
| Project Brief              | `docs/00_PROJECT_BRIEF.md`              | One-page project summary      |
| PRD                        | `docs/01_PRD.md`                        | Product requirements          |
| Roadmap                    | `docs/02_ROADMAP.md`                    | Product roadmap               |
| UX Spec                    | `docs/03_UX_SPEC.md`                    | User experience specification |
| Design System              | `docs/04_UI_DESIGN_SYSTEM.md`           | UI design system              |
| Technical Design           | `docs/05_TECHNICAL_DESIGN.md`           | Technical architecture        |
| API Spec                   | `docs/06_API_SPEC.md`                   | API specification             |
| Database Schema            | `docs/07_DATABASE_SCHEMA.md`            | Database schema               |
| Security & Privacy         | `docs/08_SECURITY_PRIVACY.md`           | Security requirements         |
| QA Test Plan               | `docs/09_QA_TEST_PLAN.md`               | QA and testing plan           |
| DevOps Deployment          | `docs/10_DEVOPS_DEPLOYMENT.md`          | Deployment strategy           |
| Phase 1 Plan               | `docs/13_PHASE_1_PLAN.md`               | Phase 1 execution plan        |
| MVP Scope Lock             | `docs/27_MVP_SCOPE_LOCK.md`             | Locked MVP scope              |
| Brand Implementation Guide | `docs/29_BRAND_IMPLEMENTATION_GUIDE.md` | Brand rules and tokens        |
| Spec Kit Workflow          | `docs/31_SPEC_KIT_WORKFLOW.md`          | Spec-driven workflow          |
| ADRs                       | `docs/ADR/`                             | Architecture decision records |

---

## Success Metrics

| Metric                                | Target       |
| ------------------------------------- | ------------ |
| Registered users (month 1)            | 50           |
| Conversion success rate               | > 90%        |
| Avg conversion time (10 pages)        | < 60 seconds |
| Lighthouse Performance                | > 90         |
| PWA install rate (returning visitors) | > 30%        |

---

## Risk Register (Top 5)

1. **Google Drive API quota exhaustion** — Mitigation: daily monitoring, Tesseract fallback in V2.
2. **pdfjs-dist slower than PDFium** — Mitigation: early performance tests.
3. **shadcn/ui RTL issues** — Mitigation: component-by-component testing.
4. **BullMQ operational complexity** — Mitigation: retry and error handling from day one.
5. **NextAuth.js v5 beta API changes** — Mitigation: track changelog, test on updates.

See `docs/16_RISK_REGISTER.md` for full register.
