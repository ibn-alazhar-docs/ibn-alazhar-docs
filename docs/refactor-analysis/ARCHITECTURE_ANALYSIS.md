# ARCHITECTURE_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Architectural boundaries, cohesion, coupling, layering, SOLID
> **System:** Ibn Al-Azhar Docs
> **Methodology:** Mazen Canda Refactor

---

## 1. Current Architecture Assessment

The system attempts Clean Architecture / Hexagonal Architecture but suffers from significant **layer bleed** — infrastructure concerns leak upward, and business logic leaks into delivery mechanisms.

### 1.1 Architecture Score

| Dimension              | Score      | Notes                                        |
| ---------------------- | ---------- | -------------------------------------------- |
| Separation of Concerns | 5/10       | Domain exists but not fully utilized         |
| Dependency Direction   | 4/10       | DIP violations in multiple places            |
| Testability            | 6/10       | Interfaces exist but bypassed                |
| Modularity             | 5/10       | God modules present                          |
| API Consistency        | 7/10       | Good pattern in most routes                  |
| Scalability            | 6/10       | Workers separate, but pipeline is monolithic |
| **Overall**            | **5.5/10** |                                              |

---

## 2. Dependency Inversion Principle (DIP) Violations

### 2.1 Critical Violations

| #   | Location                            | Violation                                                            | Severity |
| --- | ----------------------------------- | -------------------------------------------------------------------- | -------- |
| 1   | `composition-root.ts:22-31`         | Exports concrete repositories, not interfaces                        | HIGH     |
| 2   | `document.use-cases.ts:6-9`         | Creates own concrete instances, bypassing composition-root           | HIGH     |
| 3   | `upload-document.use-case.ts:14-15` | Directly imports concrete `documentRepository`, `folderRepository`   | HIGH     |
| 4   | `user.use-cases.ts:2`               | Directly imports `userRepository` — no constructor injection         | HIGH     |
| 5   | `search.use-cases.ts:3`             | Imports `searchRepository` from interface file (concrete co-located) | MEDIUM   |
| 6   | `export.use-cases.ts:8-11`          | Imports concrete repos alongside interface usage                     | MEDIUM   |
| 7   | `folder.use-cases.ts:6-7`           | Imports concrete repos alongside interface usage                     | MEDIUM   |
| 8   | `tag.use-cases.ts:6-7`              | Imports concrete repos alongside interface usage                     | MEDIUM   |
| 9   | `conversion.use-cases.ts:7-8`       | Imports concrete repos alongside interface usage                     | MEDIUM   |
| 10  | `stream/route.ts:5`                 | API route directly imports concrete `documentRepository`             | HIGH     |
| 11  | `export/route.ts:15`                | API route calls `loadConfig()`, `downloadFile()` directly            | HIGH     |

### 2.2 Root Cause

The `composition-root.ts` was created but **not adopted**. Most use-cases self-wire their dependencies:

```typescript
// INSTEAD OF (correct):
export const tagUseCases = new TagUseCases(tagRepository, tagDocumentRepository);

// THE ACTUAL PATTERN (in tag.use-cases.ts):
import { tagRepository } from "../repositories/tag.repository";
export const tagUseCases = new TagUseCases(tagRepository, tagDocumentRepository);
```

---

## 3. Single Responsibility Principle (SRP) Violations

### 3.1 God Modules

| Module                                      | Lines | Responsibilities                                          | Fix                        |
| ------------------------------------------- | ----- | --------------------------------------------------------- | -------------------------- |
| `packages/pipeline/src/text/clean.ts`       | 469   | 20+ cleaning passes in one function                       | Split into pipeline stages |
| `packages/pipeline/src/queue/connection.ts` | ~100  | Connection + queue creation + health                      | Split concerns             |
| `apps/web/src/middleware.ts`                | 179   | i18n routing + CSRF + rate-limit + CSP + security headers | Extract middleware layers  |
| `apps/web/src/lib/route-helpers.ts`         | 51    | Error mapping + HTTP response shaping + logging           | Split                      |
| `apps/web/src/lib/auth-guards.ts`           | 82    | Auth + role checking + response helpers + ownership       | Split                      |

### 3.2 DocumentUseCases Facade (72 lines)

`document.use-cases.ts` is a **god facade** that:

- Re-exports 4 sub-use-cases
- Creates 4 concrete instances
- Defines a `DocumentUseCases` class with 16 getter-bound methods
- Exports both individual instances AND the facade

This is a **God Anti-pattern** — the class does nothing but delegate. Callers should inject the specific use-case they need, not this god wrapper.

---

## 4. Open/Closed Principle (OCP) Violations

### 4.1 OCR Provider Selection

`ocr-provider.ts:14-24` uses a `switch` statement for provider selection:

```typescript
export function createOcrProvider(type: OcrEngineType) {
  switch (type) {
    case "google":
      return new GoogleDriveOcrProvider();
    case "surya":
      return new SuryaOcrProvider();
    case "tesseract":
      return new TesseractOcrProvider();
    case "gemini":
      return new GeminiOcrProvider();
  }
}
```

Adding a new OCR provider requires editing this function. Should use a **registry pattern**.

### 4.2 Export Format Switch

`export-handler.ts:38-80` uses a `switch` for export formats. Adding a new format requires editing the switch.

### 4.3 Error Message Mapping

`route-helpers.ts:5-33` has a static `ERROR_MESSAGES` map. Adding new error codes requires editing this object.

---

## 5. Interface Segregation Principle (ISP) Violations

