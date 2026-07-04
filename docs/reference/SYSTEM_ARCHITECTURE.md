# SYSTEM_MODEL.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Domain & Subsystem Modeling
> **System:** Ibn Al-Azhar Docs

## 1. Domain Model

The system operates across three core domain verticals: **Identity**, **Asset Management**, and **Processing**.

### 1.1 Identity Domain

- **User (Aggregate Root):** Owner of all resources. Distinguishes between `STUDENT` and `ADMIN` roles. Governs quota, state, and permissions.
- **Session:** Volatile authentication token lifecycle.

### 1.2 Asset Management Domain (Core)

- **Folder (Aggregate Root):** Hierarchical container for Documents. Subject to ownership and nesting invariants (e.g., maximum depth, acyclic paths).
- **Document (Aggregate Root):** The primary asset. Composed of raw media (PDF, Images) and processed text outputs (Markdown). Contains state transitions (`UPLOADED` -> `PROCESSING` -> `READY` -> `FAILED`).
- **Tag (Value Object / Entity):** Metadata grouping for Documents.
- **ShareLink (Entity):** Access delegation mechanism granting time-bound or indefinite read access to external principals.

### 1.3 Processing Domain (Asynchronous)

- **OCR Job (Entity):** Represents a finite state machine for document processing.
- **Export Job (Entity):** Represents the generation of physical artifacts (PDF, ZIP) from structured data.

## 2. Architecture

### 2.1 Layered Architecture

The system follows Clean Architecture with repository pattern and use-case layer.
**Current Architecture:**

1. **Domain Layer:** Pure TypeScript, zero dependencies. Entities, Enums, Interfaces (`domain/types.ts`, `domain/repositories/`).
2. **Use Case (Application) Layer:** 14 use-case files orchestrating domain entities. Defines input/output boundaries (`core/use-cases/`).
3. **Interface Adapters (Controllers/Resolvers):** Next.js App Router API handlers. Translates HTTP/Web requests into Use Case commands. Single try-catch with `handleRouteError`.
4. **Infrastructure Layer:** Repositories (Prisma), Queue Adapters (BullMQ), File Storage (MinIO).

### 2.2 Subsystems & Relationships

1. **Web App (Next.js):** Primary UI and API Gateway. Handles Auth, routing, rendering.
2. **Pipeline (Shared Lib):** Core logic for text extraction, OCR invocation, and storage handling. Currently acts as a God Module.
3. **Workers (Node.js/tsx):**
   - _OCR Worker:_ Consumes PDF/Images, produces Markdown.
   - _Export Worker:_ Consumes Document data, produces downloadable archives.

## 3. Dependency Graph

**Current Flow (mostly clean):**

```
API Routes ---> Use Cases ---> Repositories ---> Prisma
API Routes ---> Prisma (6 routes: health, health/ready, metrics, stream, register, share/[token])
Pipeline ---> Storage/External Services
Workers ---> Pipeline ---> Prisma
```

**Strict Target Flow:**

```
API Routes ---> Use Case Interfaces
Use Cases ---> Repository Interfaces
Prisma Repositories ---> implements Repository Interfaces
Workers ---> Use Cases ---> Repository Interfaces
```

## 4. Ownership & Data Flow

- **Data Ownership:** `User` owns `Folder` and `Document`. All database queries MUST enforce tenant isolation (`where: { userId }`).
- **Flow:**
  1. User uploads PDF.
  2. Web layer persists metadata to DB, uploads binary to Storage.
  3. Web layer enqueues Job in Redis.
  4. Worker dequeues Job, streams binary from Storage.
  5. Worker executes Python/Tesseract, generates Markdown.
  6. Worker updates DB state and persists Markdown to Storage.
  7. Frontend receives state updates.

## 5. System Constraints & Invariants

- **Security:** Strict multi-tenant isolation. No document or folder can be accessed without explicit ownership verification or valid ShareLink.
- **Resilience:** The OCR pipeline must handle poison pills (corrupted PDFs) without crashing the worker process.
- **Data Integrity:** Folders cannot have cyclical parent-child relationships. Documents cannot be orphaned.
