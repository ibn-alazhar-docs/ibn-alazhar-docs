---
name: dependency-update
description: "Audit, classify, and safely update project dependencies — security advisories first (hotfix branch), then patch (auto-merge on green CI), then minor (changelog review), then major (dedicated branch + full test + migration guide). Enforces lockfile hygiene and zero-known-vulnerabilities. Invoked at Phase 2 (AUDIT) when outdated or vulnerable deps are detected, and on every PR touching package manifests."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: quality
---

# Dependency Update

> Owns the dependency surface: what's outdated, what's vulnerable, what's safe to bump, and what needs a migration guide. Treats `npm update` as a footgun and major bumps as multi-day projects, not afternoon tasks.

## When to Use

| Phase                    | Trigger                                                                  | Why                                                  |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| Phase 2 — AUDIT          | CENSUS shows deps; `npm audit` / `pip-audit` finds vulns                 | Outdated/vulnerable deps are a Day-1 risk            |
| Phase 4 — EXECUTE        | PR touches `package.json` / `requirements.txt` / `go.mod` / `Cargo.toml` | Verify the bump is safe before merge                 |
| Phase 8 — ROLLOUT        | Pre-prod gate                                                            | `npm audit --production` must be clean before deploy |
| Phase 13 — RETROSPECTIVE | Monthly maintenance window                                               | Sweep minors, queue majors for next sprint           |

**Do NOT use this sub-skill for:** OS-level package updates (route to `os-patching`), container base image bumps (route to `containerize` then re-run this on the lockfile), or transitive-only updates that don't change the manifest (those are lockfile refreshes, handled by `lockfile-refresh` if present).

## What It Does

1. Detects the package manager(s) in use: npm, yarn, pnpm, pip, pipenv, poetry, uv, go mod, cargo, bundler, composer, maven, gradle, mix.
2. Lists all outdated deps with current/latest versions and the semver delta (patch / minor / major).
3. Runs the vulnerability scanner for the ecosystem: `npm audit`, `pip-audit`, `cargo audit`, `govulncheck`, `bundle-audit`, `trivy fs`.
4. Classifies each bump into one of four lanes (see Decision Tree): security, patch, minor, major.
5. Executes the lane's workflow: security → hotfix branch + immediate PR; patch → batch + auto-merge on green; minor → one-PR-per-dep with changelog; major → dedicated branch + full suite + migration notes.
6. Updates the lockfile and verifies it's consistent with the manifest (no drift).
7. Emits `DEPENDENCY_REPORT.md` with the full inventory, classifications, and a 30-day update plan.

## Integration Contract

```
INPUT:
  - manifest_path: package.json|requirements.txt|go.mod|Cargo.toml|... (required)
  - lockfile_path: package-lock.json|poetry.lock|go.sum|Cargo.lock (auto-detected)
  - lane: auto|security|patch|minor|major (default auto — runs all lanes in priority order)
  - auto_merge_patch: bool (default true — patches auto-merge when CI is green)
  - dry_run: bool (default true — set false to apply changes)

OUTPUT (JSON to stdout):
  {
    "status": "ok|warn|error",
    "outdated": [
      {"name":"lodash","current":"4.17.20","latest":"4.17.21","delta":"patch","lane":"security","advisory":"GHSA-35jh-r3h4-6jhm"}
    ],
    "vulnerabilities": [
      {"package":"lodash","severity":"high","advisory":"GHSA-...","fixed_in":"4.17.21"}
    ],
    "actions": [
      {"lane":"security","package":"lodash","pr":"https://github.com/.../pull/42","auto_merged":true},
      {"lane":"patch","packages":["axios","chalk",...],"pr":"...","auto_merged":true}
    ],
    "report_path": "DEPENDENCY_REPORT.md"
  }

SIDE EFFECTS:
  - Writes DEPENDENCY_REPORT.md to project root
  - Creates branches: deps/security-<pkg>, deps/patch-batch, deps/minor-<pkg>, deps/major-<pkg>
  - Opens PRs with changelog excerpts and test results
```

## CLI

