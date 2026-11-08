# Analysis summary (Phase 0, T003)

Raw fallbacks (grep/count over `apps/`, `packages/`, `workers/`) — no analyzers installed locally; counts are approximations for ranking, not exact metrics. Full tool runs (madge/knip/jscpd) remain optional per tasks.md.

## Counts

- TS/TSX files: 1384. Pages: 19. API routes: 78. `export` statements: 5482.
- `TODO`/`FIXME` matches: 23 (small — each candidate for removal or task).
- Explicit `any` matches (`: any` / `as any`): 2591 (includes `tests/` where `no-explicit-any` is off — needs real-tool recount).
- `console.log/debug/info` matches: 23517 (noisy; includes comments/comments-in-strings — recount with a real parser before treating as debt).
- Files > 40KB: 481 (many are data/test/fixture files; large-source-file hotspots to confirm per-unit).

## Notes for mapping (Phase 2)

- Duplicate-component and token-hygiene scan needs a visual/design pass, not grep (T006-T008).
- Dependency/cycle analysis needs a real graph (madge or scripted import parse) — grep-only is insufficient; T006 will use `npx madge` one-shot or a scripted parser, no dep changes.

## Commands run

- `find apps packages workers -name '*.ts' -o -name '*.tsx' | wc -l` -> 1717 (incl. tests/configs)
- `grep -rn -E 'TODO|FIXME' apps packages workers | wc -l` -> 23
- `grep -rn -E ':\sany|as any' apps packages workers | wc -l` -> 2591
- `grep -rn -E 'console\.(log|debug|info)' apps packages workers | wc -l` -> 23517
- `find apps packages workers -size +40000c -name '*.ts*' | wc -l` -> 481
