# Testing Strategy — Ibn Al-Azhar Docs

> **Purpose:** Define the testing approach, tools, and standards for the project.
> **Phase:** 0 (Planning) — Implementation in Phase 1+

---

## Testing Pyramid

```
          ╱╲
         ╱  ╲          E2E (Playwright)
        ╱  5% ╲         ~20 test cases
       ╱──────╲
      ╱        ╲       Integration (Vitest + Supertest)
     ╱   15%    ╲      ~60 test cases
    ╱────────────╲
   ╱              ╲     Component (Vitest + RTL)
  ╱     25%        ╲    ~100 test cases
 ╱──────────────────╲
╱                    ╲   Unit (Vitest)
╱       55%           ╲  ~250 test cases
╱──────────────────────╲
```

## Test Levels

| Level             | Tool                           | Scope                       | Frequency           | Owner          |
| ----------------- | ------------------------------ | --------------------------- | ------------------- | -------------- |
| **Unit**          | Vitest                         | Functions, utilities, logic | Every commit        | Developer      |
| **Component**     | Vitest + React Testing Library | UI components               | Every commit        | Developer      |
| **Integration**   | Vitest + Supertest             | API routes + DB + MinIO     | Every PR            | Developer + QA |
| **E2E**           | Playwright                     | Full user flows             | Every merge to main | QA             |
| **Visual**        | Playwright screenshots         | Visual consistency          | Every merge to main | QA             |
| **Accessibility** | axe-core + Playwright          | WCAG 2.1 AA compliance      | Every PR            | QA             |

## Tools

### Unit & Component Testing

- **Framework:** Vitest
- **Environment:** jsdom
- **Assertions:** Vitest built-in (expect)
- **Component Testing:** @testing-library/react
- **Coverage:** v8 provider, minimum 80%

### E2E Testing

- **Framework:** Playwright
- **Browsers:** Chromium, Firefox, WebKit
- **Features:**
  - Multi-browser testing
  - Mobile emulation
  - Network interception
  - Visual regression
  - Accessibility testing (axe-core)
  - Trace viewer for debugging

### API Testing

- **Framework:** Vitest + Supertest
- **Scope:** All API route handlers
- **Coverage:** Request validation, response format, error handling, auth

## Test Organization

```
apps/web/src/
  components/
    Button.tsx
    Button.test.tsx          # Co-located component tests
  lib/
    utils.ts
    utils.test.ts            # Co-located unit tests
  app/api/
    auth/
      route.ts
      route.test.ts          # Co-located API tests
e2e/
  auth.spec.ts               # E2E test files
  upload.spec.ts
  conversion.spec.ts
  fixtures/                  # Test fixtures
    users.ts
    documents.ts
  pages/                     # Page object models
    login.page.ts
    dashboard.page.ts
```

## Naming Conventions

- Unit tests: `*.test.ts` or `*.test.tsx`
- E2E tests: `*.spec.ts`
- Test files co-located with source files
- Page object models in `e2e/pages/`
- Fixtures in `e2e/fixtures/`

## Coverage Requirements

| Level       | Minimum Coverage    |
| ----------- | ------------------- |
| Unit        | 90%                 |
| Component   | 80%                 |
| Integration | 75%                 |
| E2E         | Critical paths only |
| **Overall** | **80%**             |

## Test Standards

### Unit Tests

- Test pure functions in isolation
- Mock external dependencies
- Use descriptive test names: `it('should return formatted Arabic date')`
- Arrange-Act-Assert pattern

### Component Tests

- Test behavior, not implementation
- Test loading, empty, error, and success states
- Test RTL behavior (dir="rtl", text alignment)
- Test accessibility (aria labels, keyboard navigation)
- Test responsive behavior

### Integration Tests

- Test API routes with real database (test DB)
- Test file upload with MinIO
- Test auth flows with NextAuth.js
- Clean up test data after each test

### E2E Tests

- Test critical user flows only
- Use page object models for maintainability
- Test Arabic-first and RTL-first behavior
- Test mobile and desktop views
- Use fixtures for test data
- Run in CI on every merge to main

## Accessibility Testing

- All components must pass axe-core with zero violations
- Test keyboard navigation
- Test screen reader compatibility
- Test color contrast (WCAG AA)
- Test focus management

## RTL Testing

- All layouts must work with `dir="rtl"`
- Test text alignment and direction
- Test icon positioning
- Test navigation flow
- Test form inputs and labels

## CI Integration

- Unit and component tests run on every PR
- Integration tests run on every PR
- E2E tests run on every merge to main
- Coverage report uploaded to PR comments
- Failed tests block merge

## Test Data

- Use seed scripts for test data
- Use factories for dynamic data generation
- Never use production data in tests
- Clean up test data after each test run

## Phase 1 Testing Scope

| Feature               | Unit | Component | Integration | E2E |
| --------------------- | ---- | --------- | ----------- | --- |
| Auth (login/register) | ✅   | ✅        | ✅          | ✅  |
| App Shell             | ❌   | ✅        | ❌          | ✅  |
| RTL/i18n              | ❌   | ✅        | ❌          | ✅  |
| Database schema       | ✅   | ❌        | ✅          | ❌  |
| Docker Compose        | ❌   | ❌        | ✅          | ❌  |

## Phase 2+ Testing Scope (Preview)

| Feature             | Unit | Component | Integration | E2E |
| ------------------- | ---- | --------- | ----------- | --- |
| File Upload         | ✅   | ✅        | ✅          | ✅  |
| Folder Management   | ✅   | ✅        | ✅          | ✅  |
| Conversion Pipeline | ✅   | ❌        | ✅          | ✅  |
| Export              | ✅   | ✅        | ✅          | ✅  |
| Search              | ✅   | ✅        | ✅          | ✅  |
| Share Links         | ✅   | ✅        | ✅          | ✅  |

---

**Last Updated:** 2026-05-21
