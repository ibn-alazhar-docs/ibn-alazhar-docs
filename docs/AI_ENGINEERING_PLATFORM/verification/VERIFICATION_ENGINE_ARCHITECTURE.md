# Verification Engine Architecture

> **Purpose:** Define the multi-layer verification pipeline for the AI Engineering Platform.
> **Scope:** Verification types, execution model, result aggregation, failure handling.

---

## 1. Verification Engine Overview

The Verification Engine runs automated checks on implementation output before it proceeds to review. It operates in parallel where possible and aggregates results into a single verdict.

```
Implementation Complete
  │
  ▼
┌─────────────────────────────────────────────────────┐
│              VERIFICATION ENGINE                     │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Lint     │ │ Type     │ │ Unit     │ │ Build   ││
│  │ Check    │ │ Check    │ │ Tests    │ │ Check   ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘│
│       │            │            │             │     │
│  ┌────┴────────────┴────────────┴─────────────┴────┐│
│  │              Result Aggregator                   ││
│  └────────────────────┬────────────────────────────┘│
│                       │                              │
│                  ┌────┴────┐                         │
│                  │         │                         │
│                  ▼         ▼                         │
│              PASS      FAIL ──► Repair Engine        │
└─────────────────────────────────────────────────────┘
```

---

## 2. Verification Types

### 2.1 Lint Check

**Purpose:** Verify code style and formatting.
**Command:** `pnpm lint`
**Expected Exit Code:** 0
**Timeout:** 60 seconds

**Failure Handling:**
- Lint failures are passed to the repair engine.
- Repair engine runs `pnpm lint --fix` if auto-fixable.
- If not auto-fixable, repair session attempts manual fix.

### 2.2 Type Check

**Purpose:** Verify TypeScript type correctness.
**Command:** `pnpm typecheck`
**Expected Exit Code:** 0
**Timeout:** 60 seconds

**Failure Handling:**
- Type errors are passed to the repair engine with error output.
- Repair session analyzes errors and fixes type issues.

### 2.3 Unit Tests

**Purpose:** Verify existing tests pass.
**Command:** `pnpm test:unit`
**Expected Exit Code:** 0
**Timeout:** 120 seconds

**Failure Handling:**
- Failed tests are passed to the repair engine.
- Repair session analyzes test failures and fixes code.
- New tests introduced by implementation are also run.

### 2.4 Build Check

**Purpose:** Verify the application builds successfully.
**Command:** `pnpm build`
**Expected Exit Code:** 0
**Timeout:** 120 seconds

**Failure Handling:**
- Build errors are passed to the repair engine.
- Repair session analyzes build output and fixes issues.

### 2.5 Playwright Checks

**Purpose:** Browser-based UI verification.
**Command:** `pnpm test:e2e`
**Expected Exit Code:** 0
**Timeout:** 300 seconds

**Sub-checks:**
- Visual validation (screenshot comparison).
- RTL validation (Arabic layout correctness).
- Interaction testing (clicks, forms, navigation).
- Accessibility checks (WCAG compliance).
- Responsive checks (multiple viewports).

**Failure Handling:**
- Failed tests with screenshots are passed to the repair engine.
- Repair session analyzes screenshots and error output.

### 2.6 Security Scan

**Purpose:** Verify no security issues introduced.
**Command:** `pnpm audit --audit-level=high` + custom security checks
**Expected Exit Code:** 0
**Timeout:** 60 seconds

**Checks:**
- Dependency vulnerabilities (npm audit).
- Secret detection (git-secrets or truffleHog).
- Input validation presence (Zod schema usage).
- Auth check presence in API routes.

---

## 3. Execution Model

### 3.1 Parallel Execution

Verification checks run in parallel where there are no dependencies:

```
┌───────────────────────────────────────────────────┐
│                  Parallel Group 1                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐│
│  │ Lint     │ │ Type     │ │ Security │ │ Build ││
│  │ Check    │ │ Check    │ │ Scan     │ │ Check ││
│  └──────────┘ └──────────┘ └──────────┘ └───────┘│
└───────────────────────────────────────────────────┘
                      │
                      ▼ (all complete)
┌───────────────────────────────────────────────────┐
│                  Parallel Group 2                  │
│  ┌──────────┐ ┌──────────┐                        │
│  │ Unit     │ │Playwright│                        │
│  │ Tests    │ │ Checks   │                        │
│  └──────────┘ └──────────┘                        │
└───────────────────────────────────────────────────┘
```

**Rationale:**
- Group 1 checks are fast and independent.
- Group 2 checks depend on a successful build.
- Within each group, checks run in parallel.

