---
name: pr-ready
description: Pre-push gate — run every CI check and summarize what changed. Use before pushing a branch or creating a PR. Triggers — "pr ready", "ready to push", "can I push", "pre-push check", "is this PR safe", "summarize my changes".
---

Run the full CI pipeline and produce a push-readiness report.

## Steps

1. **Run `pnpm ci:all`** — format check, lint, typecheck, tests, secrets scan. Report each step as PASS/FAIL.

2. **If any step fails**, stop and show the error. Do not continue.

3. **Summarize changes** using `git diff main --stat`:
   - List modified, added, and deleted files
   - Count total lines changed
   - Flag any sensitive files touched (`.env*`, `prisma/schema.prisma`, `Dockerfile*`, `.github/workflows/`)

4. **Check branch status**:
   - Current branch name (verify it follows `feat/*` or `fix/*` convention)
   - Whether the branch is up to date with main (`git log main..HEAD --oneline`)
   - Uncommitted changes (`git status --short`)

5. **Verdict**: Output one of:
   - **READY TO PUSH** — all checks pass, no uncommitted changes, branch follows convention
   - **FIX BEFORE PUSH** — list what needs attention with specific actions
   - **UNCOMMITTED CHANGES** — remind to commit or stash
