/**
 * Pre-deploy smoke test — lightweight checks that the app is alive.
 * Run against a local dev server or a deployed preview URL.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 tsx tests/smoke/pre-deploy.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true, detail: "pass" });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    results.push({ name, ok: false, detail });
    console.error(`  ✗ ${name}: ${detail}`);
  }
}

async function run(): Promise<void> {
  console.log(`\nSmoke tests against ${BASE_URL}\n`);

  // 1. Health endpoint returns 200 with healthy status
  await check("GET /api/health returns 200", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const body = await res.json();
    if (body.status !== "healthy" && body.status !== "degraded") {
      throw new Error(`Expected healthy/degraded, got ${body.status}`);
    }
  });

  // 2. Root page returns 200
  await check("GET / returns 200", async () => {
    const res = await fetch(BASE_URL, { redirect: "manual" });
    // Allow 200 or 302/307 (redirects to /ar)
    if (res.status !== 200 && res.status !== 302 && res.status !== 307) {
      throw new Error(`Expected 200/302/307, got ${res.status}`);
    }
  });

  // 3. Arabic landing page returns 200
  await check("GET /ar returns 200", async () => {
    const res = await fetch(`${BASE_URL}/ar`);
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });

  // Summary
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length} checks, ${failed.length} failed\n`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Smoke test runner failed:", err);
  process.exit(1);
});
