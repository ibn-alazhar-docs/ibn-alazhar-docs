# Execution Rules

## Workflow

1. Spec → Gate Review → Implementation → Review → Merge
2. No implementation without an approved spec
3. Feature branches: `feat/description`
4. Minimal, focused changes per commit
5. Run `pnpm ci:all` before merge

## Naming

- TypeScript strict, named exports, `camelCase`/`PascalCase`/`UPPER_SNAKE_CASE`
- Arabic-first UI text
- Branch names: `feat/`, `fix/`, `chore/`

## Quality Gates

- `pnpm lint` — ESLint, zero warnings
- `pnpm typecheck` — tsc strict, `--noEmit`
- `pnpm test` — Vitest, comprehensive coverage
- `pnpm format:check` — Prettier
- `pnpm secrets:scan` — No secrets in code
