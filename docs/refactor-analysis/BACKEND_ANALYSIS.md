# BACKEND_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** API routes, use cases, repositories, middleware, error handling
> **System:** Ibn Al-Azhar Docs

---

## 1. API Route Analysis

### 1.1 Route Inventory

| Route                       | Methods          | Lines | Auth        | Pattern  | Issues                  |
| --------------------------- | ---------------- | ----- | ----------- | -------- | ----------------------- |
| `/api/upload`               | POST             | 82    | ✅ withAuth | ✅ Clean | Inline validation logic |
| `/api/documents`            | GET              | 45    | ✅ withAuth | ✅ Clean | —                       |
| `/api/documents/[id]`       | GET/PATCH/DELETE | ~80   | ✅ withAuth | ✅ Clean | —                       |
| `/api/documents/bulk-move`  | POST             | ~40   | ✅ withAuth | ✅ Clean | —                       |
| `/api/documents/bulk-tag`   | POST             | ~40   | ✅ withAuth | ✅ Clean | —                       |
| `/api/documents/bulk-untag` | POST             | ~40   | ✅ withAuth | ✅ Clean | —                       |
| `/api/folders`              | GET/POST         | 49    | ✅ withAuth | ✅ Clean | —                       |
| `/api/folders/[id]`         | GET/PATCH/DELETE | ~80   | ✅ withAuth | ✅ Clean | —                       |
| `/api/tags`                 | GET/POST         | ~50   | ✅ withAuth | ✅ Clean | —                       |
| `/api/tags/[id]`            | GET/PATCH/DELETE | ~60   | ✅ withAuth | ✅ Clean | —                       |
| `/api/tags/merge`           | POST             | ~30   | ✅ withAuth | ✅ Clean | —                       |
| `/api/search`               | GET              | 24    | ✅ withAuth | ✅ Clean | —                       |
| `/api/search/suggest`       | GET              | ~20   | ✅ withAuth | ✅ Clean | —                       |
| `/api/conversion/start`     | POST             | ~30   | ✅ withAuth | ✅ Clean | —                       |
| `/api/conversion/list`      | GET              | ~30   | ✅ withAuth | ✅ Clean | —                       |
| `/api/conversion/[id]`      | GET              | ~20   | ✅ withAuth | ✅ Clean | —                       |
| `/api/export`               | POST             | 149   | ✅ withAuth | ⚠️ FAT   | Business logic in route |
| `/api/export/batch`         | POST             | ~40   | ✅ withAuth | ✅ Clean | —                       |
| `/api/export/folder`        | POST             | ~40   | ✅ withAuth | ✅ Clean | —                       |
| `/api/export/tag`           | POST             | ~40   | ✅ withAuth | ✅ Clean | —                       |
| `/api/stream`               | GET              | 203   | ✅ withAuth | ⚠️ FAT   | SSE + business logic    |
| `/api/share/[token]`        | GET              | ~30   | ❌ Public   | ✅ Clean | —                       |
| `/api/profile`              | GET/PATCH        | ~40   | ✅ withAuth | ✅ Clean | —                       |
| `/api/users`                | GET/PATCH/DELETE | 76    | ✅ Admin    | ✅ Clean | —                       |
| `/api/health/live`          | GET              | ~10   | ❌ Public   | ✅ Clean | —                       |
| `/api/health/ready`         | GET              | ~10   | ❌ Public   | ✅ Clean | —                       |
| `/api/metrics`              | GET              | ~10   | ❌ Public   | ✅ Clean | —                       |

### 1.2 Fat Routes

| Route         | Lines | Problem                                                                              |
| ------------- | ----- | ------------------------------------------------------------------------------------ |
| `/api/export` | 149   | Calls `loadConfig()`, `fileExists()`, `downloadFile()`, `buildZipPackage()` directly |
| `/api/stream` | 203   | SSE streaming with inline polling, state management, timeout handling                |
| `/api/upload` | 82    | Inline file validation, size checks, type checks                                     |

### 1.3 Missing Routes

| Route                              | Purpose                  | Phase                   |
| ---------------------------------- | ------------------------ | ----------------------- |
| `GET /api/documents/[id]/versions` | Document version history | Future                  |
| `POST /api/documents/[id]/restore` | Restore soft-deleted     | Implemented in use-case |
| `GET /api/folders/[id]/tree`       | Full folder tree         | Implemented in use-case |
| `GET /api/folders/[id]/tags`       | Folder tags              | Implemented in use-case |

---

## 2. Use Case Analysis

### 2.1 Use Case Inventory

