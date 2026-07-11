# 📐 Test Conventions

> Standards for writing and maintaining tests in Ibn Al-Azhar Docs.

## File Naming

| Test Type         | Pattern                                   | Example                                        |
| ----------------- | ----------------------------------------- | ---------------------------------------------- |
| Unit (backend)    | `tests/backend/<module-name>.test.ts`     | `tests/backend/config.test.ts`                 |
| API               | `tests/api/<endpoint-name>.test.ts`       | `tests/api/documents.test.ts`                  |
| Frontend          | `tests/frontend/<feature>.test.ts`        | `tests/frontend/validators-auth.test.ts`       |
| Integration       | `tests/integration/<flow-name>.test.ts`   | `tests/integration/full-pipeline-flow.test.ts` |
| E2E               | `tests/e2e/<feature>.spec.ts`             | `tests/e2e/auth-flows.spec.ts`                 |
| Visual regression | `tests/e2e/visual-<feature>.spec.ts`      | `tests/e2e/visual-pages.spec.ts`               |
| Accessibility     | `tests/e2e/a11y-<feature>.spec.ts`        | `tests/e2e/a11y-keyboard.spec.ts`              |
| Fuzz              | `tests/fuzz/<endpoint-name>-fuzz.test.ts` | `tests/fuzz/documents-fuzz.test.ts`            |
| Security          | `tests/security/<area>.test.ts`           | `tests/security/upload-security.test.ts`       |
| Pentest           | `tests/pentest/owasp-<category>.test.ts`  | `tests/pentest/owasp-injection.test.ts`        |
| Edge              | `tests/edge/<category>.test.ts`           | `tests/edge/race-conditions.test.ts`           |
| Load (k6)         | `tests/load/k6/<scenario>.js`             | `tests/load/k6/upload-scenarios.js`            |
| Load (Vitest)     | `tests/load/<area>.test.ts`               | `tests/load/db-concurrency.test.ts`            |
| Recovery          | `tests/recovery/<area>.test.ts`           | `tests/recovery/database-recovery.test.ts`     |
| Backup            | `tests/backup/<area>.test.ts`             | `tests/backup/database-backup.test.ts`         |
| Soak              | `tests/soak/<scenario>.test.ts`           | `tests/soak/memory-leak.test.ts`               |

## Import Patterns

### Backend Tests (`tests/backend/`)

Use relative paths to import source modules:

```typescript
import { config } from "../../packages/pipeline/src/config";
import { OcrManager } from "../../packages/pipeline/src/ocr";
```

### API Tests (`tests/api/`)

Use the `@/` alias (resolved by all vitest configs):

```typescript
import { GET } from "@/app/api/documents/route";
import { POST } from "@/app/api/upload/route";
```

Source-side imports use `@ibn-al-azhar-docs/pipeline` and `@ibn-al-azhar-docs/database`.

### Frontend Tests (`tests/frontend/`)

Use `@/` alias for app source:

```typescript
import { validateAuth } from "@/shared/validators/auth";
import { buildFolderTree } from "@/shared/build-folder-tree";
```

Frontend mocks are available via aliases:

- `next/navigation` → `tests/mocks/next-navigation.ts`
- `next-intl` → `tests/mocks/next-intl.ts`
- `next-intl/routing` → `tests/mocks/next-intl-routing.ts`
- `next-auth/react` → `tests/mocks/next-auth-react.ts`

### Integration Tests (`tests/integration/`)

```typescript
import { describe, it, expect } from "vitest";
```

## Mocking

### Global Mocks (in `tests/setup.ts`)

Used by all vitest configs:

- `@/lib/backend/auth` — `auth()` function
- `next/server` — `NextResponse` and `NextRequest` mocks
- `next/navigation` — `redirect`, `useRouter`, `usePathname`, `useSearchParams`

### API Mocks (in `tests/api/setup.ts`)

Used by API and fuzz test configs:

- `@/middleware/auth-guards` — `requireAuth`, `requireRole`, `withAuth`, `withAdminAuth`
- `mockSession` — configurable user session (id, name, email, role)
- Session is reset before each test via `beforeEach`

### CJS Dependency Mocks (via vitest aliases)

These CJS modules cannot be intercepted by `vi.mock` across package boundaries, so they are mocked via aliases in every vitest config:

| Module        | Mock File                    |
| ------------- | ---------------------------- |
| `minio`       | `tests/mocks/minio.ts`       |
| `ioredis`     | `tests/mocks/ioredis.ts`     |
| `next/server` | `tests/mocks/next-server.ts` |

### Prisma Mocking

`tests/api/mocks/` provides:

- `mock-prisma.ts` — full Prisma client mock
- `mock-db-package.ts` — database package mock
- `mock-db-helpers.ts` — helper utilities for mock DB setup

### MSW (Mock Service Worker)

For frontend E2E and component testing:

- `apps/web/src/lib/msw/handlers.ts` — API handlers
- `apps/web/src/lib/msw/server.ts` — server setup
- `apps/web/src/lib/msw/browser.ts` — browser worker
- `apps/web/src/lib/msw/init.ts` — initialization

