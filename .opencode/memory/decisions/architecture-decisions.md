# Memory: Architecture Decisions

> **File:** `memory/decisions/architecture-decisions.md`
> **Purpose:** Persistent summary of key architecture decisions.

---

## Active ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | PWA First | Accepted | 2025-03 |
| ADR-002 | Frontend Stack (Next.js 16 + React 19 + shadcn/ui + Tailwind v4) | Accepted | 2025-03 |
| ADR-003 | Backend Stack (Next.js API Routes) | Accepted | 2025-03 |
| ADR-004 | Database and ORM (PostgreSQL 16 + Prisma) | Accepted | 2025-03 |
| ADR-005 | Object Storage (MinIO) | Accepted | 2025-03 |
| ADR-006 | Job Queue (BullMQ + Redis) | Accepted | 2025-03 |
| ADR-007 | OCR Strategy (Google Drive API for MVP) | Accepted | 2025-03 |
| ADR-008 | Progress Updates (SSE) | Accepted | 2025-03 |
| ADR-009 | PWA Cache Boundaries | Accepted | 2025-03 |
| ADR-010 | Security Baseline | Accepted | 2025-03 |
| ADR-011 | Arabic and RTL First | Accepted | 2025-03 |
| ADR-012 | Soft Delete Retention | Accepted | 2025-03 |
| ADR-013 | Self-Hosting Free-First | Accepted | 2025-03 |
| ADR-014 | File Size Limits (100MB) | Accepted | 2025-03 |
| ADR-015 | Public Share Links | Accepted | 2025-03 |
| ADR-016 | Auth Model (NextAuth.js v5 JWT) | Accepted | 2025-03 |
| ADR-017 | Export Model (separate from Conversion) | Accepted | 2025-03 |
| ADR-018 | Hosting Strategy | Accepted | 2025-03 |
| ADR-019 | Docker Container First | Accepted | 2025-03 |
| ADR-020 | Spec Kit Workflow | Accepted | 2025-03 |
| ADR-021 | Impeccable Design Quality | Accepted | 2025-03 |

## Key Decisions Summary

### Architecture
- **PWA-first** — Browser-based with install support, not desktop app.
- **Next.js 16 App Router** — Full-stack framework with SSR.
- **Separate worker containers** — BullMQ workers run in separate Docker containers.
- **Caddy reverse proxy** — SSL termination, rate limiting, compression.

### Data
- **PostgreSQL 16** — Relational data storage.
- **Prisma ORM** — Type-safe database access.
- **MinIO** — Object storage for files.
- **Redis** — Queue, cache, pub/sub, sessions.

### Auth
- **NextAuth.js v5** — JWT strategy only, 24h maxAge.
- **No separate access/refresh tokens** — Simplified auth model.
- **Credentials provider** — Email + password (no OAuth in Phase 1).

### OCR
- **Google Drive API** — Single OCR engine for MVP.
- **Tesseract planned for V2** — Local OCR fallback.

### Design
- **Arabic-first, RTL-first** — Default language and direction.
- **Cairo font** — Primary Arabic font.
- **Brand colors** — #16A34A (green), #CA8A04 (gold), #1F2937 (gray), #FFFFFF (white).
- **shadcn/ui** — Component library, customized for brand.

### Development
- **Docker-first** — All local dev in containers.
- **Spec Kit workflow** — Specs drive implementation.
- **Phase-gated** — No phase transition without gate review.
- **CI baseline** — GitHub Actions (lint + test + build).

## Last Updated

2026-05-20
