# MASTER_REFACTOR_PLAN.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Phased refactoring plan for entire system
> **Methodology:** Mazen Canda Refactor — aggressive on structure, uncompromising on behavior
> **System:** Ibn Al-Azhar Docs

---

## Guiding Principles

1. **Zero behavior change** — Every commit must pass `pnpm ci:all` and `pnpm test`
2. **One move per commit** — Each commit is a single behavior-preserving transformation
3. **SOLID as diagnostic, not permission** — Only add abstraction when it reduces total diff
4. **Verify after each commit** — `pnpm typecheck && pnpm test`

---

## Phase Overview

| Phase | Focus                                | Effort   | Risk   | Prereqs    |
| ----- | ------------------------------------ | -------- | ------ | ---------- |
| **A** | Foundation: Prisma migration + types | 1 day    | LOW    | None       |
| **B** | Domain layer: DIP completion         | 2-3 days | LOW    | Phase A    |
| **C** | Use-case cleanup: God facades        | 2 days   | MEDIUM | Phase B    |
| **D** | Repository cleanup: Prisma leaks     | 2 days   | MEDIUM | Phase B    |
| **E** | API layer: Routes + middleware       | 3 days   | MEDIUM | Phase C, D |
| **F** | Worker cleanup: Export + pipeline    | 2-3 days | HIGH   | Phase D    |
| **G** | Security hardening                   | 2 days   | LOW    | Phase E    |
| **H** | Observability                        | 2 days   | LOW    | Phase F    |
| **I** | Frontend polish                      | 2-3 days | LOW    | Phase E    |
| **J** | Final cleanup + documentation        | 1 day    | LOW    | All phases |

---

## Phase A: Foundation

**Goal:** Clean Prisma types, move misplaced domain concepts

### Tasks

| #   | Task                                                        | Files                                           | Commit Message                                        |
| --- | ----------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| A1  | Move `Role` type from `lib/errors.ts` to `domain/types.ts`  | `lib/errors.ts`, `domain/types.ts`, 5 consumers | `refactor: move Role type from infra to domain layer` |
| A2  | Move `isAdminRole` from `lib/errors.ts` to `domain/auth.ts` | `lib/errors.ts`, `domain/auth.ts`, 4 consumers  | `refactor: move isAdminRole to domain layer`          |
| A3  | Remove duplicate `isAdmin` in `lib/auth-guards.ts`          | `lib/auth-guards.ts`                            | `refactor: remove duplicate isAdmin function`         |
| A4  | Extract `OwnedWhere` type from `lib/errors.ts`              | `lib/errors.ts`, `domain/types.ts`, 2 consumers | `refactor: move OwnedWhere to domain types`           |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase B: Domain Layer — DIP Completion

**Goal:** Complete Dependency Inversion for all use-cases

### Tasks

| #   | Task                                                       | Files                                                        | Commit Message                                         |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| B1  | Create `ITagRepository` interface                          | `domain/repositories/tag.repository.interface.ts`            | `refactor: extract ITagRepository interface`           |
| B2  | Create `IFolderRepository` interface                       | `domain/repositories/folder.repository.interface.ts`         | `refactor: extract IFolderRepository interface`        |
| B3  | Create `IUserRepository` interface                         | `domain/repositories/user.repository.interface.ts`           | `refactor: extract IUserRepository interface`          |
| B4  | Create `IConversionJobRepository` interface                | `domain/repositories/conversion-job.repository.interface.ts` | `refactor: extract IConversionJobRepository interface` |
| B5  | Create `IShareRepository` interface                        | `domain/repositories/share.repository.interface.ts`          | `refactor: extract IShareRepository interface`         |
| B6  | Move `SearchRepositoryInterface` to `domain/repositories/` | `domain/repositories/search.repository.interface.ts`         | `refactor: move search interface to domain`            |
| B7  | Wire new interfaces in `composition-root.ts`               | `core/composition-root.ts`                                   | `refactor: register new repository interfaces`         |
| B8  | Update use-cases to use interfaces                         | 6 use-case files                                             | `refactor: inject interfaces into remaining use-cases` |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase C: Use-Case Cleanup