### 5.1 Repository Interfaces Too Broad

`IDocumentRepository` (29 lines) exposes:

- `createDocument`, `createDocumentRaw` — two create methods
- `findDocumentById`, `findFirst`, `findMany`, `count` — four query methods
- `update`, `updateRaw`, `updateMany` — three update methods
- `updateSearchVector` — special-purpose method

**Consumers** often need only 2-3 methods. This forces implementation of methods that may not be needed.

### 5.2 `ISearchRepository` Too Narrow

`search.repository.interface.ts` has only `queryRaw`. The interface doesn't express intent — it's just a raw SQL passthrough.

---

## 6. Liskov Substitution Principle (LSP) Violations

### 6.1 `searchRepository` Concrete Impl in Interface File

`search.repository.interface.ts:5-9` contains BOTH the interface AND the concrete implementation:

```typescript
export interface ISearchRepository { ... }
export const searchRepository: ISearchRepository = { ... };
```

This violates the contract — the interface file should not contain implementations.

---

## 7. Structural Analysis

### 7.1 Layer Map (Current vs Target)

| Layer        | Current Location                  | Issues                                                     | Target Location     |
| ------------ | --------------------------------- | ---------------------------------------------------------- | ------------------- |
| Controllers  | `app/api/*/route.ts`              | Mostly thin, but some have business logic                  | ✅ Correct          |
| Services     | `core/use-cases/`                 | Good, but bypassed by some routes                          | ✅ Correct          |
| Repositories | `core/repositories/`              | Concrete implementations, not behind interfaces everywhere | Needs DIP fix       |
| Interfaces   | `domain/repositories/`            | Exist but not fully adopted                                | Needs full adoption |
| Config       | `lib/` + `pipeline/src/config.ts` | Mixed locations                                            | Consolidate         |
| Middleware   | `middleware.ts` (root)            | Monolithic                                                 | Split into layers   |
| Shared       | `lib/`                            | Good utilities but mixed concerns                          | ✅ Mostly correct   |
| Domain types | `domain/types.ts`                 | Good, but some types duplicated                            | Consolidate         |

### 7.2 Circular Dependencies

No hard circular dependencies detected, but there are **conceptual cycles**:

- `core/use-cases/document.use-cases.ts` imports from `core/repositories/*`
- `core/repositories/*` imports from `domain/repositories/*.interface.ts`
- `core/composition-root.ts` imports from both `core/repositories/*` and `core/use-cases/*`

---

## 8. Framework Entanglement

### 8.1 Next.js Coupling

| Location             | Coupling                                  | Impact                 |
| -------------------- | ----------------------------------------- | ---------------------- |
| `middleware.ts`      | Deep Next.js middleware API               | Tied to edge runtime   |
| `app/api/*/route.ts` | `NextRequest`, `NextResponse`, `URL`      | Tied to Next.js        |
| `lib/auth-guards.ts` | `NextResponse`, `NextRequest`, `redirect` | Tied to Next.js        |
| `route-helpers.ts`   | `NextResponse`                            | Tied to Next.js        |
| `share-helpers.ts`   | Prisma singleton                          | Tied to infrastructure |
| `storage-helper.ts`  | Pipeline `loadConfig()`                   | Tied to infrastructure |

### 8.2 Impact

Business logic cannot be tested or run outside Next.js. Workers already bypass this by using the pipeline package directly.

---

## 9. Architectural Drift

### 9.1 Drift from Original Intent

The `SYSTEM_MODEL.md` describes a clean 4-layer architecture:

1. Domain Layer (pure TypeScript)
2. Use Case Layer (orchestration)
3. Interface Adapters (controllers)
4. Infrastructure (Prisma, BullMQ, MinIO)

**Actual drift:**

- Layer 1 (Domain) exists but is underutilized
- Layer 2 (Use Cases) is well-structured but self-wires
- Layer 3 (Controllers) mostly thin but some leak
- Layer 4 (Infrastructure) leaks into Layers 2 and 3

### 9.2 Missing Patterns

- **No middleware composition** — auth, validation, error handling are ad-hoc
- **No DTO layer** — API responses are shaped inline in routes
- **No event system** — pipeline progress is polled, not evented
- **No unit of work** — transactions are explicit but not systematic
- **No value objects** — domain types are plain interfaces

---

## 10. Recommendations (Priority Order)

| #   | Priority | Recommendation                                                      | Impact | Risk   |
| --- | -------- | ------------------------------------------------------------------- | ------ | ------ |
| 1   | P0       | Complete DIP — all use-cases inject interfaces, not concrete        | HIGH   | LOW    |
| 2   | P0       | Eliminate `DocumentUseCases` god facade                             | MEDIUM | LOW    |
| 3   | P0       | Fix `search.repository.interface.ts` — separate interface from impl | LOW    | LOW    |
| 4   | P1       | Split `middleware.ts` into composable layers                        | MEDIUM | MEDIUM |
| 5   | P1       | Split `text/clean.ts` into pipeline stages                          | MEDIUM | LOW    |
| 6   | P1       | Introduce OCR provider registry (OCP)                               | LOW    | LOW    |
| 7   | P1       | Introduce export format registry (OCP)                              | LOW    | LOW    |
| 8   | P2       | Consolidate domain types — remove duplication                       | LOW    | LOW    |
| 9   | P2       | Extract DTO layer for API responses                                 | MEDIUM | MEDIUM |
| 10  | P3       | Add eslint-plugin-boundaries for layer enforcement                  | LOW    | LOW    |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
