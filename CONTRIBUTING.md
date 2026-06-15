# Contributing

See `governance/` for the full set of contribution policies:

- `EXECUTION_RULES.md` — Workflow, naming, quality gates
- `REVIEW_PIPELINE.md` — Review types, criteria, SLA
- `CHANGE_CONTROL.md` — Change proposal and approval process
- `SPEC_AUTHORITY.md` — Spec lifecycle and requirements

## Quick checklist

1. Read the relevant spec before implementing
2. Create a feature branch: `feat/description`
3. Make minimal, focused changes
4. Run `pnpm ci:all` (lint → typecheck → validate → test)
5. Open a PR for review
