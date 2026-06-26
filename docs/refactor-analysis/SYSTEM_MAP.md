# SYSTEM_MAP.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Complete system topology — modules, services, ownership, data flow
> **System:** Ibn Al-Azhar Docs
> **Methodology:** Mazen Canda Refactor — Phase 0/1

---

## 1. System Overview

Arabic-first, RTL-first, Docker-first document processing platform for Al-Azhar University students. Converts PDF/images → OCR → cleanup → Markdown → export.

**Three workspaces, one deployment:**

- `apps/web/` — Next.js 16 App Router (UI + API)
- `packages/pipeline/` — Shared OCR, queue, storage, text logic (raw TypeScript)
- `workers/` — ocr-worker, export-worker (BullMQ consumers, tsx entry)

---

## 2. Module Map

### 2.1 Web App (`apps/web/`)

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── [locale]/           # i18n-routed pages
│   │   ├── (auth)/         # login, register
│   │   ├── (dashboard)/    # files, folders, tags, search, conversions, settings, users, preview
│   │   └── (public)/       # shared document view
│   ├── api/                # REST API endpoints
│   │   ├── auth/           # NextAuth.js handlers
│   │   ├── conversion/     # start, list, status
│   │   ├── documents/      # CRUD, bulk-move, bulk-tag, bulk-untag
│   │   ├── export/         # single, batch, folder, tag export
│   │   ├── folders/        # CRUD, move, restore, tree, tags
│   │   ├── health/         # liveness, readiness
│   │   ├── metrics/        # Prometheus metrics
│   │   ├── profile/        # user profile
│   │   ├── search/         # full-text search + suggestions
│   │   ├── share/          # shared document access
│   │   ├── stream/         # SSE progress streaming
│   │   ├── tags/           # CRUD, merge
│   │   ├── upload/         # file upload
│   │   └── users/          # admin user management
│   ├── error.tsx           # Global error boundary
│   ├── layout.tsx          # Root layout
│   ├── not-found.tsx       # 404
│   └── robots.ts, sitemap.ts, manifest.ts
├── core/                   # Application layer (USE CASES + REPOSITORIES)
│   ├── composition-root.ts # DI wiring — repos + use-cases
│   ├── repositories/       # Prisma implementations of domain interfaces
│   │   ├── document.repository.ts
│   │   ├── folder.repository.ts
│   │   ├── tag.repository.ts
│   │   ├── tag-document.repository.ts
│   │   ├── user.repository.ts
│   │   ├── conversion-job.repository.ts
│   │   ├── share.repository.ts
│   │   └── index.ts
│   └── use-cases/          # Business logic orchestration
│       ├── document-crud.use-cases.ts
│       ├── document-move.use-cases.ts
│       ├── document-tag.use-cases.ts
│       ├── document-share.use-cases.ts
│       ├── document.use-cases.ts  # GOD CLASS — facade wrapper
│       ├── folder.use-cases.ts
│       ├── tag.use-cases.ts
│       ├── user.use-cases.ts
│       ├── search.use-cases.ts
│       ├── conversion.use-cases.ts
│       ├── export.use-cases.ts
│       ├── export-document.use-case.ts
│       ├── registration.use-cases.ts
│       ├── profile.use-cases.ts
│       └── upload-document.use-case.ts
├── domain/                 # Domain layer (INTERFACES + TYPES)
│   ├── types.ts            # DomainDocument, DomainFolder, DomainTag, etc.
│   └── repositories/       # Repository interfaces (contracts)
│       ├── document.repository.interface.ts
│       ├── folder.repository.interface.ts
│       ├── tag.repository.interface.ts
│       ├── tag-document.repository.interface.ts
│       ├── user.repository.interface.ts
│       ├── conversion-job.repository.interface.ts
│       ├── share.repository.interface.ts
│       └── search.repository.interface.ts
├── lib/                    # Infrastructure utilities
│   ├── auth.ts             # NextAuth.js v5 configuration
│   ├── auth-guards.ts      # withAuth, requireAuth, requireRole, isAdmin
│   ├── prisma.ts           # Prisma singleton
│   ├── errors.ts           # AppError, NotFoundError, ValidationError, etc.
│   ├── logger.ts           # Pino logger
│   ├── route-helpers.ts    # handleRouteError, error mapping
│   ├── rate-limit.ts       # Rate limiting
│   ├── brand.ts            # Brand colors
│   ├── validators/         # Zod schemas (auth, document, folder, tag, share)
│   ├── export/             # Export helpers (bulk, metadata, profiles, zip, validators)
│   ├── conversion-status-utils.ts
│   ├── build-folder-tree.ts
│   ├── content.ts
│   ├── fonts.ts, cn.ts
│   ├── metadata.ts
│   ├── share-helpers.ts
│   └── storage-helper.ts
├── components/             # React components
│   ├── auth/               # Login, register forms
│   ├── files/              # Document list, upload, preview
│   ├── folders/            # Folder tree, create/edit dialogs
│   ├── tags/               # Tag management
│   ├── search/             # Search UI
│   ├── pipeline/           # Progress indicators
│   ├── reading/            # Document reader
│   ├── discovery/          # Discovery views
│   ├── sections/           # Page sections
│   ├── layout/             # App layout, sidebar, navbar
│   ├── locale/             # Language switcher
│   ├── mdx/                # Markdown rendering
│   ├── theme/              # Theme provider
│   └── ui/                 # Shadcn/UI primitives
├── i18n/                   # Internationalization
├── messages/               # Translation files (ar.json, en.json)
└── styles/                 # Global CSS
```

### 2.2 Pipeline Package (`packages/pipeline/`)

```
packages/pipeline/src/
├── index.ts                # Barrel export (all modules)
├── types.ts                # PipelineConfig, ProcessingJob, OcrEngineResult, etc.
├── config.ts               # loadConfig() — env → PipelineConfig
├── storage.ts              # MinIO client, upload/download/delete/validate
├── ocr.ts                  # splitPdfPages, extractTextViaGoogleDrive
├── ocr-provider.ts         # OcrManager, createOcrProvider factory
├── ocr-providers/
│   ├── types.ts            # OcrProvider interface
│   ├── google.ts           # GoogleDriveOcrProvider
│   ├── surya.ts            # SuryaOcrProvider
│   ├── gemini.ts           # GeminiOcrProvider
│   └── tesseract.ts        # TesseractOcrProvider
├── text/
│   ├── index.ts            # Re-exports
│   ├── clean.ts            # cleanArabicText() — 469 lines, 20+ cleaning passes
│   ├── analyze.ts          # Text analysis
│   └── constants.ts        # Regex patterns, options
├── queue/
│   ├── index.ts            # Barrel export
│   ├── connection.ts       # Redis/BullMQ connection management
│   ├── enqueue.ts          # Job enqueueing functions
│   ├── workers.ts          # Worker factory functions
│   ├── dlq.ts              # Dead-letter queue handling
│   ├── metrics.ts          # Queue metrics
│   └── categorize.ts       # Failure categorization
├── output/
│   ├── index.ts            # Re-exports
│   ├── markdown.ts         # generateMarkdown
│   ├── txt.ts              # generateTxt
│   ├── json.ts             # generateJson
│   ├── pdf.ts              # generatePdf
│   └── pandoc.ts           # generateDocx, generateEpub (via pandoc)
├── google-drive.ts         # Google Drive integration
└── split-pdf.py            # Python PDF splitter (called via execFile)
```

### 2.3 Workers (`workers/`)

```
workers/
├── ocr-worker/
│   └── src/
│       ├── index.ts        # Entry point — registers 5 stages
│       ├── helpers.ts      # downloadDocumentBuffer, updateDocStatus
│       ├── polyfill-image-data.ts
│       ├── generate_pdf.py # Python PDF generation
│       └── stages/
│           ├── validate.ts # PDF validation
│           ├── split.ts    # PDF splitting
│           ├── ocr.ts      # OCR extraction
│           ├── clean.ts    # Text cleanup
│           └── generate.ts # Markdown generation
├── export-worker/
│   └── src/
│       ├── index.ts        # Entry point — registers export handler
│       └── export-handler.ts # Export job processing (md/txt/json/docx/epub/pdf)
└── shared/
    ├── health-server.ts    # HTTP health check server
    └── logger.ts           # Pino logger for workers
