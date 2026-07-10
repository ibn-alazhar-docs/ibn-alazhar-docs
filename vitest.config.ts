import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
      "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
      zod: path.resolve(__dirname, "node_modules/zod"),
      minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
      ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
      "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
    },
  },
  test: {
    globals: true,
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
    projects: [
      // Unit tests
      {
        test: {
          name: "unit",
          environment: "node",
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/backend/**/*.test.ts", "tests/frontend/**/*.test.{ts,tsx}"],
          exclude: [
            "tests/e2e/**",
            "tests/integration/**",
            "tests/security/**",
            "tests/load/**",
            "tests/soak/**",
            "tests/recovery/**",
            "tests/backup/**",
            "tests/fuzz/**",
            "tests/pentest/**",
            "tests/edge/**",
            "tests/api/**",
          ],
          coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["packages/**/*.ts", "apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
            exclude: ["node_modules", "dist", "build", "**/*.test.ts", "**/*.test.tsx"],
          },
        },
      },
      // Integration tests
      {
        test: {
          name: "integration",
          environment: "node",
          setupFiles: ["./tests/setup.ts", "./tests/integration/setup.ts"],
          include: ["tests/integration/**/*.test.ts"],
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 60000,
        },
      },
      // API tests
      {
        test: {
          name: "api",
          environment: "node",
          setupFiles: ["./tests/setup.ts", "./tests/api/setup.ts"],
          include: ["tests/api/**/*.test.ts"],
          testTimeout: 30000,
        },
      },
      // Security tests
      {
        test: {
          name: "security",
          environment: "node",
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/security/**/*.test.ts"],
          testTimeout: 30000,
        },
      },
      // Frontend tests (jsdom)
      {
        test: {
          name: "frontend",
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts", "./tests/frontend/setup.ts"],
          include: ["tests/frontend/**/*.test.{ts,tsx}"],
          testTimeout: 30000,
        },
      },
    ],
  },
});