**Goal:** Eliminate god facades, reduce method count

### Tasks

| #   | Task                                           | Files                                         | Commit Message                                    |
| --- | ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| C1  | Eliminate DocumentUseCases god facade          | `document.use-cases.ts`, API routes           | `refactor: eliminate DocumentUseCases god facade` |
| C2  | Split FolderUseCases long methods              | `folder.use-cases.ts`                         | `refactor: split FolderUseCases long methods`     |
| C3  | Split SearchUseCases into commands/queries     | `search.use-cases.ts`                         | `refactor: split SearchUseCases into CQRS-style`  |
| C4  | Move raw SQL from SearchUseCases to repository | `search.use-cases.ts`, `search.repository.ts` | `refactor: move SQL construction to repository`   |
| C5  | Add tag merge transaction                      | `tag.use-cases.ts:83-98`                      | `refactor: add transaction to tag merge`          |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase D: Repository Cleanup

**Goal:** Remove Prisma leaks, standardize interfaces

### Tasks

| #   | Task                                                    | Files                                        | Commit Message                                          |
| --- | ------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| D1  | Remove `Prisma` types from DocumentRepository interface | `domain/repositories/document.repository.ts` | `refactor: remove Prisma types from document interface` |
| D2  | Remove `Prisma` types from FolderRepository interface   | `domain/repositories/folder.repository.ts`   | `refactor: remove Prisma types from folder interface`   |
| D3  | Merge raw/typed repository variants                     | `document.repository.ts`                     | `refactor: merge document repository variants`          |
| D4  | Add count methods to repositories                       | 5 repositories                               | `refactor: add count methods to repositories`           |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase E: API Layer Cleanup

**Goal:** Move business logic out of routes, split middleware

### Tasks

| #   | Task                                       | Files                                        | Commit Message                                                 |
| --- | ------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------- |
| E1  | Extract export business logic from route   | `api/export/route.ts`, `export.use-cases.ts` | `refactor: extract export business logic to use-case`          |
| E2  | Extract stream business logic from route   | `api/stream/route.ts`, `stream.use-cases.ts` | `refactor: extract stream logic to use-case`                   |
| E3  | Extract upload business logic from route   | `api/upload/route.ts`, `upload.use-case.ts`  | `refactor: extract upload validation to use-case`              |
| E4  | Split middleware.ts into composable layers | `middleware.ts` → `middleware/*.ts`          | `refactor: split monolithic middleware into composable layers` |
| E5  | Standardize error handling across routes   | `route-helpers.ts`, API routes               | `refactor: standardize error mapping`                          |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase F: Worker & Pipeline Cleanup

**Goal:** Break down god functions, extract concerns

### Tasks

| #   | Task                                         | Files                                         | Commit Message                                          |
| --- | -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| F1  | Split text/clean.ts into pipeline stages     | `packages/pipeline/src/text/clean.ts`         | `refactor: split text clean into composable stages`     |
| F2  | Split export-handler.ts into format handlers | `workers/export-worker/src/export-handler.ts` | `refactor: split export handler into format handlers`   |
| F3  | Extract Google Drive logic from export       | `export-handler.ts`, `google-drive.ts`        | `refactor: extract Google Drive integration`            |
| F4  | Split types.ts into domain-specific files    | `packages/pipeline/src/types.ts`              | `refactor: split pipeline types into domain files`      |
| F5  | Split storage.ts into upload/download        | `packages/pipeline/src/storage.ts`            | `refactor: split storage module by responsibility`      |
| F6  | Replace console.warn with logger             | Pipeline modules                              | `refactor: replace console.warn with structured logger` |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase G: Security Hardening

**Goal:** Address OWASP gaps

### Tasks

