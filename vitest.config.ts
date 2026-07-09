import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
      "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
      zod: "/home/abed/Data/03_Professional/Projects/Ibn_Al_Azhar_Docs/node_modules/.pnpm/zod@4.4.3/node_modules/zod",
      // Mock CJS deps via alias — vi.mock cannot intercept CJS imports across module boundaries
      minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
      ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
      "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    server: {
      deps: {
        inline: [
          "next",
          "next/server",
          "@google/generative-ai",
          "@googleapis/drive",
          "google-auth-library",
          "ioredis",
          "bullmq",
          "minio",
        ],
      },
    },
    setupFiles: ["./tests/setup.ts", "./tests/api/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [
      "node_modules",
      "tests/e2e",
      "tests/integration",
      "tests/security",
      "tests/pentest",
      "tests/load",
      "tests/soak",
      "tests/recovery",
      "tests/backup",
      "tests/frontend",
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
