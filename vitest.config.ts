import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [
      "node_modules",
      "tests/e2e",
      "tests/integration",
      "tests/security",
      "tests/pentest",
      "tests/load",
      "tests/recovery",
      "tests/backup",
      "tests/api",
      ".opencode",
      ".opencode_backups",
      ".next",
      "dist",
      "build",
      "out",
      "coverage",
      "archive",
      "docs",
      "specs",
      "governance",
      "tools",
      ".agents",
      ".specify",
      "00_Inbox",
      "09_Archive",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/**/*.ts", "apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
      exclude: ["node_modules", "dist", "build", "**/*.test.ts", "**/*.test.tsx"],
    },
  },
});