```bash
# Full audit + plan (dry-run by default)
python3 scripts/dependency_update.py plan \
  --manifest package.json \
  --lane auto

# Apply a single lane
python3 scripts/dependency_update.py apply \
  --manifest package.json \
  --lane security \
  --no-dry-run

# Verify lockfile matches manifest, no known vulns
python3 scripts/dependency_update.py verify \
  --manifest package.json \
  --require-clean-audit

# Generate a major-bump migration guide (for review)
python3 scripts/dependency_update.py migration \
  --manifest package.json \
  --package next \
  --from 14.2.3 --to 15.0.0
```

## Decision Tree (autonomous)

```
For each outdated dependency:

Q: Is there an open security advisory (npm audit / pip-audit / GHSA / CVE)?
  YES → LANE = security
          - Branch: deps/security-<pkg>
          - Bump to the lowest fixed version (not latest)
          - Open PR immediately, label "security"
          - Auto-merge once CI green (no human gate for security)
          - If a major bump is required to fix: still merge (security > compat),
            but flag for immediate post-merge verification
  NO  → continue

Q: What's the semver delta to latest?
  PATCH (1.2.3 → 1.2.4)
    → LANE = patch
        - Batch with other patches
        - Branch: deps/patch-batch
        - Single PR, single CI run
        - Auto-merge on green (patches are vendor-promised backward-compatible)
        - Reviewer may opt out per-package via PR comment

  MINOR (1.2.3 → 1.3.0)
    → LANE = minor
        - One PR per package
        - Branch: deps/minor-<pkg>
        - Reviewer reads the changelog (linked in PR body)
        - Manual merge after human review
        - If changelog mentions "behavior change" or "deprecation": upgrade to major lane

  MAJOR (1.2.3 → 2.0.0)
    → LANE = major
        - Dedicated branch: deps/major-<pkg>-<to-version>
        - Full test suite must pass
        - Migration guide generated (changelog + breaking changes + codemod if available)
        - PR body must list: breaking changes, migration steps, estimated blast radius
        - Never batch majors; never auto-merge majors
        - Schedule review session; merge only after sign-off

Q: Is the lockfile committed?
  NO  → FAIL — commit the lockfile before any update
  YES → continue

Q: Did `npm update` / `pip install -U` get run blindly?
  YES → FAIL — that's not an update, that's a footgun; revert and apply lane-by-lane
  NO  → continue

Q: After update, is `npm audit` / `pip-audit` clean?
  NO  → BLOCK merge — never ship known vulnerabilities
  YES → proceed

Q: Are there multiple major bumps in one PR?
  YES → BLOCK — split into one PR per major bump (blast-radius isolation)
  NO  → proceed
```

## Failure Modes & Recovery

| Symptom                                                     | Cause                                                   | Recovery                                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm audit` shows vuln in transitive dep with no direct fix | Upstream hasn't released a fix                          | Use `overrides` (npm) / `constraints` (poetry) to force the fixed transitive version; file an issue upstream                      |
| Major bump breaks 200 tests                                 | Real breaking change                                    | Do NOT force-pass tests; read migration guide; apply codemod if available; if not, revert and schedule as a dedicated sprint task |
| Patch bump breaks a test                                    | Vendor shipped a regression in a "patch"                | Revert the bump; pin to previous version; file issue upstream; treat as minor until vendor fixes                                  |
| Lockfile drift after merge                                  | Someone ran `npm install` without `--package-lock-only` | Re-run `npm install --package-lock-only` in CI; add a pre-commit hook to prevent manual lockfile edits                            |
| `pip-audit` reports false positive (yanked, not vulnerable) | Audit DB stale or vuln disputed                         | Pin with `# nosec` comment + link to advisory dispute; re-scan weekly until resolved                                              |
| Renovate/Dependabot opens 50 PRs at once                    | Bot configured too aggressively                         | Group patches (Renovate `group:linters`), limit minor to one PR per week, disable major auto-PRs                                  |
| CI green but prod breaks after patch merge                  | Test coverage gap on the changed path                   | Add a regression test for the broken path; treat the gap as a P2 bug                                                              |
| Lockfile conflicts on merge                                 | Two PRs bumped the same dep                             | Rebase the later PR; let the bot re-resolve; never manually edit the lockfile to merge                                            |

