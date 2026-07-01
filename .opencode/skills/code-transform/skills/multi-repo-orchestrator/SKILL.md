---
name: multi-repo-orchestrator
description: "Coordinates refactors and feature work across multiple repositories (microservices, monorepo sub-packages, multi-repo meta-projects). Maps the repo dependency graph, sequences contract producers before consumers, aligns contract versions, and runs cross-repo tests before merge."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Multi-Repo Orchestrator

> Phase 6 sub-skill for projects that span > 1 repo. The skill's distributed-systems coordinator: ensures contract changes don't break consumers, sequences merges in dependency order, and runs cross-repo integration tests. Without it, multi-repo work = broken consumers and rolled-back PRs.

## When to Use

| Phase                | Trigger                                                        | Why                                    |
| -------------------- | -------------------------------------------------------------- | -------------------------------------- |
| Phase 1 — DISCOVERY  | Project spans multiple repos (detected via `project_analyzer`) | Need to map the dependency graph early |
| Phase 5 — PRIORITIZE | Plan touches contracts (API/DB/event schema) across repos      | Sequence producers before consumers    |
| Phase 6 — EXECUTE    | Multi-repo changes ready to implement                          | Per-repo branches, coordinated merges  |
| Phase 7 — VERIFY     | Cross-repo integration tests needed                            | Verify the contract holds end-to-end   |
| Manual trigger       | User asks "what's the merge order for these 5 PRs?"            | Diagnostic                             |

**Do NOT use this sub-skill for:** single-repo projects (use the regular workflow), independent changes in different repos with no shared contract (just do them in parallel, no coordination needed), or repo infrastructure changes that don't affect contracts (CI config, etc.).

## What It Does

1. Maps the **repo dependency graph**: which repo consumes which repo's contracts (API, DB schema, event schemas, shared types).
2. Identifies **contract changes** in the plan: API endpoint additions/removals/changes, DB schema migrations, event schema changes, shared type changes.
3. Sequences per-repo work: **contract producers before consumers**. A producer change must merge before any consumer that depends on it.
4. For each repo: creates a branch, makes the change, runs repo-local tests, opens a PR.
5. Cross-repo integration tests: spins up the full stack (via docker-compose or similar), verifies the contract holds end-to-end.
6. Merges in dependency order, with a rollback plan if a downstream consumer fails after a producer merges.

## Integration Contract

```
INPUT:
  - repos: list of {name, path, role: producer|consumer|both}
  - contract_changes: list of {type: api|db|event|type, name, breaking: bool, version_bump: major|minor|patch}
  - plan: BLUEPRINT.md (multi-repo aware)
  - dry_run: bool (default true)

OUTPUT (JSON to stdout):
  {
    "repo_count": 4,
    "dependency_graph": {
      "edges": [
        {"producer": "auth-service", "consumer": "api-gateway", "contract": "auth-api@v2"},
        {"producer": "auth-service", "consumer": "billing-service", "contract": "auth-events@v1"}
      ]
    },
    "contract_changes_detected": 3,
    "breaking_changes": 1,
    "merge_sequence": [
      {"repo": "auth-service", "pr": 142, "depends_on": [], "status": "ready"},
      {"repo": "api-gateway", "pr": 89, "depends_on": ["auth-service#142"], "status": "blocked"},
      {"repo": "billing-service", "pr": 56, "depends_on": ["auth-service#142"], "status": "blocked"},
      {"repo": "frontend", "pr": 203, "depends_on": ["api-gateway#89"], "status": "blocked"}
    ],
    "cross_repo_tests": ["tests/integration/auth-flow.test.ts", "tests/integration/billing-event.test.ts"],
    "rollback_plan": "revert auth-service#142 → consumers auto-revert via dependency"
  }
```

## Process

### Step 1: Map Repo Dependency Graph

For each repo, determine:

