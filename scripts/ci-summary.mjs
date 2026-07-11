#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";

const RESULTS_DIR = resolve(process.cwd(), "test-results");
const COVERAGE_DIR = resolve(process.cwd(), "coverage");

function parseJsonReport(filePath) {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findResultFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findResultFiles(full));
    } else if (
      entry.name.endsWith(".json") &&
      (entry.name.includes("result") || entry.name.includes("report"))
    ) {
      files.push(full);
    }
  }
  return files;
}

function parseVitestJson(report) {
  if (!report) return null;
  const numTotalTestSuites = report.numTotalTestSuites ?? 0;
  const numPassedTestSuites = report.numPassedTestSuites ?? 0;
  const numFailedTestSuites = report.numFailedTestSuites ?? 0;
  const numTotalTests = report.numTotalTests ?? 0;
  const numPassedTests = report.numPassedTests ?? 0;
  const numFailedTests = report.numFailedTests ?? 0;
  const numPendingTests = report.numPendingTests ?? 0;

  return {
    suites: { total: numTotalTestSuites, passed: numPassedTestSuites, failed: numFailedTestSuites },
    tests: {
      total: numTotalTests,
      passed: numPassedTests,
      failed: numFailedTests,
      skipped: numPendingTests,
    },
    passRate: numTotalTests > 0 ? ((numPassedTests / numTotalTests) * 100).toFixed(1) : "N/A",
    duration: report.testResults?.reduce((acc, r) => acc + (r.endTime - r.startTime || 0), 0) || 0,
  };
}

const categories = [
  { name: "Unit Tests", command: "pnpm test", file: "test-results.json" },
  { name: "API Tests", command: "pnpm test:api", file: "api-test-report.json" },
  { name: "Integration Tests", command: "pnpm test:integration", file: "integration-report.json" },
  { name: "Security Tests", command: "pnpm test:security", file: "security-report.json" },
  { name: "Edge Cases", command: "pnpm test:edge", file: "edge-report.json" },
  { name: "Fuzz Tests", command: "pnpm test:fuzz", file: "fuzz-report.json" },
  { name: "Frontend Tests", command: "pnpm test:frontend", file: "frontend-report.json" },
];

function formatDuration(ms) {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

console.log("# 📊 Test Summary\n");
console.log("| Category | Status | Tests | Passed | Failed | Duration |");
console.log("|----------|--------|-------|--------|--------|----------|");

let grandTotal = 0;
let grandPassed = 0;
let grandFailed = 0;

for (const cat of categories) {
  const resultFiles = findResultFiles(RESULTS_DIR);
  let data = null;

  for (const f of resultFiles) {
    const parsed = parseJsonReport(f);
    data = parseVitestJson(parsed);
    if (data) break;
  }

  if (data) {
    const status =
      data.tests.failed === 0 ? "✅ Pass" : data.tests.passed > 0 ? "⚠️ Partial" : "❌ Fail";
    console.log(
      `| ${cat.name} | ${status} | ${data.tests.total} | ${data.tests.passed} | ${data.tests.failed} | ${formatDuration(data.duration)} |`,
    );
    grandTotal += data.tests.total;
    grandPassed += data.tests.passed;
    grandFailed += data.tests.failed;
  } else {
    const fallbackFile = resolve(RESULTS_DIR, cat.file);
    if (existsSync(fallbackFile)) {
      const parsed = parseJsonReport(fallbackFile);
      data = parseVitestJson(parsed);
      if (data) {
        const status = data.tests.failed === 0 ? "✅ Pass" : "⚠️ Mixed";
        console.log(
          `| ${cat.name} | ${status} | ${data.tests.total} | ${data.tests.passed} | ${data.tests.failed} | ${formatDuration(data.duration)} |`,
        );
        grandTotal += data.tests.total;
        grandPassed += data.tests.passed;
        grandFailed += data.tests.failed;
      } else {
        console.log(`| ${cat.name} | ⚪ No data | — | — | — | — |`);
      }
    } else {
      console.log(`| ${cat.name} | ⚪ No data | — | — | — | — |`);
    }
  }
}

const overallRate = grandTotal > 0 ? ((grandPassed / grandTotal) * 100).toFixed(1) : "N/A";
console.log(
  `| **Total** | **${grandFailed === 0 ? "✅" : "⚠️"}** | **${grandTotal}** | **${grandPassed}** | **${grandFailed}** | **—** |`,
);
console.log(`\n**Overall Pass Rate: ${overallRate}%**\n`);

if (existsSync(COVERAGE_DIR)) {
  console.log("## 📈 Coverage\n");
  try {
    const coverageFile = resolve(COVERAGE_DIR, "coverage-summary.json");
    if (existsSync(coverageFile)) {
      const cov = parseJsonReport(coverageFile);
      if (cov?.total) {
        const lines = cov.total.lines;
        const branches = cov.total.branches;
        const functions = cov.total.functions;
        console.log("| Metric | Covered | Total | Rate |");
        console.log("|--------|---------|-------|------|");
        console.log(`| Lines | ${lines.covered} | ${lines.total} | ${lines.pct}% |`);
        console.log(`| Branches | ${branches.covered} | ${branches.total} | ${branches.pct}% |`);
        console.log(
          `| Functions | ${functions.covered} | ${functions.total} | ${functions.pct}% |`,
        );
        console.log(
          `| Statements | ${cov.total.statements?.covered || "—"} | ${cov.total.statements?.total || "—"} | ${cov.total.statements?.pct || "—"}% |`,
        );
      }
    }
  } catch {
    console.log("Coverage data unavailable.");
  }
}

console.log(`\n## 🔗 Links\n`);
console.log(`- **Run ID:** ${process.env.GITHUB_RUN_ID || "local"}`);
console.log(`- **Repository:** ${process.env.GITHUB_REPOSITORY || "local"}`);
console.log(`- **Ref:** ${process.env.GITHUB_REF || "local"}`);
console.log(`- **SHA:** ${process.env.GITHUB_SHA || "local"}`);
