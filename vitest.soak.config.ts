import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
      "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
      ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/soak/**/*.test.ts"],
    exclude: ["node_modules"],
    testTimeout: 600000, // 10 min for soak tests
    hookTimeout: 300000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ["--expose-gc"],
      },
    },
    tags: ["soak"],
  },
});
