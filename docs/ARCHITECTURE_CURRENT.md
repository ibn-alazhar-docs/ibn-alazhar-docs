# Architecture — Current State

> **Last updated:** 2026-06-27
> **Status:** Production-ready, security-hardened

---

## Overview

Ibn Al-Azhar Docs is an Arabic-first, RTL-first, Docker-first document processing platform for Azhar students.

**Pipeline**: PDF/Image → OCR → Cleanup → Markdown → Preview → Export

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│  Next.js 16 App Router (apps/web/)                   │
│  ├─ [locale]/(auth)/     — Login, Register            │
│  ├─ [locale]/(dashboard)/ — Main UI                   │
│  ├─ [locale]/(public)/   — Public views               │
│  └─ /api/*               — REST API (thin routes)     │
├─────────────────────────────────────────────────────┤
│  Use Cases (14 files)                                 │
│  ├─ Document*: CRUD | Move | Tag | Share              │
│  ├─ FolderUseCases                                     │
│  ├─ TagUseCases                                        │
│  ├─ SearchUseCases                                     │
│  ├─ ConversionUseCases                                 │
│  ├─ UserUseCases (paginated)                           │
│  ├─ ProfileUseCases                                    │
│  └─ ExportUseCases (recursive)                         │
├─────────────────────────────────────────────────────┤
│  Repositories (6 files + interfaces)                   │
│  ├─ document.repository.ts                             │
│  ├─ folder.repository.ts                               │
│  ├─ tag.repository.ts (implements ITagRepository)      │
│  ├─ share.repository.ts (implements IShareRepository)  │
│  └─ user.repository.ts                                 │
├─────────────────────────────────────────────────────┤
│  Composition Root                                      │
│  └─ composition-root.ts (central DI)                   │
├─────────────────────────────────────────────────────┤
│  Pipeline (packages/pipeline/)                         │
│  ├─ queue.ts — BullMQ queues                           │
│  ├─ storage.ts — MinIO/S3 (100MB cap)                  │
│  ├─ text.ts — Arabic text cleanup                      │
│  └─ ocr-provider.ts — Surya + Tesseract + Google       │
├─────────────────────────────────────────────────────┤
│  Workers                                               │
│  ├─ ocr-worker — PDF/Image → Markdown                  │
│  └─ export-worker — Documents → ZIP/PDF/DOCX           │
├─────────────────────────────────────────────────────┤
│  Infrastructure                                        │
│  ├─ PostgreSQL 16 (via PgBouncer)                      │
│  ├─ Redis 7 (BullMQ + rate limiting)                   │
│  ├─ MinIO (S3-compatible object storage)               │
│  └─ Caddy (TLS reverse proxy)                          │
└─────────────────────────────────────────────────────┘
```

## Data Flow

1. User uploads PDF/Image via web UI
2. Web layer persists metadata to DB, uploads binary to MinIO
3. Web layer enqueues OCR job in Redis (BullMQ)
4. OCR worker dequeues job, streams binary from MinIO
5. Worker executes OCR (Surya/Tesseract), generates Markdown
6. Worker updates DB state and persists Markdown to MinIO
7. Frontend receives state updates via SSE

## Key Design Decisions

| Decision  | Choice                             | Rationale                         |
| --------- | ---------------------------------- | --------------------------------- |
| Framework | Next.js 16 App Router              | SSR/SSG, React Server Components  |
| Database  | PostgreSQL 16                      | Full-text search, JSON support    |
| ORM       | Prisma (relationMode="prisma")     | Type safety, migrations           |
| Queue     | BullMQ                             | Redis-backed, reliable            |
| Storage   | MinIO                              | S3-compatible, self-hosted        |
| OCR       | Surya (local) + Tesseract + Google | Hybrid approach                   |
| Auth      | NextAuth.js v5                     | JWT, credentials + OAuth          |
| i18n      | next-intl                          | Arabic default, English available |

## Security Architecture

- **Auth**: NextAuth.js v5, Credentials provider, JWT (24h), bcryptjs (cost 12)
- **Authorization**: Ownership-based, role-based (ADMIN/STUDENT/TEACHER)
- **Input Validation**: Zod schemas on all API inputs
- **Rate Limiting**: Redis-backed with in-memory fallback, IP validation
- **CSRF**: Protection on all state-changing operations
- **CSP**: Content Security Policy headers
- **SSRF Prevention**: Protocol + hostname allowlist on external URLs
- **Python Injection Prevention**: Paths via JSON file, lang via argv + allowlist

## Testing

| Suite       | Command                 | Tests            |
| ----------- | ----------------------- | ---------------- |
| Unit        | `pnpm test`             | 673              |
| Security    | `pnpm test:security`    | 213+             |
| Integration | `pnpm test:integration` | requires DB      |
| E2E         | `npx playwright test`   | requires browser |

## Deployment

- **Development**: `./ibn.sh dev-infra` (Docker infra) + host Next.js
- **Production**: `docker compose up -d --build` (full stack)
- **Free Hosting**: HuggingFace Spaces + Neon.tech + Upstash

## Related Documentation

- [Runbook](production/RUNBOOK.md) — Incident response
- [Alerting Rules](production/ALERTING_RULES.md) — Prometheus alerts
- [Secrets Policy](production/SECRETS_POLICY.md) — Secrets management
- [Security Audit Log](SECURITY_AUDIT_LOG.md) — Security hardening details
- [HF Deployment Guide](deployment/HF_DEPLOYMENT_GUIDE.md) — Free hosting setup
- [ADRs](ADR/) — Architecture Decision Records