## Test Structure

### General Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ModuleName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("feature or method", () => {
    it("should do something specific", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### API Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/documents/route";

describe("GET /api/documents", () => {
  it("returns 200 with documents list", async () => {
    const request = new Request("http://localhost:3000/api/documents");
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("returns 401 without auth", async () => {
    // Mock session removal via mockSession.user = null
    const { mockSession } = await import("../setup");
    mockSession.user = null as any;

    const request = new Request("http://localhost:3000/api/documents");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

### Fuzz Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import { uploadSchema } from "@/shared/validators/document";

describe("uploadSchema fuzz", () => {
  const invalidInputs = [
    null,
    undefined,
    "",
    "not-a-file",
    { file: "string instead of File" },
    { file: new File([""], "test.exe", { type: "application/x-msdownload" }) },
    { file: new File([new ArrayBuffer(11 * 1024 * 1024)], "large.pdf") },
  ];

  it.each(invalidInputs)("rejects invalid input: %s", (input) => {
    const result = uploadSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
```

### E2E Test Pattern (Playwright)

```typescript
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test.describe("Auth flows", () => {
  test("user can log in", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("test@example.com", "password");
    await expect(page.locator("[data-testid='dashboard']")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    // ...
  });
});
```

### Accessibility Test Pattern

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage has no a11y violations", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

## Vitest Configuration

Each test category has its own vitest config extending the base:

| Config                         | Environment | Timeout | Inline Deps                  | Notes                                          |
| ------------------------------ | ----------- | ------- | ---------------------------- | ---------------------------------------------- |
| `vitest.config.ts`             | node        | 30s     | next, bullmq, ioredis, minio | Main config, excludes E2E/integration/security |
| `vitest.api.config.ts`         | node        | 30s     | —                            | Zod v4 via explicit path                       |
| `vitest.frontend.config.ts`    | jsdom       | 5s      | motion, next-intl, next-auth | CSS disabled                                   |
| `vitest.integration.config.ts` | node        | 30s     | jszip                        | —                                              |
| `vitest.security.config.ts`    | node        | 30s     | —                            | —                                              |
| `vitest.pentest.config.ts`     | node        | 30s     | —                            | —                                              |
| `vitest.fuzz.config.ts`        | node        | 30s     | —                            | Zod v4                                         |
| `vitest.edge.config.ts`        | node        | 60s     | —                            | Longer timeout for concurrent                  |
| `vitest.load.config.ts`        | node        | 120s    | —                            | singleFork: true                               |
| `vitest.recovery.config.ts`    | node        | 60s     | —                            | —                                              |
| `vitest.backup.config.ts`      | node        | 60s     | —                            | —                                              |

### Adding a new vitest config

1. Create `vitest.<category>.config.ts` at project root
2. Import `defineConfig` from `vitest/config`
3. Add `@` and package aliases in `resolve.alias`
4. Set `test.include` to the test directory pattern
5. Add configuration-specific `test.setupFiles` if needed
6. Add the script to `package.json`

## Test Data & Fixtures

- Large test documents → `packages/pipeline/test-data/`
- Mock DB helpers → `tests/api/mocks/`
- Global vitest mocks → `tests/mocks/`
- E2E POMs → `tests/e2e/pages/`
- Integration helpers → `tests/integration/helpers/db.ts`
- Load test helpers → `tests/load/k6/helpers.js`

## Coverage Configuration

Coverage defined in `vitest.config.ts`:

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  include: ["packages/**/*.ts", "apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
  exclude: ["node_modules", "dist", "build", "**/*.test.ts", "**/*.test.tsx"],
}
```

Frontend coverage in `vitest.frontend.config.ts`:

```typescript
coverage: {
  include: ["apps/web/src/ui/**/*.tsx", "apps/web/src/state/**/*.ts"],
  exclude: ["**/*.stories.tsx", "**/*.test.tsx"],
}
```

## Best Practices

1. **Test behavior, not implementation** — assert on output/states, not internal calls
2. **One assertion per test** — use `it.each` for data-driven tests
3. **Isolation** — no shared mutable state between tests; use `beforeEach` reset
4. **Descriptive names** — `it("returns 400 when file exceeds size limit")`
5. **Test error paths** — every happy path should have at least one error counterpart
6. **Mock at boundaries** — mock external services (DB, Redis, S3), not internal logic
7. **Avoid `test.only`** — never commit focused tests
8. **Snapshots** — commit visual regression snapshots; update deliberately
9. **Flaky tests** — mark with `test.slow()` and investigate; never silence
10. **E2E selectors** — prefer `getByRole`, `getByTestId`, `getByLabel` over CSS/XPath
11. **Load tests** — use `singleFork: true` to avoid shared-state issues
12. **CI parallelism** — E2E tests use `fullyParallel: true` in Playwright config
13. **Secrets** — never commit real secrets; use CI env vars or mocked values
