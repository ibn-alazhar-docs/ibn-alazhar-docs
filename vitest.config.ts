import { defineConfig } from "vitest/config";
import path from "path";

const rootAlias = [
  { find: "@", replacement: path.resolve(__dirname, "apps/web/src") },
  {
    find: "@ibn-al-azhar-docs/pipeline",
    replacement: path.resolve(__dirname, "packages/pipeline/src"),
  },
  {
    find: "@ibn-al-azhar-docs/database",
    replacement: path.resolve(__dirname, "packages/database/src"),
  },
  { find: "zod", replacement: path.resolve(__dirname, "node_modules/zod") },
  { find: "minio", replacement: path.resolve(__dirname, "tests/mocks/minio.ts") },
  { find: "ioredis", replacement: path.resolve(__dirname, "tests/mocks/ioredis.ts") },
  { find: "next/server", replacement: path.resolve(__dirname, "tests/mocks/next-server.ts") },
  { find: /^next-intl$/, replacement: path.resolve(__dirname, "tests/mocks/next-intl.tsx") },
  { find: "next-intl/react", replacement: path.resolve(__dirname, "tests/mocks/next-intl.tsx") },
  { find: "next-intl/client", replacement: path.resolve(__dirname, "tests/mocks/next-intl.tsx") },
  { find: "next-intl/server", replacement: path.resolve(__dirname, "tests/mocks/next-intl.tsx") },
];

const frontendAlias = [
  ...rootAlias,
  {
    find: "next/navigation",
    replacement: path.resolve(__dirname, "tests/mocks/next-navigation.tsx"),
  },
  {
    find: "next-auth/react",
    replacement: path.resolve(__dirname, "tests/mocks/next-auth-react.tsx"),
  },
];

export default defineConfig({
  resolve: {
    alias: rootAlias,
  },
  // Load @prisma/client as a full native (node) module rather than letting
  // Vite's SSR transform pipeline process it. The generated client resolves
  // and instantiates completely via node's require path, which guarantees the
  // full delegate surface (findFirst, aggregate, upsert, ...) the repository
  // code relies on when it is imported from a workspace package.
  ssr: {
    external: ["@prisma/client"],
  },
  test: {
    globals: true,
    deps: {
      optimizer: {
        ssr: {
          exclude: ["@prisma/client"],
        },
      },
    },
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
          alias: rootAlias,
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
          alias: rootAlias,
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
          alias: rootAlias,
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
          alias: rootAlias,
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
        },
        esbuild: {
          jsx: "automatic",
        },
        resolve: {
          alias: frontendAlias,
        },
      },
    ],
  },
});
