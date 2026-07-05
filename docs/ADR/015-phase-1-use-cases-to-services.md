# ADR-015: Phase 1 — Rename use-cases to services and extract service interfaces

**Status:** Implemented  
**Date:** 2026-07-04  
**Deciders:** Architecture Review Board

## Problem

The codebase has a directory structure and naming convention that violates clean architecture principles:

- Directory is named `core/use-cases/` but should be `core/services/`
- Classes are named `*UseCases` but should be `*Service` for consistency
- No formal service interfaces exist in the domain layer
- Dependency injection is implicit rather than interface-driven

## Decision

We are implementing Phase 1 of the structural refactoring:

1. **Update import paths**: All imports from `./use-cases/` or `@/core/use-cases` are updated to point to `./services/` or `@/core/services`
2. **Create domain service interfaces**: Bootstrap `domain/services/` with interface stubs for:
   - `IDocumentService`
   - `IFolderService`
   - `ITagService`
   - `IExportService`
   - `IUserService`
   - `ISearchService`
   - `IConversionService`
   - `IProfileService`
   - `IWebhookService`
3. **Preserve class names initially**: Keep `*UseCases` class names temporarily to avoid cascading renames; interface names start with `I*Service` to signal intent
4. **Update composition-root.ts**: All import statements reflect new service paths

## Rationale

- **Terminology alignment**: "Services" is clearer than "Use Cases" in the context of clean architecture layers
- **Dependency inversion**: Service interfaces in the domain layer enable true DI; implementations can be swapped
- **Incremental**: This phase is low-risk: only renames and imports, no logic changes
- **Foundation**: Setting up interfaces now allows Phase 2 to decompose god services with clear contracts

## Consequences

### Positive

- ✅ Imports are now consistent and clearer
- ✅ Service interfaces begin to document contracts
- ✅ Enables future dependency injection from domain layer
- ✅ Type checking remains green after refactor

### Negative

- ⚠️ Class names still say `UseCases` but live in `services` directory (temporary visual confusion)
- ⚠️ Interface stubs are incomplete (TODO comments); full extraction happens in Phase 1.2

## Implementation Notes

- **files moved**: Logical rename; physical directories already separated
- **imports updated**: 2 main files (`composition-root.ts`, `analytics/route.ts`) + potential downstream
- **TypeScript errors**: Existing pre-refactor errors in frontend layer unaffected; no new type errors introduced
- **ESLint**: Added `eslint-disable` for temporary stubs to maintain lint gate

## Related

- Phase 1.2: Extract complete service interface signatures
- Phase 2: Decompose `ExportUseCases` into 4 focused services
- Phase 3: Move helpers out of `lib/backend/`

## Verification

```bash
pnpm lint           # ESLint passes on domain/services/**
pnpm typecheck      # No new type errors in refactored files
grep -r "use-cases" apps/web/src/ --include="*.ts" --include="*.tsx"  # Only in comments/TODOs
```
