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
    include: ["tests/security/**/*.test.ts"],
    exclude: ["node_modules"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
