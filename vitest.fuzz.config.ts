import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
      "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
      "@ibn-al-azhar-docs/shared": path.resolve(__dirname, "packages/shared/src"),
      zod: "/home/abed/Data/03_Professional/Projects/Ibn_Al_Azhar_Docs/node_modules/.pnpm/zod@4.4.3/node_modules/zod",
    },
    conditions: ["development", "import"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/fuzz/**/*.test.ts"],
    exclude: ["node_modules"],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ["tests/api/setup.ts"],
  },
});
