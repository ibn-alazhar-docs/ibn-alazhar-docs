# Repository Boundaries

## Canonical Paths (Source of Truth)

- `apps/` — Application code
- `packages/` — Shared packages
- `workers/` — Background workers
- `prisma/` — Database schema and migrations
- `specs/` — Feature specifications
- `tests/` — Test suites
- `docs/` — Product and technical documentation
- `docker/` — Docker configurations
- `governance/` — Contribution and process policies
- `.github/` — CI/CD workflows
- `.opencode/` — AI runtime configuration

## Non-Canonical Paths (Reference Only)

- `archive/` — Historical content (may be stale)
- `00_Inbox/` — Working directory (may be incomplete)
- `09_Archive/` — Historical exports (may be stale)

## Constraints

- No new top-level directories without ADR
- No production code in non-canonical paths
- Canonical paths must stay synced with AI agent execution contract