```

---

## 3. Infrastructure

### 3.1 Docker Services (dev)

| Service       | Port      | Purpose                  |
| ------------- | --------- | ------------------------ |
| postgres      | 5433→5432 | PostgreSQL 16            |
| redis         | 6379      | Redis 7 (BullMQ backend) |
| minio         | 9000      | Object storage           |
| caddy         | 80/443    | Reverse proxy            |
| web           | 3000      | Next.js app              |
| ocr-worker    | 9090      | OCR processing           |
| export-worker | 9091      | Export processing        |
| prometheus    | 9090      | Metrics                  |
| grafana       | 3001      | Dashboards               |
| cadvisor      | 8080      | Container metrics        |

---

## 4. Dependency Graph

### 4.1 Import-Level Dependencies

```
apps/web/src/app/api/*
    └── @/core/use-cases/*          (USE CASES)
        └── @/domain/repositories/* (INTERFACES)
        └── @/core/repositories/*   (IMPLEMENTATIONS — DIP violation)
            └── @/lib/prisma.ts     (PRISMA SINGLETON)

apps/web/src/app/api/*
    └── @/lib/auth-guards.ts        (AUTH)
    └── @/lib/route-helpers.ts      (ERROR HANDLING)
    └── @/lib/validators/*          (ZOD SCHEMAS)

packages/pipeline/*
    └── minio (MinIO client)
    └── bullmq (Queue)
    └── ioredis (Redis)

workers/ocr-worker/*
    └── @ibn-al-azhar-docs/pipeline
    └── @prisma/client
    └── workers/shared/*

workers/export-worker/*
    └── @ibn-al-azhar-docs/pipeline
    └── @prisma/client
    └── workers/shared/*
```

### 4.2 Critical Dependency Violations

1. **`composition-root.ts` imports concrete repositories, not interfaces** — DI exists but bypassed by many use-cases
2. **`document.use-cases.ts` creates its own instances** — bypasses `composition-root.ts`
3. **`upload-document.use-case.ts` directly uses concrete repositories** — no interface dependency
4. **`user.use-cases.ts` directly imports concrete `userRepository`** — no constructor injection
5. **`search.use-cases.ts` imports `searchRepository` from interface file** — concrete impl co-located with interface
6. **`export/route.ts` calls `loadConfig()` and pipeline functions directly** — API route knows about infrastructure

---

## 5. Data Flow

### 5.1 Document Upload Flow

```
User → Browser → POST /api/upload
  → withAuth() → session check
  → UploadDocumentUseCase.execute()
    → folderRepository.findFolderById()        [validate folder]
    → loadConfig() + ensureBucket()            [infra: MinIO]
    → Write temp file → uploadFile()           [infra: MinIO]
    → documentRepository.createDocument()       [infra: Prisma]
    → enqueueValidation()                       [infra: BullMQ]
  → SSE stream /api/stream?jobId=...
    → Polls getJobStatus() or Prisma fallback
    → Returns progress updates
```

### 5.2 OCR Pipeline Flow

```
OCR Worker stages (sequential):
  1. validate: download → validatePdf → enqueueSplitting
  2. split: splitPdfPages (Python) → enqueueOcr
  3. ocr: OcrManager.extractText (google/surya/gemini/tesseract) → enqueueCleaning
  4. clean: cleanArabicText → enqueueGeneration
  5. generate: generateMarkdown → uploadBuffer → updateDocStatus(COMPLETED)
```

### 5.3 Export Flow

```
User → POST /api/export
  → withAuth() → session check
  → resolveDocumentForExport() → resolveTags/Folder/OcrData/PipelineData
  → buildExportMetadata()
  → If ZIP: buildZipPackage() → return buffer
  → If format: check fileExists() → downloadFile() → return buffer

Worker flow (async):
  POST /api/export (batch/folder/tag) → ExportUseCases
    → executeBulkExport() → enqueueExport
    → Export Worker: downloadFile → generate{Format} → uploadBuffer → update DB
```

---

## 6. Ownership Map

| Module                            | Owner         | Responsibility                 |
| --------------------------------- | ------------- | ------------------------------ |
| `apps/web/src/app/api/`           | Web team      | HTTP routing, auth, validation |
| `apps/web/src/core/use-cases/`    | Web team      | Business logic orchestration   |
| `apps/web/src/core/repositories/` | Web team      | Data access (Prisma)           |
| `apps/web/src/domain/`            | Web team      | Domain types, interfaces       |
| `apps/web/src/lib/`               | Web team      | Shared utilities               |
| `apps/web/src/components/`        | Web team      | UI components                  |
| `packages/pipeline/`              | Pipeline team | OCR, queue, storage, text      |
| `workers/ocr-worker/`             | Pipeline team | OCR processing stages          |
| `workers/export-worker/`          | Pipeline team | Export processing              |
| `workers/shared/`                 | Platform team | Health, logging                |
| `prisma/`                         | Data team     | Schema, migrations             |
| `infrastructure/`                 | DevOps        | Docker, Caddy, monitoring      |

---

## 7. API Surface

| Endpoint                    | Methods            | Auth  | Notes                  |
| --------------------------- | ------------------ | ----- | ---------------------- |
| `/api/auth/*`               | ALL                | Mixed | NextAuth.js handlers   |
| `/api/upload`               | POST               | Yes   | File upload → pipeline |
| `/api/documents`            | GET                | Yes   | List with pagination   |
| `/api/documents/[id]`       | GET, PATCH, DELETE | Yes   | CRUD                   |
| `/api/documents/bulk-move`  | POST               | Yes   | Bulk folder move       |
| `/api/documents/bulk-tag`   | POST               | Yes   | Bulk tagging           |
| `/api/documents/bulk-untag` | POST               | Yes   | Bulk untagging         |
| `/api/folders`              | GET, POST          | Yes   | List, create           |
| `/api/folders/[id]`         | GET, PATCH, DELETE | Yes   | CRUD                   |
| `/api/tags`                 | GET, POST          | Yes   | List, create           |
| `/api/tags/[id]`            | GET, PATCH, DELETE | Yes   | CRUD                   |
| `/api/tags/merge`           | POST               | Yes   | Merge tags             |
| `/api/search`               | GET                | Yes   | Full-text search       |
| `/api/search/suggest`       | GET                | Yes   | Search suggestions     |
| `/api/conversion/start`     | POST               | Yes   | Re-run pipeline        |
| `/api/conversion/list`      | GET                | Yes   | Job listing            |
| `/api/conversion/[id]`      | GET                | Yes   | Job status             |
| `/api/export`               | POST               | Yes   | Single doc export      |
| `/api/export/batch`         | POST               | Yes   | Batch export           |
| `/api/export/folder`        | POST               | Yes   | Folder export          |
| `/api/export/tag`           | POST               | Yes   | Tag export             |
| `/api/stream`               | GET                | Yes   | SSE progress           |
| `/api/share/[token]`        | GET                | No    | Shared doc access      |
| `/api/profile`              | GET, PATCH         | Yes   | User profile           |
| `/api/users`                | GET, PATCH, DELETE | Admin | User management        |
| `/api/health/live`          | GET                | No    | Liveness               |
| `/api/health/ready`         | GET                | No    | Readiness              |
| `/api/metrics`              | GET                | No    | Prometheus             |

---

## 8. Database Schema

10 models, 5 enums:

| Model         | Purpose           | Key Relations                                                                            |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| User          | Auth + ownership  | has many: Document, Folder, Tag, ConversionJob, ShareLink, Account, Session, UserSetting |
| Account       | OAuth tokens      | belongs to User                                                                          |
| Session       | Auth sessions     | belongs to User                                                                          |
| Document      | Core asset        | belongs to User, Folder; has many: TagDocument, ConversionJob, ShareLink                 |
| Folder        | Hierarchical org  | belongs to User, parent Folder; has many: children Folder, Document                      |
| Tag           | Metadata grouping | belongs to User; has many: TagDocument                                                   |
| TagDocument   | M:N join          | belongs to Tag, Document                                                                 |
| ConversionJob | Pipeline tracking | belongs to User, Document                                                                |
| ShareLink     | External access   | belongs to User, Document                                                                |
| UserSetting   | User preferences  | belongs to User                                                                          |
| AuditLog      | Audit trail       | standalone                                                                               |

---

_This map represents the current state (as-is) before refactoring._
