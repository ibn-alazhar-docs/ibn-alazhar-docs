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
      "next-intl": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
      "next-intl/react": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
      "next-intl/client": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
      "next-intl/server": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
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
          globals: true,
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/backend/**/*.test.ts"],
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
            "tests/frontend/**",
          ],
          coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["packages/**/*.ts", "apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
            exclude: ["node_modules", "dist", "build", "**/*.test.ts", "**/*.test.tsx"],
          },
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "apps/web/src"),
            "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
            "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
            zod: path.resolve(__dirname, "node_modules/zod"),
            minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
            ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
            "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
            "next-intl": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/react": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/client": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/server": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
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
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "apps/web/src"),
            "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
            "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
            zod: path.resolve(__dirname, "node_modules/zod"),
            minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
            ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
            "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
            "next-intl": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/react": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/client": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/server": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
          },
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
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "apps/web/src"),
            "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
            "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
            zod: path.resolve(__dirname, "node_modules/zod"),
            minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
            ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
            "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
            "next-intl": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/react": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/client": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/server": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
          },
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
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "apps/web/src"),
            "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
            "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
            zod: path.resolve(__dirname, "node_modules/zod"),
            minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
            ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
            "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
            "next-intl": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/react": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/client": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/server": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
          },
        },
      },
      // Frontend tests (jsdom)
      {
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./tests/setup.ts", "./tests/frontend/setup.tsx"],
          include: ["tests/frontend/**/*.test.{ts,tsx}"],
          testTimeout: 30000,
          deps: {
            inline: ["sonner", "motion/react"],
          },
          isolateModules: true,
          globalSetup: ["./tests/global-setup.tsx"],
        },
        esbuild: {
          jsx: "automatic",
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "apps/web/src"),
            "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
            "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
            zod: path.resolve(__dirname, "node_modules/zod"),
            minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
            ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
            "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
            "next-intl": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/react": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/client": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
            "next-intl/server": path.resolve(__dirname, "tests/mocks/next-intl.tsx"),
          },
        },
      },
    ],
  },
});