| Use Case                    | Lines | Dependencies                                    | Issues                |
| --------------------------- | ----- | ----------------------------------------------- | --------------------- |
| `DocumentCrudUseCases`      | 116   | IDocumentRepository, IFolderRepository          | ✅ Good               |
| `DocumentMoveUseCases`      | ~60   | IDocumentRepository, IFolderRepository          | ✅ Good               |
| `DocumentTagUseCases`       | ~80   | IDocumentRepository, ITagRepository             | ✅ Good               |
| `DocumentShareUseCases`     | ~60   | IDocumentRepository, IShareRepository           | ✅ Good               |
| `DocumentUseCases` (facade) | 72    | All 4 above                                     | ⚠️ God facade         |
| `FolderUseCases`            | 225   | IFolderRepository, ITagRepository               | ⚠️ Long methods       |
| `TagUseCases`               | 104   | ITagRepository, ITagDocumentRepository          | ✅ Good               |
| `UserUseCases`              | 49    | userRepository (concrete)                       | ⚠️ No interface       |
| `SearchUseCases`            | 272   | ISearchRepository                               | ⚠️ Raw SQL in service |
| `ConversionUseCases`        | 102   | IDocumentRepository, IConversionJobRepository   | ✅ Good               |
| `ExportUseCases`            | 133   | 4 repositories                                  | ✅ Good               |
| `RegistrationUseCases`      | 32    | IUserRepository                                 | ✅ Good               |
| `ProfileUseCases`           | ~40   | IUserRepository                                 | ✅ Good               |
| `UploadDocumentUseCase`     | 93    | documentRepository, folderRepository (concrete) | ⚠️ No interface       |

### 2.2 Use Case Issues

| Issue                                   | Count | Examples                                                             |
| --------------------------------------- | ----- | -------------------------------------------------------------------- |
| Direct concrete imports (bypassing DIP) | 6     | UserUseCases, UploadDocumentUseCase, tag, folder, conversion, search |
| Raw SQL in service                      | 1     | SearchUseCases                                                       |
| Business logic in route                 | 2     | export, stream                                                       |
| God facade                              | 1     | DocumentUseCases                                                     |
| Long methods (>50 lines)                | 3     | FolderUseCases.deleteFolder, moveFolder, getFolderTree               |

---

## 3. Repository Analysis

### 3.1 Repository Inventory

| Repository              | Methods | Interface? | Issues                               |
| ----------------------- | ------- | ---------- | ------------------------------------ |
| DocumentRepository      | 10      | Yes        | Too many methods, raw/typed variants |
| FolderRepository        | 8       | Yes        | Mixed abstraction levels             |
| TagRepository           | 7       | Yes        | ✅ Good                              |
| TagDocumentRepository   | 3       | Yes        | ✅ Good                              |
| UserRepository          | 6       | Yes        | ✅ Good                              |
| ConversionJobRepository | 2       | Yes        | Too few methods                      |
| ShareRepository         | 4       | Yes        | ✅ Good                              |
| SearchRepository        | 1       | Yes        | Raw SQL passthrough                  |

### 3.2 Repository Issues

| Issue                             | Severity | Description                                                          |
| --------------------------------- | -------- | -------------------------------------------------------------------- |
| Prisma types leak into interfaces | HIGH     | `Prisma.DocumentFindManyArgs`, `Prisma.DocumentInclude` in interface |
| Multiple create/update variants   | MEDIUM   | `createDocument` + `createDocumentRaw`, `update` + `updateRaw`       |
| `findFirst` without ownership     | MEDIUM   | Some repos don't enforce userId in findFirst                         |
| No count method on all repos      | LOW      | ConversionJob has count, others don't                                |

---

## 4. Error Handling

### 4.1 Error Hierarchy

```
AppError (base)
├── NotFoundError (404)
├── ValidationError (400)
├── ConflictError (409)
├── AuthorizationError (401)
└── ForbiddenError (403)
```

### 4.2 Error Mapping

`route-helpers.ts` maps error codes to HTTP responses via `ERROR_MESSAGES` map. **Issues:**

- Static map — can't express context-dependent error messages
- Some routes use inline error mapping (upload, export)
- Inconsistent: some use `getErrorMessage()`, others check `instanceof`

---

## 5. Middleware Analysis

### 5.1 Current Middleware (`middleware.ts`)

Single 179-line function handling:

1. Static file bypass
2. API CSRF protection
3. API rate limiting
4. Guest-only route redirect
5. Protected route redirect
6. i18n routing
7. Security headers (CSP, X-Frame-Options, etc.)

**Issues:**

- Monolithic — all logic in one function
- No composition — can't add/remove middleware
- CSRF and rate-limit logic duplicated across API and non-API paths

### 5.2 Auth Guards (`auth-guards.ts`)

| Function        | Purpose                     | Issues                                 |
| --------------- | --------------------------- | -------------------------------------- |
| `requireAuth()` | Get session or redirect     | ✅                                     |
| `requireRole()` | Get session with role check | ✅                                     |
| `withAuth()`    | API route wrapper           | ✅                                     |
| `isAdmin()`     | Role check                  | Duplicates `lib/errors.ts:isAdminRole` |
| `ownedWhere()`  | Query scoping               | Business logic in infrastructure       |

---

## 6. Recommendations

| #   | Priority | Recommendation                                            |
| --- | -------- | --------------------------------------------------------- |
| 1   | P0       | Complete DIP for all use-cases (6 remaining)              |
| 2   | P0       | Move business logic out of export and stream routes       |
| 3   | P0       | Split DocumentUseCases god facade                         |
| 4   | P1       | Extract SearchUseCases raw SQL into repository            |
| 5   | P1       | Split middleware.ts into composable layers                |
| 6   | P1       | Standardize error handling across all routes              |
| 7   | P2       | Add DTO layer for API responses                           |
| 8   | P2       | Reduce repository method count (merge raw/typed variants) |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
