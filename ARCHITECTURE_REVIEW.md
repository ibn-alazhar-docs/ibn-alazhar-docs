# ARCHITECTURE_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** Architectural Boundaries, Cohesion, Coupling, Layering
> **System:** Ibn Al-Azhar Docs

## 1. Boundary Analysis

The application currently blurs the lines between Application Services (Use Cases) and Infrastructure (Prisma, Web framework).

**Violations Detected:**

- **Leaking Abstractions:** Prisma concepts (`Prisma.TransactionClient`, Prisma-generated types) leak directly into the Web layer (API routes).
- **Fat Controllers:** Next.js API routes are performing domain logic (e.g., tag merge algorithms, conditional state updates).
- **God Modules:** `packages/pipeline/src/queue.ts` acts as a nexus of coupling, handling queue connections, job creation, worker definition, and dead-letter queues simultaneously.

## 2. Dependency Direction

**The Dependency Inversion Principle (DIP) is actively violated.**

- **Current State:** The high-level Use Cases and API handlers depend explicitly on the low-level `prisma` client.
- **Impact:** Testing requires a live database or complex Prisma mocks. Switching database vendors or scaling to separate microservices becomes impossible without a rewrite.
- **Required Fix:** Introduce explicit Repository Interfaces in the Domain layer. The infrastructure layer must implement these.

## 3. Cohesion vs. Coupling

- **Low Cohesion:** `DocumentUseCases` (304 lines) orchestrates Documents, Tags, Bulk Operations, and Share Links. These are separate bounded contexts forced into a single module.
- **High Coupling:** `export/metadata.ts` and `share-helpers.ts` are tightly bound to the Prisma singleton. This prevents them from being extracted into isolated background workers easily.

## 4. Architectural Drift

The original architectural intent (Clean Architecture/Hexagonal) has drifted:

1. **The missing Use-Case layer:** Tags, Users, Search, and Conversions subsystems completely lack Use Cases. API routes directly mutate DB state.
2. **Framework Entanglement:** Next.js specific objects (`NextRequest`) are sometimes passed deeply into utility functions, tying business logic to the edge runtime framework.

## 5. Remediation Strategy

1. **Enforce Strict Layering:** Run lint rules (`eslint-plugin-boundaries` or simple folder structures) to forbid imports from `infrastructure/*` into `core/*` or `domain/*`.
2. **Segregate God Classes:** Break `DocumentUseCases` into `DocumentCrudUseCases`, `DocumentTaggingUseCases`, `DocumentSharingUseCases`.
3. **Decouple Prisma:** Wrap all data access in Repositories. Pass repositories via Dependency Injection (or higher-order functions) to Use Cases.
