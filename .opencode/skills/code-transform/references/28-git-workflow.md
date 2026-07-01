# Git Workflow & Branching Strategy

## Branching Strategies

| Strategy                | When                            |
| ----------------------- | ------------------------------- |
| Single transform branch | 5-30 transforms (default)       |
| Per-module branches     | 30+ transforms, multi-module    |
| Trunk-based             | 1-5 safe transforms, high trust |

Branch naming: `transform/<phase>/<module-or-description>`

## Commit Hygiene

1. One transformation per commit
2. Atomic (buildable + testable after every commit)
3. Conventional Commits: `<type>(<scope>): <description>`
4. Verify before commit

Types: refactor, fix, test, perf, security, docs, ci, chore, feat

Example:

```
refactor(auth): extract AuthRepository from AuthService

Separates data access from business logic.

Closes finding D1-C1.
```

## PR Strategy

| Size   | Lines   | Review           |
| ------ | ------- | ---------------- |
| Small  | <100    | 5-10 min (ideal) |
| Medium | 100-500 | 20-30 min        |
| Large  | 500+    | Split            |

## Conflict Handling

1. Identify conflict
2. Understand both sides
3. Resolve manually (merge intents, not just code)
4. Verify (build + tests)
5. Commit merge with explanation

Prevent: small frequent rebase, communicate, module isolation, ≤2 week branches.

## git bisect (Debugging)

```bash
git bisect start
git bisect bad HEAD
git bisect good <known-good>
git bisect run <test-command>
# Git finds culprit in log2(N) steps
git bisect reset
```

## Long-Running Branches

- Frequent rebase (daily): `git rebase origin/main`
- Max branch lifetime: 2 weeks
- Feature flags: ship incomplete behind flag, merge frequently

## Recovery

- Undo last commit (keep changes): `git reset HEAD~1`
- Revert (safe): `git revert <hash>`
- Recover deleted branch: `git reflog` → `git branch <name> <hash>`
- Fix bad merge: `git revert -m 1 <merge-hash>`

## CI Integration

Pre-commit hooks: ruff, mypy, trailing-whitespace.
Branch protection: require PR, status checks, 1-2 reviewers, no force push to main.

## Anti-Patterns

1. Mega commit (5000 lines)
2. Broken build ("WIP")
3. Long-lived branch (3 months)
4. Force push to shared branch
5. No commit message
6. Unrelated changes in one commit
7. Merge hell
8. Unverified commit

## Quick Reference

```
BRANCHING: 1-5 trunk | 5-30 single | 30+ per-module
COMMITS: one per transform, atomic, Conventional Commits
PR: <100 ideal, 500+ split
REBASE: daily, max 2 weeks
BISECT: bad HEAD → good <known> → run <test>
```
