import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // pg-pipeline.e2e.spec.ts is a vitest file (import from "vitest"), not a Playwright test; it is managed by the vitest e2e project when E2E_FULL=1.
  testIgnore: /.*\.e2e\.spec\.ts/,
  timeout: 300000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-dark",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "dark",
      },
    },
  ],
  webServer: {
    command: "PLAYWRIGHT_TEST=true pnpm --filter @ibn-al-azhar-docs/web exec next dev -H 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
  },
});
