import type { StrykerOptions } from "@stryker-mutator/core";

const config: Partial<StrykerOptions> = {
  packageManager: "pnpm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  plugins: ["@stryker-mutator/vitest-runner"],
  concurrency: 4,
  mutate: [
    "packages/pipeline/src/**/*.ts",
    "!packages/pipeline/src/**/*.test.ts",
    "!packages/pipeline/src/index.ts",
    "!packages/pipeline/src/types.ts",
  ],
  vitest: {
    configFile: "vitest.config.ts",
  },
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
  timeoutMS: 60_000,
  cleanTempDir: true,
  tempDirName: ".stryker-tmp",
  symlinkNodeModules: false,
  ignorePatterns: [
    ".qoder",
    ".opencode",
    ".agents",
    ".next",
    "node_modules",
    "dist",
    "build",
    "coverage",
  ],
};

export default config;
