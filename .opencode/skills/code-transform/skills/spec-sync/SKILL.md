---
name: spec-sync
description: "Keeps spec.md in sync with code changes. Detects three drift types (code-first, spec-first, test gap) by comparing git diffs against spec items via [SP-N] tags in commits. Never lets spec drift more than 1 commit behind code; every AC must have a test; every commit must reference SP-N."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: spec-kit
---

# Spec Sync

> Phase 6/7 sub-skill. The skill's spec-code integrity check. Without it, specs rot — code moves on, spec stays behind, and six months later nobody knows what the system actually does. With it, every commit is traceable to a spec item, and drift is caught within one commit.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 6 — EXECUTE | After every commit | Catch drift immediately, not at Phase 7 |
| Phase 7 — VERIFY | Full spec-coverage check | Verify all SP-Ns implemented, all ACs tested |
| Phase 13 — META-AUDIT | `meta-learning` routed a "wrong assumption" lesson | Spec had a false assumption; spec-sync identifies which SP-N to update |
| Manual trigger | User asks "is the spec up to date?" | Diagnostic |

**Do NOT use this sub-skill for:** generating specs (use `spec-generator`), implementing features (use Phase 6 EXECUTE), or writing tests (use Phase 7 VERIFY). This sub-skill only *detects and reports* drift; it doesn't fix it (though it can propose fixes).

## What It Does

1. Reads the git diff for the current commit (or a range of commits).
2. Extracts `[SP-N]` tags from commit messages (mandatory convention).
3. Maps each changed file to spec items via the SP-N tags.
4. Compares the code change against the spec for that SP-N:
   - Does the code do what the spec says? (spec compliance)
   - Does the code do something the spec doesn't mention? (code-first drift)
   - Does the spec describe behavior the code doesn't implement? (spec-first drift)
5. Checks that every acceptance criterion for the SP-N has a corresponding test (test gap detection).
6. If drift detected: writes a `drift-report.md` with proposed fix (update spec OR update code OR add test).
7. If no drift: confirms sync, updates `tasks.md` to mark the task complete.

## Drift Types

| Drift type | Definition | Example | Fix |
|------------|-----------|---------|-----|
| **Code-first drift** | Code does X, spec doesn't mention X | Code adds rate limiting; spec SP-1 has no rate-limit AC | Update spec: add AC-1.4 for rate limiting |
| **Spec-first drift** | Spec says X, code doesn't do X | Spec SP-2 requires email verification; code doesn't verify emails | Implement OR remove from spec (with reason) |
| **Test gap** | AC has no test | AC-1.3 requires account lockout after 5 failed logins; no test for it | Add test: `test_ac_1_3_account_lockout` |
| **Unspec'd code** | Code change has no `[SP-N]` tag in commit | Commit "refactor auth module" with no SP-N | Either add SP-N (if it's spec'd work) or justify + add to spec |

## Integration Contract

```
INPUT:
  - spec_path: path to spec.md (default: ./spec.md)
  - commit_range: optional (default: HEAD~1..HEAD — last commit)
  - check_tests: bool (default true — also check AC test coverage)

OUTPUT (files):
  - drift-report.md          # only written if drift detected
  - spec-coverage.md         # always written (full coverage report)

OUTPUT (stdout JSON):
  {
    "commits_scanned": 1,
    "sp_n_referenced": ["SP-1", "SP-2"],
    "drift_detected": true,
    "drift_items": [
      {
        "type": "code-first",
        "sp_n": "SP-1",
        "description": "Code adds rate limiting (5 attempts/15min) not in spec",
        "proposed_fix": "Add AC-1.4 to spec.md: Given 5 failed logins, When 6th attempt, Then account locked 15min",
        "severity": "medium"
      },
      {
        "type": "test-gap",
        "sp_n": "SP-1",
        "ac": "AC-1.3",
        "description": "No test found for account lockout",
        "proposed_fix": "Add test test_ac_1_3_account_lockout in src/auth/login.test.ts",
        "severity": "high"
      }
    ],
    "spec_coverage": {
      "total_sp": 14,
      "implemented": 8,
      "tested": 6,
      "not_started": 6,
      "coverage_pct": 57
    }
  }
```

## Spec-Coverage Report (Phase 7)

```markdown
## Spec Coverage Report — [Project Name]

| SP-N | Description | Implemented | Tested | Status |
|------|-------------|-------------|--------|--------|
| SP-1 | User login | ✅ | ✅ | Done |
| SP-2 | User registration | ✅ | ❌ | Needs tests |
| SP-3 | Password reset | ❌ | ❌ | Not started |
| SP-4 | Email verification | ✅ | ✅ | Done |

**Coverage: 8/14 SP-N implemented (57%), 6/8 tested (75%)**
**Drift: 2 items detected (1 code-first, 1 test-gap)**
```

## CLI

```bash
# Check the last commit for drift
python3 scripts/spec_sync.py check --commit-range HEAD~1..HEAD

# Check a range of commits
python3 scripts/spec_sync.py check --commit-range HEAD~5..HEAD

# Full Phase 7 spec-coverage report
python3 scripts/spec_sync.py coverage --spec-path ./spec.md

# Apply a proposed fix (auto-update spec.md with proposed AC)
python3 scripts/spec_sync.py apply-fix --drift-id drift-001

# Verify a commit references SP-N (pre-commit hook)
python3 scripts/spec_sync.py verify-commit --commit-msg-file .git/COMMIT_EDITMSG
```