## Self-Healing Loop

Every plan, apply, and verify run writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

- Package, lane, before/after versions, CI result, whether merged, post-merge incidents within 7 days.

`meta-auditor` reads this in Phase 13. Patterns it acts on:

- Same package causing post-merge incidents ≥3 times → `self-patch-generator` adds a rule (e.g., "always run the migration guide check for `next` major bumps").
- Patch lane repeatedly breaking tests for a specific vendor → demote that vendor's patches to minor lane (manual review).
- Major bumps consistently needing >1 sprint → flag for the team to schedule upgrade sprints rather than ad-hoc.

## Quality Gates

- [ ] `npm audit --production` / `pip-audit` / `cargo audit` / `govulncheck` is clean (zero high/critical).
- [ ] Lockfile is committed and in sync with the manifest (`npm ci --dry-run` / `poetry lock --check` passes).
- [ ] Every security advisory has a merged PR (no open advisories older than 7 days).
- [ ] No PR mixes multiple major bumps.
- [ ] Every major-bump PR has a migration guide in the PR body (breaking changes + steps).
- [ ] No dep is more than 2 majors behind latest (catch-up plan documented if so).
- [ ] Deprecation warnings in CI output are tracked (issue per deprecation, scheduled before EOL).
- [ ] `DEPENDENCY_REPORT.md` is regenerated at least monthly and reviewed.

## Tools

- **Dependabot** (GitHub-native) — zero-config, decent defaults, less configurable than Renovate.
- **Renovate** (Mend) — highly configurable; grouping, scheduling, automerge rules; works on GitHub, GitLab, Bitbucket, Gitea.
- **npm-check-updates / yarn upgrade-interactive / pnpm update -i** — interactive CLI for local one-off bumps.
- **pip-tools / pip-audit / poetry** — Python: `pip-compile` for deterministic locks, `pip-audit` for vulns.
- **uv** (Astral) — fast Python resolver; `uv lock` + `uv pip audit`.
- **cargo outdated / cargo audit / cargo update** — Rust ecosystem.
- **govulncheck** — Go: only reports vulns in code paths you actually use (huge noise reduction).
- **bundler-audit / bundle update** — Ruby.
- **trivy fs / trivy repo** — multi-ecosystem scanner; catches lockfile + IaC + container image vulns.
- **socket.dev** — supply-chain risk scoring (typosquatting, install scripts, telemetry).

## Hard Rules

1. **Never ship with known high/critical vulnerabilities.** `npm audit` / `pip-audit` / `cargo audit` / `govulncheck` must be clean in CI before merge to main. Block the PR, don't warn.
2. **Never mix major bumps in one PR.** One major per PR — if it breaks, you know which one. Batching majors turns a 1-hour rollback into a 1-day archaeology dig.
3. **Never run `npm update` / `pip install -U` blindly.** That command updates everything to latest within semver range, including transitives you didn't intend to touch. Use the lane-by-lane workflow; every bump is deliberate.
4. **Always commit the lockfile.** A repo without a lockfile is a repo where every install is a different build. CI must run `npm ci` / `poetry install --sync` / `cargo install --locked`, never the loose install.
5. **Security updates bypass human review.** A patch that closes a high/critical advisory auto-merges on green CI. Waiting for a human to review a security patch is how advisories sit open for 90 days.
6. **Major bumps require a migration guide in the PR.** Breaking changes, deprecated APIs you use, codemods available, estimated blast radius. A major bump without a migration guide is a future incident.
7. **Always update the lockfile with the manifest.** `package.json` without `package-lock.json` updated is drift. CI fails the build on lockfile drift; the fix is to re-run the resolver, not to commit a hand-edited lockfile.
8. **Deprecation warnings are tracked, not ignored.** Every deprecation in CI output gets an issue with the EOL date. Ignoring deprecations is how you end up doing an emergency major bump at 11pm because the vendor yanked the old version.
