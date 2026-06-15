# Architecture

## Overview

Monorepo (pnpm workspaces) with four main areas:

```
apps/web/          Next.js 16 App Router — main application
packages/pipeline/ OCR, queue, storage, text cleanup — shared across workers
workers/           ocr-worker, export-worker — BullMQ consumers
prisma/            Schema + migrations (PostgreSQL 16)
```

## Data Flow

```
PDF/Image → Upload → Queue → OCR → Cleanup → Markdown → Preview → Export
                      ↑                    ↑
                ocr-worker          export-worker
```

## Key Design Decisions

- **Server Components by default** in Next.js App Router; `"use client"` only for interactivity
- **No global state store** — server components + URL params
- **BullMQ** for background job queues with Redis
- **MinIO** (S3-compatible) for document storage
- **Hybrid OCR** — Surya local, Google Vision fallback
- **SSE** for real-time progress updates
- **NextAuth.js v5** with JWT (24h), bcryptjs, Credentials provider
- **Soft delete** on User, Document, Folder via `deletedAt`

## Infrastructure

Docker-first: PostgreSQL 16, Redis, MinIO all run in containers.
See `docker/docker-compose.yml` and `docker/docker-compose.dev.yml`.

## Phase Status

| Phase | Scope                                          | Status |
| ----- | ---------------------------------------------- | ------ |
| 1A–1D | Pipeline (OCR, cleanup, queue, export)         | ✅     |
| 2A    | Auth (NextAuth.js v5, JWT, roles)              | ✅     |
| 2B-1  | Folder management (5-level, soft-delete)       | ✅     |
| 2B-2  | Document org (status lifecycle, listing, bulk) | ✅     |
| 2C-1  | Search (SQL full-text, suggestions)            | ✅     |
| 2C-2  | Tags                                           | ⏳     |
