# DEVEX_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** Tooling, Conventions, Folder Structure, Maintainability
> **System:** Ibn Al-Azhar Docs

## 1. Folder Structure & Navigation

**Observations:**
- The repository structure maps reasonably well to a Turborepo/pnpm monorepo.
- **Flaws Detected:**
  - Domain logic is scattered between `apps/web/src/core`, `apps/web/src/lib`, and `packages/pipeline`. The boundary between "what is Web" and "what is Core Business Logic" is indistinguishable.
  - 20 unused/dead component files exist in the frontend directories, causing noise and developer confusion.

## 2. Code Conventions & Naming

**Observations:**
- **Role Typing:** The `role` concept is currently primitive strings (`"ADMIN" | "STUDENT"`) scattered everywhere, rather than imported from a unified type definition.
- **Export Formats:** There is a name collision involving `ExportFormat`. Two different types with the same name represent different concepts.
- **Error Codes:** Developers are forced to rely on tribal knowledge to know whether to use `AuthError`, `AuthorizationError`, or `ForbiddenError`.

## 3. Tooling & Onboarding

**Observations:**
- TypeScript strict mode and ESLint zero-tolerance are excellent.
- **Flaws Detected:**
  - Building/Running typechecks requires executing 4 separate commands (`tsc --noEmit`), which is frustrating.
  - Running tests requires Docker infrastructure locally, but the script `ibn.sh` lacks robust health-checking to verify if Redis/Postgres are actually ready before tests begin, leading to flaky test startups.

## 4. Remediation Strategy

1. **Reorganize Domain Logic:** Create a strict `packages/core` or `apps/web/src/domain` folder that contains pure logic, isolated from Next.js.
2. **Consolidate Types:** Define a global `Role` enum/union type and resolve the `ExportFormat` collision.
3. **Streamline DX:** Update package.json scripts to use `concurrently` or Turborepo pipeline caching to execute typechecks simultaneously. Enhance `ibn.sh` to poll database ports before greenlighting test suites.
