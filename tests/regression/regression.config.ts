export const REGRESSION_CONFIG = {
  // Test coverage thresholds
  coverage: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
    critical: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },

  // Performance thresholds (ms)
  performance: {
    unitTestDuration: 100,
    apiResponseTime: 500,
    integrationTestDuration: 1000,
  },

  // Quality gates
  quality: {
    maxLintWarnings: 0,
    maxTypeErrors: 0,
    maxTestFailures: 0,
    maxFlakyTests: 3,
  },

  // Security
  security: {
    maxCriticalVulnerabilities: 0,
    maxHighVulnerabilities: 0,
    secretsScanRequired: true,
  },

  // Test execution order (fastest first for quick feedback)
  testPriority: [
    "tests/backend",
    "tests/api",
    "tests/frontend",
    "tests/integration",
    "tests/security",
    "tests/pentest",
    "tests/edge",
    "tests/fuzz",
    "tests/e2e",
  ],

  // Critical paths that must always be tested
  criticalPaths: [
    "packages/pipeline/src/ocr.ts",
    "packages/pipeline/src/text/clean.ts",
    "apps/web/src/app/api/upload/route.ts",
    "apps/web/src/app/api/documents/route.ts",
    "apps/web/src/app/api/export/[id]/[format]/route.ts",
    "apps/web/src/app/middleware.ts",
  ],
};