| #   | Task                                     | Files                             | Commit Message                                    |
| --- | ---------------------------------------- | --------------------------------- | ------------------------------------------------- |
| G1  | Add HSTS and Permissions-Policy headers  | `middleware.ts` or new middleware | `feat: add HSTS and Permissions-Policy headers`   |
| G2  | Remove dev secret fallback in production | `lib/auth.ts`                     | `fix: remove hardcoded AUTH_SECRET fallback`      |
| G3  | Add account lockout                      | `lib/auth.ts`                     | `feat: add account lockout after failed attempts` |
| G4  | Add per-user rate limiting               | `middleware.ts`                   | `feat: add per-user rate limiting`                |
| G5  | Add audit logging for security actions   | `lib/audit.ts`                    | `feat: add audit logging for security actions`    |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase H: Observability

**Goal:** Unified logging, request tracing

### Tasks

| #   | Task                                         | Files              | Commit Message                                        |
| --- | -------------------------------------------- | ------------------ | ----------------------------------------------------- |
| H1  | Unify logging across all components          | Pipeline, workers  | `refactor: unify logging with Pino across components` |
| H2  | Add request ID middleware                    | `middleware.ts`    | `feat: add request ID for log correlation`            |
| H3  | Enhance health checks with component details | `health-server.ts` | `feat: add component-level health status`             |
| H4  | Integrate error tracking (optional)          | Config             | `feat: add Sentry error tracking integration`         |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase I: Frontend Polish

**Goal:** RTL compliance, accessibility

### Tasks

| #   | Task                                    | Files               | Commit Message                                           |
| --- | --------------------------------------- | ------------------- | -------------------------------------------------------- |
| I1  | Audit remaining physical CSS (ml/mr)    | Frontend components | `refactor: replace physical CSS with logical properties` |
| I2  | Add ARIA labels to interactive elements | Frontend components | `feat: add ARIA labels for accessibility`                |
| I3  | Implement focus management for modals   | Frontend components | `feat: implement focus management for modals`            |
| I4  | Add keyboard navigation for folder tree | Frontend components | `feat: add keyboard navigation for folder tree`          |

### Verification

```bash
pnpm typecheck && pnpm test
```

---

## Phase J: Final Cleanup + Documentation

**Goal:** Update docs, remove dead code, final polish

### Tasks

| #   | Task                                          | Files             | Commit Message                                |
| --- | --------------------------------------------- | ----------------- | --------------------------------------------- |
| J1  | Update AGENTS.md with refactored architecture | `AGENTS.md`       | `docs: update architecture after refactor`    |
| J2  | Update CONTRIBUTING.md                        | `CONTRIBUTING.md` | `docs: update contributing guide`             |
| J3  | Remove analysis documents from root           | `*_ANALYSIS.md`   | `chore: remove temporary analysis documents`  |
| J4  | Final codebase review                         | All               | `chore: final codebase review after refactor` |

### Verification

```bash
pnpm ci:all
```

---

## Risk Assessment

| Phase | Risk Level | Mitigation                            |
| ----- | ---------- | ------------------------------------- |
| A     | LOW        | Type moves only, no behavior change   |
| B     | LOW        | Interface extraction, DI wiring       |
| C     | MEDIUM     | Use-case restructuring, route changes |
| D     | MEDIUM     | Repository interface changes          |
| E     | MEDIUM     | Route refactoring, middleware split   |
| F     | HIGH       | Pipeline changes, worker changes      |
| G     | LOW        | Security additions                    |
| H     | LOW        | Logging additions                     |
| I     | LOW        | CSS/accessibility changes             |
| J     | LOW        | Documentation                         |

---

## Success Criteria

After all phases complete:

- [ ] 0 DIP violations
- [ ] 0 god functions (>100 lines)
- [ ] 0 missing transactions on critical paths
- [ ] 0 Prisma types in repository interfaces
- [ ] 0 console.log/warn in production code
- [ ] 100% use-cases injected via composition-root
- [ ] Request ID correlation across all logs
- [ ] All security headers present
- [ ] All ARIA labels on interactive elements
- [ ] `pnpm ci:all` passes

---

_This plan represents the proposed refactoring approach. Each phase must be approved before implementation begins._
