# Visual baseline (before-screenshots, T011)

Status: not generated in this environment. The Docker guard is stopped
(`AGENTS.md`), so Postgres/Redis via `./ibn.sh dev-infra` are unavailable;
per the task fallback, this README records the exact manual command instead
of failing. Playwright `1.61.0` is installed, but authenticated screenshots
need a seeded admin (`admin@ibnalazhar.app` / `password123`).

## Command

```bash
./ibn.sh dev-infra
pnpm db:generate && pnpm db:migrate && pnpm db:seed
npx playwright test visual-pages.spec.ts --update-snapshots
mkdir -p .refactor/visual-baseline
cp tests/e2e/visual-pages.spec.ts-snapshots/*.png .refactor/visual-baseline/
```

`visual-pages.spec.ts` already captures 4 viewports (mobile 375, tablet 768,
desktop 1440, wide 1920) and requires FR-005 parity at mobile + desktop.

## Pages missing from `visual-pages.spec.ts` (add before regenerating)

`reset-password`, `users`, `tools`, `conversions`, `bookmarks`, `docs` — the
route-smoke (`tests/e2e/smoke-routes.spec.ts`) covers them for crash-check
only; they have no screenshot yet.
