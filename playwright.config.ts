import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // pg-pipeline.e2e.spec.ts is a vitest file (import from "vitest"), not a Playwright test; it is managed by the vitest e2e project when E2E_FULL=1.
  testIgnore: /.*\.e2e\.spec\.ts/,
  timeout: 120000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : 1,
  // One baseline per project — no platform suffix, so CI (linux) and local
  // (linux/macos) runs share the same PNGs and cannot drift apart.
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  reporter: process.env.CI ? [["blob", { outputDir: "test-results" }]] : "html",
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
    // AUTH_URL must pin the server to plain-HTTP localhost so NextAuth keeps
    // the session cookie non-secure (middleware/auth.ts) and login settles on
    // /dashboard instead of timing out in waitForURL.
    command: process.env.CI
      ? "PLAYWRIGHT_TEST=true AUTH_URL=http://127.0.0.1:3000 AUTH_SECRET=test-secret-do-not-use-in-prod pnpm --filter @ibn-al-azhar-docs/web exec next start -H 127.0.0.1 -p 3000"
      : "PLAYWRIGHT_TEST=true AUTH_URL=http://127.0.0.1:3000 AUTH_SECRET=test-secret-do-not-use-in-prod pnpm --filter @ibn-al-azhar-docs/web exec next dev -H 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
  },
});
