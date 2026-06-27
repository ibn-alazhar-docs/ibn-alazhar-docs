# BACKEND_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** API Design, Services, Worker Logic, DRY, SOLID
> **System:** Ibn Al-Azhar Docs

## 1. API Review

**Status:** The API surface is vast but lacks uniform structural conventions.

- **Inconsistent Error Handling:** 31 out of 45 routes manually handle errors instead of leveraging the central `handleRouteError` middleware/wrapper.
- **Inconsistent Authorization:** Multiple competing error classes (`AuthError`, `AuthorizationError`, `ForbiddenError`). Route-level authorization logic is duplicated instead of abstracted.

## 2. Service & Use Case Review

**The "God Class" Anti-Pattern:**

- `DocumentUseCases` (304 lines) violates the Single Responsibility Principle. It manages Document CRUD, folder assignment, tag application, and share link generation.
- `content.ts` (491 lines) handles parsing, navigation, user journeys, search, and categorization.

**Hidden Side Effects:**

- `rate-limit.ts` maintains a module-level `setInterval` for cache cleanup, which leaks into the testing environment and worker processes causing memory/handle leaks.

## 3. SOLID & DRY Deficiencies

- **DRY Violations:**
  - `getPythonCommand` logic is duplicated across multiple worker files.
  - Heading detection regexes are copy-pasted.
  - Zod schemas for identical DTOs are defined inline inside API routes.
- **Open-Closed Principle (OCP) Violations:**
  - `ocr-provider.ts` uses switch statements to determine the OCR engine. Adding a new provider requires modifying core files instead of registering a new strategy.

## 4. Remediation Strategy

1. **Standardize Controllers:** Wrap ALL Next.js API routes with a higher-order function `withAuth(handleRouteError(handler))`.
2. **Extract Validators:** Move all inline Zod schemas to a dedicated `packages/validators` or `src/validators` directory. Ensure strict typing.
3. **Decompose God Classes:**
   - Split `DocumentUseCases`.
   - Refactor `content.ts` into specific domain services (`ContentParser`, `NavigationService`, `SearchService`).
4. **Fix Side Effects:** Remove module-level side effects. Manage background tasks (like memory cleanup) via proper lifecycle hooks or eliminate them if Redis TTL natively handles it.
5. **Apply Strategy Pattern:** Refactor OCR providers to use a factory/registry pattern to adhere to OCP.
