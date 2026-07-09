import { defineConfig } from "vitest/config";
import path from "path";

// Frontend test config: jsdom DOM + React Testing Library.
// Mirrors the alias map in vitest.config.ts so `@/...` resolves to apps/web/src.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ibn-al-azhar-docs/pipeline": path.resolve(__dirname, "packages/pipeline/src"),
      "@ibn-al-azhar-docs/database": path.resolve(__dirname, "packages/database/src"),
      "@ibn-al-azhar-docs/shared": path.resolve(__dirname, "packages/shared/src"),
      minio: path.resolve(__dirname, "tests/mocks/minio.ts"),
      ioredis: path.resolve(__dirname, "tests/mocks/ioredis.ts"),
      "next/server": path.resolve(__dirname, "tests/mocks/next-server.ts"),
      "next/navigation": path.resolve(__dirname, "tests/mocks/next-navigation.ts"),
      "next-intl/routing": path.resolve(__dirname, "tests/mocks/next-intl-routing.ts"),
      "next-intl": path.resolve(__dirname, "tests/mocks/next-intl.ts"),
      "next-auth/react": path.resolve(__dirname, "tests/mocks/next-auth-react.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    css: false,
    server: {
      deps: { inline: ["motion", "next-intl", "next-auth"] },
    },
    setupFiles: ["./tests/frontend/setup.tsx"],
    include: ["tests/frontend/**/*.test.ts", "tests/frontend/**/*.test.tsx"],
    exclude: ["node_modules", "tests/frontend/setup.tsx", "tests/frontend/test-utils.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["apps/web/src/ui/**/*.tsx", "apps/web/src/state/**/*.ts"],
      exclude: ["**/*.stories.tsx", "**/*.test.tsx"],
    },
  },
  esbuild: {
    jsx: "automatic",
  },
});
