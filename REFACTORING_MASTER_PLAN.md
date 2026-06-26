# REFACTORING_MASTER_PLAN.md

> **Level:** Principal Engineer / Staff Engineer
> **System:** Ibn Al-Azhar Docs
> **Objective:** Transform the codebase into a world-class, staff-level architecture.
> **Constraint:** Zero behavior change, zero API signature change, 100% test preservation.

## Execution Rules
- **Rule 1:** Understand the code. Do not refactor code you do not fully comprehend.
- **Rule 2:** Run all tests after every file change. A red test means immediate rollback.
- **Rule 3:** Execute strictly in the order defined below. Architecture first, details last.
- **Rule 4:** Leave the codebase cleaner, safer, and more observable than you found it.

---

### PHASE 1: Architecture & Domain Foundation
*Focus: Boundaries, Interfaces, and Dependency Inversion.*

1. **Establish Interfaces:** Define pure `Repository` interfaces for Document, Folder, Tag, User, and ShareLink inside a domain folder.
2. **Segregate God Classes:** Break `DocumentUseCases` (304 lines) into:
   - `DocumentCrudUseCases`
   - `DocumentMoveUseCases`
   - `DocumentTagUseCases`
   - `DocumentShareUseCases`
3. **Decouple Prisma:** Modify all new Use Cases to depend on Repository interfaces, not direct Prisma imports.

### PHASE 2: Database Layer
*Focus: Performance, Indexes, and Integrity.*

1. **Optimize Folder Queries:** Refactor `resolveFolderForExport` to utilize a single `$queryRaw` Recursive CTE, eliminating the N+1 loop.
2. **Implement Repositories:** Ensure Prisma implementations exist for all interfaces defined in Phase 1.
3. **Transaction Boundaries:** Audit and wrap bulk operations (tagging, moving) in `prisma.$transaction`.

### PHASE 3: Backend & API Modernization
*Focus: Consistency, Error Handling, and SOLID.*

1. **Universal Error Handling:** Wrap ALL 45 API routes in `withAuth` and `handleRouteError` wrappers. Eliminate bespoke try/catch blocks in API routes.
2. **Eliminate Route Logic:** Move all tag merge algorithms and raw Prisma calls out of Next.js route handlers into their respective Use Case classes.
3. **Extract Validators:** Move inline Zod schemas to a dedicated definitions module.

### PHASE 4: Frontend Optimization
*Focus: Dead Code, Reusability, and Security.*

1. **Purge:** Delete the 20 unused component files (e.g., `drawer-dialog.tsx`, unused `settings-form` variants).
2. **DRY Components:** Create a generic `<DeleteConfirmDialog />` and replace the 3 identical implementations.
3. **Sanitize:** Add DOMPurify to `dangerouslySetInnerHTML` in `template-preview.tsx`.
4. **Style Integrity:** Replace all legacy physical CSS properties (`ml-`, `mr-`) with logical properties (`ms-`, `me-`).

### PHASE 5: Worker & Pipeline Resilience
*Focus: God Modules, Idempotency, and Scale.*

1. **Deconstruct `queue.ts`:** Split the 437-line god module into discrete `BullProvider`, `WorkerFactory`, and `JobService` modules.
2. **Deconstruct `ocr-worker/index.ts`:** Split the 600-line god file into separate processing strategies. Ensure idempotent database updates.
3. **Parallelize:** Refactor Redis polling in `getJobStatus` to use `Promise.all` or `redis.pipeline()`.

### PHASE 6: Security & Observability Polish
*Focus: Leaks, Injection, and Telemetry.*

1. **Patch Drive Injection:** Escape `folderName` inputs in Google Drive provider.
2. **Sterilize Errors:** Modify `/health` and global error handlers to mask Prisma/Zod internals from unauthenticated callers.
3. **Standardize Logging:** Replace `console.warn` in pipeline libraries with the centralized structured logger.

---

### Exit Criteria
Upon completion of Phase 6, the agent must update `FINAL_REFACTOR_REPORT.md` and verify that all 1,113 tests pass against the new architecture.
