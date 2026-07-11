# Regression Testing

This directory contains regression hooks and quality gates for Ibn Al-Azhar Docs.

## Files

| File                       | Purpose                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| `pre-commit.sh`            | Runs on every `git commit` — format check, lint, typecheck, changed tests       |
| `pre-push.sh`              | Runs on every `git push` — full test suite, integration, security, secrets scan |
| `regression-suite.test.ts` | Vitest regression suite — sanity checks across all core modules                 |
| `regression.config.ts`     | Threshold configuration for coverage, performance, and quality                  |

## Setup

Run once after cloning:

```bash
bash scripts/setup-hooks.sh
```

This installs the hooks into `.git/hooks/`. To bypass in emergency:

- `git commit --no-verify`
- `git push --no-verify`

## Running Manually

```bash
pnpm test:regression       # Run regression sanity suite
bash tests/regression/pre-commit.sh   # Simulate pre-commit
bash tests/regression/pre-push.sh     # Simulate pre-push
```

## Scripts

These scripts are available in `package.json`:

| Script            | Command                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `hooks:install`   | `bash scripts/setup-hooks.sh`                                     |
| `test:regression` | `vitest run tests/regression/regression-suite.test.ts`            |
| `ci:quick`        | format + lint + typecheck + regression tests                      |
| `ci:full`         | full CI pipeline including API, integration, security, edge, fuzz |
