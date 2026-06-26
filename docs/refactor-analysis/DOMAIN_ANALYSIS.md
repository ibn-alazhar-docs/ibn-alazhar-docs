# DOMAIN_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Domain model, bounded contexts, aggregates, value objects, invariants
> **System:** Ibn Al-Azhar Docs

---

## 1. Domain Overview

Three bounded contexts:

### 1.1 Identity Context

- **User** (Aggregate Root) — owns all resources, roles (ADMIN/STUDENT/TEACHER), soft-delete
- **Account** (Entity) — OAuth provider linkage (Google)
- **Session** (Volatile) — JWT-based auth (24h)
- **UserSetting** (Value Object) — key-value preferences

### 1.2 Asset Management Context

- **Document** (Aggregate Root) — core asset with lifecycle (UPLOADED → COMPLETED/FAILED)
- **Folder** (Aggregate Root) — hierarchical container, max depth 5, acyclic
- **Tag** (Entity) — metadata grouping, user-scoped, max 50/user
- **ShareLink** (Entity) — time-limited external access delegation

### 1.3 Processing Context

- **ConversionJob** (Entity) — pipeline job tracking with status lifecycle
- **Pipeline stages** — validate → split → OCR → clean → generate

---

## 2. Domain Type Analysis

### 2.1 Current Domain Types (`domain/types.ts`)

```typescript
DomainDocument, CreateDocumentInput, UpdateDocumentInput
DomainFolder, CreateFolderInput
DomainTag, CreateTagInput
DomainShareLink, CreateShareLinkInput
DomainUser, CreateUserInput
DocStatus (union type)
```

### 2.2 Issues

| Issue                             | Severity | Description                                                               |
| --------------------------------- | -------- | ------------------------------------------------------------------------- |
| Types parallel Prisma models      | MEDIUM   | `DomainDocument` duplicates `Document` from Prisma — two sources of truth |
| Missing `DomainConversionJob`     | LOW      | Conversion jobs not modeled as domain types                               |
| `Role` imported from `lib/errors` | HIGH     | Domain type depends on infrastructure (errors.ts defines `Role`)          |
| No value objects                  | MEDIUM   | Colors, IDs, dates are plain primitives                                   |
| No invariant enforcement          | MEDIUM   | Business rules checked in use-cases, not in domain types                  |

### 2.3 Proposed Domain Model

```
Domain/
├── value-objects/
│   ├── DocumentId.ts        (branded string)
│   ├── FolderId.ts          (branded string)
│   ├── TagId.ts             (branded string)
│   ├── UserId.ts            (branded string)
│   ├── Email.ts             (validated string)
│   ├── Color.ts             (validated hex string)
│   └── DocStatus.ts         (enum with transitions)
├── entities/
│   ├── Document.ts          (with business rules)
│   ├── Folder.ts            (with depth/cycle validation)
│   ├── Tag.ts               (with uniqueness rule)
│   └── ShareLink.ts         (with expiry check)
└── types.ts                 (input/output DTOs)
```

---

## 3. Bounded Context Boundaries

### 3.1 Current Boundary Violations

| Violation                                  | Location                             | Impact              |
| ------------------------------------------ | ------------------------------------ | ------------------- |
| `lib/errors.ts` defines `Role`             | Domain depends on lib                | Circular concept    |
| `lib/auth-guards.ts` defines `ownedWhere`  | Domain logic in infrastructure       | Business rule leak  |
| `lib/route-helpers.ts` defines error codes | Infrastructure defines domain errors | Mixed layers        |
| `search.use-cases.ts` contains SQL         | Business logic in service            | Infrastructure leak |
| `export/route.ts` calls pipeline directly  | API knows about storage              | Layer bypass        |

### 3.2 Context Map

```
Identity Context ──owns──> Asset Management Context
                                    │
                                    ├──documents──> Processing Context
                                    └──shares──> (external)
```

---

## 4. Aggregate Invariants

### 4.1 Document

| Invariant                                    | Current Enforcement | Gap              |
| -------------------------------------------- | ------------------- | ---------------- |
| Must belong to a User                        | DB constraint (FK)  | ✅               |
| Status follows valid transitions             | Use-case checks     | No state machine |
| Soft-delete preserves data                   | `deletedAt` column  | ✅               |
| File must exist in storage before processing | Upload use-case     | ✅               |

### 4.2 Folder

| Invariant                        | Current Enforcement             | Gap                                 |
| -------------------------------- | ------------------------------- | ----------------------------------- |
| Max depth 5                      | `MAX_FOLDER_DEPTH` in validator | Only checked on move, not on create |
| No circular references           | BFS traversal in move           | ✅ but not on create with parentId  |
| Soft-delete cascades to children | Transaction in deleteFolder     | ✅                                  |
| Parent must exist                | Create use-case check           | ✅                                  |

### 4.3 Tag

| Invariant                             | Current Enforcement             | Gap |
| ------------------------------------- | ------------------------------- | --- |
| Unique per user                       | DB unique constraint + use-case | ✅  |
| Max 50 per user                       | Use-case check                  | ✅  |
| Merge preserves document associations | Transaction in mergeTags        | ✅  |

---

## 5. Domain Events (Missing)

The system lacks an event model. Key domain events that should be emitted:

| Event                         | Trigger             | Consumers            |
| ----------------------------- | ------------------- | -------------------- |
| `DocumentUploaded`            | POST /api/upload    | Audit log            |
| `DocumentProcessingStarted`   | enqueueValidation   | Notifications        |
| `DocumentProcessingCompleted` | generate stage done | Notifications, index |
| `DocumentProcessingFailed`    | stage failure       | Notifications, retry |
| `DocumentExported`            | export complete     | Audit log            |
| `FolderCreated`               | createFolder        | Index                |
| `TagCreated`                  | createTag           | Index                |
| `ShareLinkCreated`            | createShareLink     | Audit log            |

---

## 6. Recommendations

| #   | Priority | Recommendation                                                       |
| --- | -------- | -------------------------------------------------------------------- |
| 1   | P0       | Move `Role` definition out of `lib/errors.ts` into `domain/types.ts` |
| 2   | P0       | Add `DomainConversionJob` type                                       |
| 3   | P1       | Introduce branded types for IDs (type safety)                        |
| 4   | P1       | Add DocStatus state machine (prevent invalid transitions)            |
| 5   | P2       | Add domain events for key state changes                              |
| 6   | P2       | Add invariant checks in domain entities                              |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