## Decision Tree (autonomous)

```
Q: Does the commit message contain [SP-N]?
  YES → continue
  NO  → flag as "unspec'd code"
        → Q: Is this a refactor / cleanup that's genuinely spec-agnostic?
              YES → allow with [NO-SP] tag (justified)
              NO  → reject commit, ask for SP-N reference

Q: Does the code change match the ACs for that SP-N?
  YES → continue
  NO  → Q: Does the code add NEW behavior not in spec?
          YES → code-first drift → propose spec update
          NO  → Q: Does the code CONTRADICT the spec?
                  YES → accidental drift → flag, ask to fix code OR update spec with reason
                  NO  → continue (partial implementation, may be ok)

Q: For each AC of the SP-N, is there a test?
  YES → continue
  NO  → test-gap → propose test addition

Q: Is spec drift > 1 commit old?
  YES → halt EXECUTE, force sync before next commit
  NO  → log drift, allow commit, surface for next iteration

Q: Is this a Phase 7 full coverage check?
  YES → generate spec-coverage.md, surface any SP-N not implemented
  NO  → per-commit check only
```

## [SP-N] Tag Convention

Every commit MUST reference a spec item in its message:

```
feat(auth): implement login endpoint [SP-1]

- POST /login returns 200 with JWT for valid credentials (AC-1.1)
- Returns 401 INVALID_CREDENTIALS for unregistered email (AC-1.2)
```

Tag formats:
- `[SP-1]` — references spec item SP-1
- `[SP-1,SP-2]` — references multiple spec items
- `[NO-SP]` — justified spec-agnostic change (e.g. "refactor: extract util function [NO-SP]")
- `[SP-1 AC-1.3]` — references a specific acceptance criterion

Commits without a tag (and without `[NO-SP]`) are rejected by the pre-commit hook.

## Drift Severity

| Severity | Definition | Action |
|----------|-----------|--------|
| **Critical** | Code contradicts spec (spec says X, code does Y) | Halt EXECUTE; must resolve before next commit |
| **High** | Test gap (AC has no test) | Halt EXECUTE; add test before next commit |
| **Medium** | Code-first drift (new behavior not in spec) | Allow commit; spec update required within 1 commit |
| **Low** | Spec-first drift (spec says X, code doesn't do X yet) | Allow; track as "not yet implemented"; if persists > 5 commits, surface |

## Self-Improvement Hook

Every drift detection appends to `audit-trail.jsonl`:

```json
{"ts": "...", "phase": "6", "action": "spec-sync-check", "commit": "abc123", "sp_n": ["SP-1"], "drift_count": 1, "drift_types": ["code-first"], "resolved": false}
```

`meta-auditor` checks:
- Drift count per project (high = spec-generator producing incomplete specs, or EXECUTE not respecting spec)
- Time-to-resolve drift (long = team ignoring drift reports)
- Most common drift type per project (pattern → lesson for spec-generator or self-patch-generator)

If `code-first drift` is the most common type, the spec was underspecified → lesson for `spec-generator` to ask more probing intake questions.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Commit has no [SP-N] tag | Developer forgot convention | Pre-commit hook rejects; ask to amend message |
| spec.md is missing | spec-generator didn't run | Halt; run spec-generator first |
| Spec item SP-N referenced but doesn't exist in spec.md | Typo or stale spec | Surface; ask to fix tag OR add SP-N to spec |
| Drift detected but no fix proposed | Genuine ambiguity | Surface to user for decision; do not auto-fix |
| Test gap can't be auto-fixed | Test infrastructure missing | Surface; ask user to add test infrastructure first |

## Tools

- **git** — `diff`, `log` for commit analysis
- **spec.md** — source of truth for SP-N and ACs
- **test runner** — to verify which ACs have tests (looks for test names matching `test_<sp>_<ac>` pattern or `@ac(AC-1.3)` annotations)
- **spec-generator** (sibling) — for regenerating spec sections when drift is systemic

## Permissions

- Filesystem: read spec.md, tasks.md, source files, test files; write drift-report.md, spec-coverage.md; may modify spec.md (when applying fixes)
- Network: none
- Processes: spawn `git` (read-only), spawn test runner in `--list` mode (to enumerate tests)

## Hard Rules

1. **Never let spec drift more than 1 commit.** Drift detected in commit N must be resolved (spec updated or code fixed) before commit N+1.
2. **Every AC must have a test.** An AC without a test is a test gap; halt EXECUTE until the test is added.
3. **Every commit must reference SP-N.** No tag = rejected by pre-commit hook (unless `[NO-SP]` with justification).
4. **Never auto-fix without proposing.** Drift fixes are proposed in `drift-report.md`; the user (or orchestrator) approves before spec.md is modified.
5. **Always log drift to audit-trail.** Every drift detection is an audit event; without it, `meta-auditor` can't see patterns.
6. **Always surface critical drift immediately.** Code contradicting spec is a halt condition; do not proceed to next commit.
7. **Never delete a spec item silently.** If code removes behavior, the spec item is updated (marked "removed" with reason) or marked "deprecated" — never just deleted.
8. **Always check tests, not just code.** Code matching AC ≠ AC is tested; test gap detection is mandatory when `check_tests=true` (default).
