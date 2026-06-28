# Ibn Al-Azhar Docs — مستندات ابن الأزهر

<div align="center">
  <img src="apps/web/public/logo.png" alt="Ibn Al-Azhar Docs Logo" width="120" />
  <h3>في بيت كل طالب أزهري</h3>
  <p><strong>Arabic-first, RTL-first, Docker-first document processing platform for Azhar students and educational workflows.</strong></p>
</div>

---

## Overview

**Ibn Al-Azhar Docs** is a document processing workspace designed to digitize and manage Arabic and English texts with high accuracy. It features an advanced pipeline that takes PDFs and images, extracts text via OCR (Tesseract with Arabic language pack), cleans the output with custom Arabic text normalization, and generates structured formats — Markdown, Word, plain text, JSON, and searchable PDF.

The platform is self-hosted and privacy-focused. All processing happens on your own infrastructure.

## Key Features

- **Arabic OCR Pipeline**: PDF/Image → Validation → Split → Tesseract OCR → Arabic Text Cleanup → Markdown → Export
- **Arabic Text Normalization**: Alef unification, tashkeel removal, tatweel stripping, bidi control character removal, OCR artifact repair, heading detection, line reconstruction
- **Document Management**: Folders (nested, max depth 5), tags, bulk operations, soft delete/restore
- **Full-Text Arabic Search**: PostgreSQL tsvector with Arabic normalization, ranked results
- **Multiple Exports**: Markdown, TXT, JSON, DOCX (via Pandoc), Searchable PDF
- **Share Links**: Time-limited sharing with token regeneration and expiration
- **Auth**: NextAuth.js with credentials + Google OAuth, bcrypt (cost 12), JWT sessions
- **Security**: CSRF protection, rate limiting, CSP, HSTS, ownership-based authorization

## Architecture

```
apps/web/           Next.js 16 (App Router, standalone output, Turbopack dev)
packages/pipeline/  Shared OCR, queue, storage, text logic (raw TypeScript — no build step)
workers/            ocr-worker, export-worker (BullMQ consumers, tsx entry)
prisma/             PostgreSQL 16 schema + migrations (relationMode = "prisma")
infrastructure/     Docker configs, Caddy, monitoring, HuggingFace deployment
```

**Infrastructure**: PostgreSQL 16 (via PgBouncer) + Redis 7 + MinIO (S3-compatible) + Caddy (TLS)

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 22.x
- pnpm 10.x

### Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start infrastructure (Postgres :5433 + Redis :6379 + MinIO :9000)
./ibn.sh dev-infra

# 4. Setup database
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 5. Start web app
pnpm --filter @ibn-al-azhar-docs/web dev
```

### Production Deployment

**Self-hosted** (Docker Compose):

```bash
cp .env.example .env  # Fill in all secrets
docker compose up -d --build
```

**Free hosting** (HuggingFace Spaces — no credit card required):
See [HF Deployment Guide](docs/deployment/HF_DEPLOYMENT_GUIDE.md) for step-by-step instructions using Neon.tech (PostgreSQL) + Upstash (Redis) + HuggingFace Spaces (hosting + OCR).

## Testing

| Command                 | Suite            | Tests | Notes                                |
| ----------------------- | ---------------- | ----- | ------------------------------------ |
| `pnpm test`             | Unit             | 783   | `tests/backend/` + `tests/frontend/` |
| `pnpm test:integration` | Integration      | —     | Requires running DB                  |
| `pnpm test:security`    | Security         | 213+  | OWASP coverage                       |
| `pnpm test:pentest`     | Penetration      | —     | Requires running DB                  |
| `pnpm test:load`        | Load             | —     | Requires running DB                  |
| `pnpm test:recovery`    | Recovery         | —     | Requires running DB                  |
| `pnpm test:backup`      | Backup & Restore | —     | Requires running DB                  |

Test files: `tests/backend/`, `tests/frontend/`, `tests/security/`, `tests/integration/`, `tests/pentest/`, `tests/load/`, `tests/recovery/`, `tests/backup/`, `tests/e2e/`

## Operations

- [Runbook](docs/production/RUNBOOK.md) — Incident response for all failure scenarios
- [Alerting Rules](docs/production/ALERTING_RULES.md) — Prometheus alert definitions
- [Secrets Policy](docs/production/SECRETS_POLICY.md) — Secrets management guidelines

## Brand

| Element        | Value                |
| -------------- | -------------------- |
| Primary Green  | `#16A34A`            |
| Heritage Gold  | `#CA8A04`            |
| Dark Text Gray | `#1F2937`            |
| Primary Font   | Cairo                |
| Tagline        | في بيت كل طالب أزهري |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow and [CODE_STYLE.md](CODE_STYLE.md) for coding standards.

## License

Copyright 2026 Ibn Al-Azhar Docs. All rights reserved.
