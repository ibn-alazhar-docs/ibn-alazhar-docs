# TRACEABILITY_MATRIX.md — Audit → Plan → Execute → Verify

## Summary Dashboard

| Status         | Count   | %        |
| -------------- | ------- | -------- |
| 🔴 Open        | [N]     | [N%]     |
| 🟡 In Progress | [N]     | [N%]     |
| 🟢 Closed      | [N]     | [N%]     |
| ⚪ Skipped     | [N]     | [N%]     |
| ❌ Won't Fix   | [N]     | [N%]     |
| **Total**      | **[N]** | **100%** |

**Coverage**: [N] / [N] findings closed = [N%]

## By Dimension

| Dimension        | Critical | High | Medium | Low | Total | Closed | % Closed |
| ---------------- | -------- | ---- | ------ | --- | ----- | ------ | -------- |
| D1 Architecture  |          |      |        |     |       |        |          |
| D2 Database      |          |      |        |     |       |        |          |
| D3 Testing       |          |      |        |     |       |        |          |
| D4 Security      |          |      |        |     |       |        |          |
| D5 Performance   |          |      |        |     |       |        |          |
| D6 UI/UX         |          |      |        |     |       |        |          |
| D7 Code Quality  |          |      |        |     |       |        |          |
| D8 DevOps        |          |      |        |     |       |        |          |
| D9 Documentation |          |      |        |     |       |        |          |
| D10 Full-Stack   |          |      |        |     |       |        |          |

## Matrix

| Finding ID | Severity | Priority | File:Line           | Description   | Commit        | Verified By | Status    |
| ---------- | -------- | -------- | ------------------- | ------------- | ------------- | ----------- | --------- |
| D1-C1      | Critical | P0       | `src/service.py:42` | [issue]       | `abc1234`     | tests       | 🟢 Closed |
| D4-C1      | Critical | P0       | `src/auth.py:88`    | SQL injection | (not started) | —           | 🔴 Open   |

## Verification Methods

Each closed finding MUST be verified by ONE of: tests pass, coverage report, mutation testing, lint clean, type-check clean, security scan clean, performance benchmark, manual smoke test, layer violation detector, behavior snapshot diff, code review approval, ADRs created.

## Status Transition Rules

- 🔴 Open → 🟡 In Progress: work begins
- 🟡 In Progress → 🟢 Closed: verification passes
- 🟡 → 🔴 Open: work paused
- 🔴/🟡 → ⚪ Skipped: descoped (justification required)
- 🔴/🟡 → ❌ Won't Fix: decided not to fix (user sign-off)

## Drift Detection

Run `python3 scripts/traceability_matrix.py check-drift .` at session start.