### 3.2 Execution Flow

```
Verification Engine.start()
  │
  ├── Create verification sessions (verifier role)
  │
  ├── Execute Group 1 (parallel)
  │     ├── Lint check
  │     ├── Type check
  │     ├── Security scan
  │     └── Build check
  │
  ├── Wait for Group 1 completion
  │
  ├── If any Group 1 fails → early fail (no Group 2)
  │
  ├── Execute Group 2 (parallel)
  │     ├── Unit tests
  │     └── Playwright checks
  │
  ├── Wait for Group 2 completion
  │
  ├── Aggregate results
  │
  └── Emit VERIFICATION_PASSED or VERIFICATION_FAILED
```

### 3.3 Early Failure

If any Group 1 check fails, Group 2 is skipped:
- Rationale: If lint/typecheck/build fails, tests cannot run correctly.
- This saves time and resources.
- The repair engine fixes Group 1 issues first.

---

## 4. Result Aggregation

### 4.1 Aggregation Logic

```typescript
interface AggregatedResult {
  overall: 'passed' | 'failed';
  checks: CheckResult[];
  failures: CheckResult[];
  warnings: CheckResult[];
  summary: string;
}

function aggregateResults(checks: CheckResult[]): AggregatedResult {
  const failures = checks.filter(c => c.status === 'failed');
  const warnings = checks.filter(c => c.status === 'warning');

  return {
    overall: failures.length === 0 ? 'passed' : 'failed',
    checks,
    failures,
    warnings,
    summary: failures.length === 0
      ? `All ${checks.length} checks passed`
      : `${failures.length} of ${checks.length} checks failed`
  };
}
```

### 4.2 Result Output

The aggregated result is emitted as a `VerificationResult` structured output:

```json
{
  "overall": "failed",
  "checks": [
    { "type": "lint", "status": "passed", "duration": 3200 },
    { "type": "typecheck", "status": "failed", "duration": 4500, "errorOutput": "..." },
    { "type": "unit-test", "status": "passed", "duration": 8000, "passCount": 42, "failCount": 0 },
    { "type": "build", "status": "passed", "duration": 15000 },
    { "type": "playwright", "status": "skipped" },
    { "type": "security-scan", "status": "passed", "duration": 2000 }
  ],
  "duration": 32700,
  "summary": "1 of 6 checks failed"
}
```

---

## 5. Failure Handling

### 5.1 Failure Classification

| Failure Type | Repairable | Action |
|---|---|---|
| Lint error | Yes (auto-fix) | Run `pnpm lint --fix`, re-verify |
| Type error | Yes | Repair session fixes types |
| Test failure | Yes | Repair session fixes code |
| Build error | Yes | Repair session fixes build |
| Playwright failure | Partial | Repair session attempts fix |
| Security vulnerability | Partial | Depends on vulnerability type |
| Dependency vulnerability | No (external) | Escalate to human |

### 5.2 Repair Trigger

When verification fails:
1. `VERIFICATION_FAILED` event emitted with failure details.
2. Pipeline transitions to `REPAIRING` state.
3. Recovery engine receives failure report.
4. Recovery engine selects repair strategy based on failure type.
5. Repair session executes fix.
6. Pipeline transitions back to `VERIFYING` for re-verification.

---

## 6. Verification Configuration

```yaml
verification:
  groups:
    group1:
      parallel: true
      checks:
        - type: lint
          command: "pnpm lint"
          timeout_seconds: 60
          auto_fix: true
        - type: typecheck
          command: "pnpm typecheck"
          timeout_seconds: 60
        - type: security-scan
          command: "pnpm audit --audit-level=high"
          timeout_seconds: 60
        - type: build
          command: "pnpm build"
          timeout_seconds: 120
    group2:
      parallel: true
      depends_on: group1
      checks:
        - type: unit-test
          command: "pnpm test:unit"
          timeout_seconds: 120
        - type: playwright
          command: "pnpm test:e2e"
          timeout_seconds: 300

  early_fail: true          # Skip group2 if group1 fails
  max_repair_attempts: 3    # Max repair loops before escalation
```

---

## 7. Verification Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Sequential verification | Slow, wastes time | Parallel execution |
| No early failure | Wastes resources on doomed checks | Skip group2 if group1 fails |
| No timeout | Runaway checks block pipeline | Per-check timeouts |
| No error capture | Cannot diagnose failures | Capture stdout/stderr |
| No result aggregation | Cannot determine overall status | Aggregate all results |
| Ignoring skipped checks | Incomplete verification | Track skipped checks |