- **Produces**: contracts this repo exposes (API endpoints, DB schemas, event schemas, shared type packages)
- **Consumes**: contracts this repo depends on (which other repos' APIs/schemas/events it calls/reads)
- **Version**: current contract version (semver)

Sources for this map:

- `package.json` dependencies (Node)
- `requirements.txt` / `pyproject.toml` (Python)
- `go.mod` (Go)
- Proto files / OpenAPI specs
- Event schema registry (if exists)
- README / architecture docs

### Step 2: Identify Contract Changes

Walk the plan (BLUEPRINT.md) and tag each task with the contract it touches:

| Change type                    | Breaking? | Version bump | Sequence rule                                                                           |
| ------------------------------ | --------- | ------------ | --------------------------------------------------------------------------------------- |
| API endpoint added             | No        | minor        | Consumer can adopt anytime                                                              |
| API endpoint removed           | Yes       | major        | Producer must merge first; consumers must update before producer deploys                |
| API field added (optional)     | No        | minor        | Producer first; consumers adopt at leisure                                              |
| API field removed              | Yes       | major        | Producer must give deprecation notice; consumers update; producer removes in next major |
| DB schema migration (additive) | No        | n/a          | Producer first; consumers unaffected                                                    |
| DB schema migration (breaking) | Yes       | n/a          | Producer first; consumers must update queries before producer deploys                   |
| Event schema change (additive) | No        | minor        | Producer first; consumers ignore new fields                                             |
| Event schema change (breaking) | Yes       | major        | Dual-publish (old + new) → consumers update → stop publishing old                       |

### Step 3: Sequence Per-Repo Work

Topological sort the repos by contract dependency:

```
auth-service (producer, no deps)        → PR first
  ↓
api-gateway (consumer of auth-service)  → PR after auth-service merges
billing-service (consumer of auth-service) → PR after auth-service merges (parallel with api-gateway)
  ↓
frontend (consumer of api-gateway)      → PR after api-gateway merges
```

### Step 4: Per-Repo Branch + PR

For each repo, in dependency order:

1. Create branch `multi-repo/<change-id>` in that repo
2. Apply the planned changes
3. Run repo-local tests (unit + integration within the repo)
4. Bump contract version (semver) if producer
5. Open PR with title referencing the change ID: `[multi-repo#change-42] Update auth API to v2`
6. PR description includes: contract changes, breaking flag, downstream consumers that need updating

### Step 5: Cross-Repo Integration Tests

Before any merge, spin up the full stack and run cross-repo integration tests:

- `docker-compose up` with all services using the new branches
- Tests cover: every contract change, every producer→consumer flow
- If a test fails → the producer PR is broken; do not merge; route to debug

### Step 6: Merge in Dependency Order

Merge sequence (topological):

1. Producer PRs merge first
2. Wait for producer deployment (or local mock) to be available
3. Consumer PRs merge next, in their own dependency order
4. After each merge, re-run cross-repo tests on the updated stack

Rollback: if a consumer fails after producer merges, revert the producer PR (which auto-reverts downstream via dependency).

## CLI

```bash
# Map the dependency graph
python3 scripts/multi_repo.py map \
  --repos auth-service,api-gateway,billing-service,frontend

# Detect contract changes from BLUEPRINT.md
python3 scripts/multi_repo.py detect-changes \
  --blueprint ./BLUEPRINT.md \
  --repo-map ./repo-map.json

# Generate merge sequence
python3 scripts/multi_repo.py sequence \
  --repo-map ./repo-map.json \
  --changes ./contract-changes.json

# Open per-repo PRs (after local work is done)
python3 scripts/multi_repo.py open-prs --sequence ./merge-sequence.json

# Run cross-repo integration tests
python3 scripts/multi_repo.py cross-test --sequence ./merge-sequence.json

# Merge in order (after all PRs green)
python3 scripts/multi_repo.py merge-all --sequence ./merge-sequence.json
```

## Decision Tree (autonomous)

```
Q: Does the project span multiple repos?
  YES → continue
  NO  → skip this sub-skill; use single-repo workflow

Q: Are there contract changes (API/DB/event/type)?
  YES → continue
  NO  → repos are independent; execute in parallel, no coordination needed

Q: Are any changes breaking?
  YES → producer MUST merge first; consumers MUST update before producer deploys
  NO  → producer first is still recommended but not blocking

Q: Is the dependency graph a DAG (no cycles)?
  YES → continue
  NO  → halt, surface cycle to user (circular contract dependency is an architecture problem)

Q: Do cross-repo integration tests pass?
  YES → merge in dependency order
  NO  → do NOT merge; route failing test to debug-entry

Q: Did a downstream consumer fail after producer merged?
  YES → revert producer PR, re-plan the contract change
  NO  → continue merge sequence
```

## Breaking Change Protocol

Breaking changes are the highest-risk scenario. The protocol:

1. **Producer opens PR** with `[BREAKING]` tag in title.
2. **Producer PR is NOT merged** until all consumers have updated PRs open and green.
3. **Consumers update** their code to handle the new contract (often dual-support: work with both old and new during transition).
4. **Cross-repo tests** verify all consumers work with the new producer.
5. **Merge sequence**: consumers merge first (they dual-support), then producer merges (now safe because all consumers handle the new contract).
6. **Follow-up**: in the next cycle, consumers remove the old-contract support code (cleanup PRs).

This is the "expand-contract" pattern: expand the contract (add new, support both) → migrate consumers → contract the contract (remove old).

## Self-Improvement Hook

Every multi-repo orchestration appends to `audit-trail.jsonl`:

```json
{
  "ts": "...",
  "phase": "6",
  "action": "multi-repo-merge",
  "repos": 4,
  "breaking_changes": 1,
  "merge_sequence_length": 4,
  "cross_repo_tests_passed": 12,
  "rollbacks": 0
}
```

`meta-auditor` checks: if rollbacks > 0, the contract change planning was insufficient → route to `self-patch-generator` to tighten the breaking-change detection heuristic.

## Failure Modes & Recovery

| Symptom                                          | Cause                                                    | Recovery                                                                         |
| ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Circular dependency detected                     | Architecture issue                                       | Halt, surface to user; cannot auto-fix                                           |
| Consumer fails after producer merges             | Contract change was breaking and consumer wasn't updated | Revert producer PR, update consumer, retry                                       |
| Cross-repo tests can't spin up (missing service) | Service not containerized or missing docker-compose      | Halt, ask user to provide docker-compose or skip cross-repo tests (with warning) |
| Version conflict (two producers same contract)   | Two repos both think they own a contract                 | Halt, surface to user; contract ownership must be clarified                      |
| PR merge blocked by repo branch protection       | CI checks pending                                        | Wait, or ask user to override (with risk acknowledgment)                         |

## Tools

- **git** (multi-repo) — branches, PRs, merges across repos
- **docker-compose** — cross-repo integration test environment
- **api-contract** (sibling) — defines and validates API contracts
- **data-migration** (sibling) — DB schema migrations
- **plan-decomposer** (sibling) — for decomposing within a single repo of the multi-repo project

## Permissions

- Filesystem: read/write across all repos in the project (configured via `--repos`)
- Network: outbound HTTPS to git remotes (GitHub/GitLab/etc.); outbound to container registry for docker-compose
- Processes: spawn `git`, `docker-compose`, per-repo test runners

## Hard Rules

1. **Never break a contract without a version bump.** Breaking changes without a major version bump are forbidden — consumers will silently break.
2. **Never merge a consumer before its producer.** Topological merge order is non-negotiable; out-of-order merges cause integration branch breakage.
3. **Always run cross-repo integration tests before any merge.** Repo-local tests passing ≠ the contract holds end-to-end.
4. **Never auto-merge breaking changes.** Breaking changes require all consumers to have updated PRs open and green before the producer merges.
5. **Always have a rollback plan.** Every merge sequence records what to revert if a downstream consumer fails.
6. **Always map the dependency graph first.** Without the graph, sequencing is guesswork.
7. **Never skip the cycle check.** A circular contract dependency is an architecture problem that must surface to the user, not be papered over.
8. **Always tag PRs with the change ID.** `[multi-repo#change-42]` makes it possible to trace a PR back to the orchestration run.
