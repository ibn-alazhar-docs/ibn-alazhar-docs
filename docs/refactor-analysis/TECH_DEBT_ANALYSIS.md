# TECH_DEBT_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Consolidated technical debt inventory across all domains
> **System:** Ibn Al-Azhar Docs

---

## 1. Debt by Priority

### P0 — Must Fix (Data Integrity / Security / DIP)

| #   | Issue                                | Location                                                  | Impact                    | Effort |
| --- | ------------------------------------ | --------------------------------------------------------- | ------------------------- | ------ |
| 1   | 11 use-cases bypass composition-root | `tag`, `folder`, `user`, `upload`, `conversion`, `search` | DIP violation, untestable | Medium |
| 2   | DocumentUseCases god facade          | `document.use-cases.ts`                                   | SRP, 16 delegated getters | Low    |
| 3   | Tag merge missing transaction        | `tag.use-cases.ts:83-98`                                  | Data corruption risk      | Low    |
| 4   | `Role` type in wrong module          | `lib/errors.ts`                                           | Domain leaks into infra   | Low    |
| 5   | Search SQL in service layer          | `search.use-cases.ts`                                     | SQL injection risk        | Medium |

### P1 — Should Fix (Maintainability / Testability)

| #   | Issue                                      | Location                         | Impact                           | Effort |
| --- | ------------------------------------------ | -------------------------------- | -------------------------------- | ------ |
| 6   | `text/clean.ts` god function (469 lines)   | `packages/pipeline`              | Unmaintainable                   | High   |
| 7   | Export handler god function                | `workers/export-worker`          | Can't test formats independently | Medium |
| 8   | Repository interface co-located with impl  | `search.repository.interface.ts` | DIP bypass                       | Low    |
| 9   | Middleware monolith (179 lines)            | `middleware.ts`                  | Can't compose/test               | Medium |
| 10  | `Prisma` types in repository interfaces    | `document.repository`            | Framework coupling               | Medium |
| 11  | Inconsistent logging across components     | pipeline, workers                | Debugging difficulty             | Low    |
| 12  | No request ID tracing                      | All                              | Can't correlate logs             | Medium |
| 13  | No audit logging                           | All                              | No security trail                | Medium |
| 14  | Multiple create/update repository variants | `document.repository`            | Interface bloat                  | Low    |

### P2 — Nice to Have (Polish / Optimization)

| #   | Issue                                                         | Location            | Impact               | Effort |
| --- | ------------------------------------------------------------- | ------------------- | -------------------- | ------ |
| 15  | `errors.ts` too generic (100 lines, 14 classes + 3 functions) | `lib/errors.ts`     | Hard to navigate     | Low    |
| 16  | No DTO layer for API responses                                | All routes          | Tight coupling       | High   |
| 17  | `console.warn` instead of logger                              | pipeline modules    | Inconsistent logging | Low    |
| 18  | No account lockout                                            | `auth.ts`           | Brute-force risk     | Low    |
| 19  | Missing security headers (HSTS)                               | `middleware.ts`     | Security gap         | Low    |
| 20  | No secrets rotation                                           | `.env`              | Operational risk     | High   |
| 21  | No component storybook                                        | Frontend            | No component docs    | High   |
| 22  | No dark mode support                                          | Frontend            | UX limitation        | Medium |
| 23  | `ocr-provider.ts` switch statement                            | `packages/pipeline` | OCP violation        | Low    |
| 24  | `storage.ts` 276 lines                                        | `packages/pipeline` | God module           | Medium |
| 25  | `types.ts` 201 lines                                          | `packages/pipeline` | God types file       | Medium |

---

## 2. Debt by Domain

### Backend (API + Use-Cases + Repositories)

```
DIP violations:      6 use-cases bypass composition-root
God facade:          DocumentUseCases (72 lines, 16 getters)
Missing transaction: Tag merge
SQL in service:      SearchUseCases raw SQL
Interface bloat:     DocumentRepository with 10+ methods
```

### Frontend (UI + Styling + a11y)

```
Physical CSS:        Some ml/mr remain
Missing a11y:        ARIA labels, focus management
No dark mode:        Limited theme switching
```

### Pipeline (OCR + Text + Queue + Storage)

```
God function:        text/clean.ts (469 lines)
God module:          storage.ts (276 lines)
God types:           types.ts (201 lines)
Console logging:     console.warn in modules
```

### Workers (OCR + Export)

```
God function:        export-handler.ts (144 lines)
DB access in worker: prisma directly in handler
Google Drive logic:  Mixed into export handler
No idempotency:      Worker stages lack checks
```

### Infrastructure (Middleware + Auth + Errors)

```
Monolith:            middleware.ts (179 lines)
Role in wrong place: lib/errors.ts
Dev fallback:        AUTH_SECRET hardcoded
```

---

## 3. Debt Trends

| Metric                     | Current | Target |
| -------------------------- | ------- | ------ |
| P0 issues                  | 5       | 0      |
| P1 issues                  | 9       | 0      |
| P2 issues                  | 11      | <5     |
| DIP violations             | 6       | 0      |
| God functions (>100 lines) | 3       | 0      |
| Missing transactions       | 1       | 0      |
| Console.log in prod code   | ~10     | 0      |
| Prisma types in interfaces | 3       | 0      |

---

## 4. Cost of Inaction

If debt is not addressed:

- **Security:** SQL injection risk in search, inconsistent auth
- **Reliability:** Data corruption from missing transaction
- **Testability:** Can't unit test use-cases (they depend on concrete classes)
- **Maintainability:** God functions grow with every feature
- **Debugging:** No correlation across request lifecycle

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
