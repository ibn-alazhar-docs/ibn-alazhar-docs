---
name: plan-decomposer
description: "Breaks complex BLUEPRINT.md plans into parallelizable chunks for multi-agent execution. Builds a dependency DAG, identifies the critical path, and dispatches independent chunks to git-worktrees + subagent-dev. Merges in dependency order with per-chunk verification."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Plan Decomposer

> Phase 5/6 sub-skill. Turns a serial plan into a parallel execution graph. The skill's project manager: identifies what can run at the same time, what must wait, and what's on the critical path. Without it, large projects serialize unnecessarily and miss deadlines.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 5 — PRIORITIZE | Project has > 8 tasks in BLUEPRINT.md | Manual sequencing is error-prone at scale |
| Phase 5 — PRIORITIZE | Plan spans multiple layers (frontend/backend/infra) | Layers are usually parallelizable |
| Phase 6 — EXECUTE | `subagent-dev` available, plan has independent chunks | Spawn subagents in parallel |
| Phase 6 — EXECUTE | User requests "make this faster" | Re-decompose for more parallelism |
| Manual trigger | User asks "what can run in parallel?" | Diagnostic |

**Do NOT use this sub-skill for:** small plans (< 8 tasks — just execute serially), plans with all tasks depending on each other (nothing to parallelize), or sub-tasks within a single chunk (decompose once, then execute the chunk as a unit).

## What It Does

1. Reads `BLUEPRINT.md` (the plan) and extracts the task list with dependencies.
2. Builds a dependency DAG (Directed Acyclic Graph) — nodes are tasks, edges are "depends on" relationships.
3. Detects cycles (a cycle = bad plan, halt and surface for human fix).
4. Identifies the **critical path** (longest chain of dependent tasks) — this determines minimum project duration.
5. Groups tasks into **chunks** using one of three decomposition strategies (see Strategies below).
6. For each chunk, assigns to a subagent via `git-worktrees` + `subagent-dev`.
7. Monitors chunk completion; merges in dependency order (a chunk's downstream dependents can't start until it merges).
8. Per-chunk verification: each chunk must pass its own `verification-gate` before merge.

## Integration Contract

```
INPUT:
  - blueprint_path: path to BLUEPRINT.md (default: ./BLUEPRINT.md)
  - strategy: auto | by-layer | by-feature | by-phase (default auto)
  - max_parallelism: int (default: 4 — matches typical subagent pool size)
  - subagent_pool: list of available subagents (from subagent-dev)

OUTPUT (JSON to stdout):
  {
    "tasks_total": 24,
    "chunks": [
      {
        "id": "chunk-1",
        "strategy": "by-layer",
        "layer": "backend",
        "tasks": ["task-3", "task-7", "task-12"],
        "depends_on": [],
        "assigned_to": "subagent-1",
        "worktree": "/tmp/worktrees/chunk-1",
        "branch": "chunk-1/backend",
        "estimated_hours": 6,
        "critical_path": false
      },
      ...
    ],
    "critical_path": ["task-1", "task-5", "task-9", "task-15"],
    "critical_path_duration_hours": 18,
    "parallel_speedup": 2.4,            // vs serial
    "merge_order": ["chunk-1", "chunk-3", "chunk-2", "chunk-4"]
  }
```

## Decomposition Strategies

| Strategy | When to use | Parallelism | Example |
|----------|-------------|-------------|---------|
| **By layer** | Frontend / backend / infra are independent | High (3-way parallel) | Frontend (React components), Backend (API), Infra (Terraform) |
| **By feature** | Features are orthogonal (auth, payments, search) | High (N-way parallel, N = feature count) | Auth service, Payments service, Search service |
| **By phase** | Tasks within a phase are sequential, phases are gated | Low (1-way, but explicit gates) | Audit → Execute → Verify (each blocks the next) |
| **Auto** (default) | Decomposer picks per project | Varies | Inspect dependencies, choose strategy that maximizes parallelism without breaking deps |

`auto` strategy: try `by-feature` first (highest parallelism). If features share > 30% of files, fall back to `by-layer`. If layers share > 50%, fall back to `by-phase` (mostly serial).

## Dependency DAG

```python
# Pseudo-code for the DAG builder
class Task:
    id: str
    depends_on: list[str]   # task IDs this depends on
    layer: str              # frontend | backend | infra | docs
    feature: str            # auth | payments | search | ...
    estimated_hours: float

# Cycle detection: Tarjan's SCC algorithm
# Critical path: longest path through DAG (topological sort + DP)
# Chunking: group by strategy, then verify no inter-chunk cyclic deps
```

A chunk is **parallelizable** if it has no dependencies on any other in-flight chunk. A chunk is **on the critical path** if delaying it delays the entire project.

## CLI

```bash
# Decompose with auto strategy (default)
python3 scripts/plan_decomposer.py decompose \
  --blueprint ./BLUEPRINT.md \
  --max-parallelism 4

# Use a specific strategy
python3 scripts/plan_decomposer.py decompose \
  --blueprint ./BLUEPRINT.md \
  --strategy by-layer

# Show the DAG (for debugging)
python3 scripts/plan_decomposer.py visualize --blueprint ./BLUEPRINT.md --out dag.svg

# Dispatch chunks to subagents
python3 scripts/plan_decomposer.py dispatch \
  --blueprint ./BLUEPRINT.md \
  --subagent-pool subagent-1,subagent-2,subagent-3,subagent-4

# Merge a completed chunk (in dependency order)
python3 scripts/plan_decomposer.py merge --chunk-id chunk-1
```

## Decision Tree (autonomous)

```
Q: Does BLUEPRINT.md have a task list with dependencies?
  YES → continue
  NO  → halt, ask spec-generator to regenerate BLUEPRINT with explicit deps

Q: Are there cycles in the dependency graph?
  YES → halt, surface the cycle to user (bad plan, needs human fix)
  NO  → continue

Q: How many tasks?
  < 8 → skip decomposition, execute serially (overhead not worth it)
  ≥ 8 → continue

Q: Which strategy?
  auto → try by-feature, fall back to by-layer, fall back to by-phase
  explicit → use the user-specified strategy

Q: Are chunks truly independent (no shared files / no shared state)?
  YES → dispatch in parallel
  NO  → serialize the conflicting chunks; dispatch the rest in parallel

Q: Did a chunk fail verification?
  YES → do NOT merge; route to debug-entry; re-dispatch the failed chunk
  NO  → merge in dependency order

Q: Are all chunks merged?
  YES → mark plan complete, hand off to Phase 7 VERIFY
  NO  → wait for next chunk to complete
```

## Merge Order

Chunks are merged in **topological order** — a chunk can only merge after all its dependencies have merged. This prevents merge conflicts and ensures the integration branch is always in a consistent state.

```
chunk-1 (backend, no deps)        → merge first
chunk-3 (infra, no deps)          → merge first (parallel with chunk-1)
chunk-2 (frontend, depends on chunk-1) → merge after chunk-1
chunk-4 (integration, depends on chunk-1, chunk-2, chunk-3) → merge last
```

Each merge runs:
1. `git merge --no-ff chunk-N/branch` into integration branch
2. Full test suite (not just chunk tests — integration tests too)
3. If tests fail → revert merge, route chunk back to subagent for fix

## Per-Chunk Verification

Before a chunk can merge, it must pass its own `verification-gate`:

- [ ] All chunk tasks completed (per BLUEPRINT)
- [ ] Unit tests pass for chunk's files
- [ ] No new lint errors in chunk's files
- [ ] Chunk's `spec-sync` items all have `[SP-N]` references
- [ ] Chunk's `audit-trail` entries logged
- [ ] Chunk does not touch files outside its declared scope (prevents scope creep)

If a chunk touches files outside its declared scope → halt, surface as "scope violation" — the chunk needs to be re-decomposed or the scope expanded explicitly.

## Self-Improvement Hook

Every decomposition run appends to `audit-trail.jsonl`:

```json
{"ts": "...", "phase": "5", "action": "decompose", "strategy": "by-layer", "chunks": 4, "parallel_speedup": 2.4, "critical_path_hours": 18, "actual_hours": 19}
```

`meta-auditor` compares `parallel_speedup` (predicted) vs actual time saved. If actual consistently < predicted, the decomposer is over-optimistic — `self-patch-generator` tunes the estimation.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Cycle detected in DAG | Bad BLUEPRINT (A depends on B, B depends on A) | Halt, surface to user, ask for plan fix |
| Chunk fails to merge (conflicts) | Two chunks touched same file | Re-decompose with finer granularity, or serialize the conflicting chunks |
| Subagent produces off-scope changes | Subagent didn't respect chunk boundary | Discard off-scope changes, re-dispatch with stricter scope guard |
| Critical path dominates (parallel speedup < 1.2) | Plan is inherently serial | Accept serial execution; don't force parallelism that isn't there |
| One subagent hangs | Subagent crash | Timeout (30 min), re-dispatch chunk to another subagent |

## Tools

- **git-worktrees** (sibling) — creates isolated worktrees per chunk
- **subagent-dev** (sibling) — spawns subagents to execute chunks
- **verification-gate** (sibling) — per-chunk verification
- **NetworkX** (Python) — DAG construction, cycle detection, topological sort
- **graphviz** — optional DAG visualization

## Permissions

- Filesystem: read `BLUEPRINT.md`; write `worktrees/`, `decomposition.json`; do not touch source code directly (subagents do)
- Network: none directly (subagents may have their own network access)
- Processes: spawn `git worktree`, spawn subagents via `subagent-dev`

## Hard Rules

1. **Never parallelize dependent tasks.** If task A depends on task B, they run serially — no exceptions, even if "they probably won't conflict."
2. **Always merge in dependency order.** Topological order is non-negotiable; merging out-of-order causes integration branch breakage.
3. **Always verify each chunk independently.** A chunk that passes its own tests but breaks integration is not "done" — full test suite on merge.
4. **Never skip cycle detection.** A DAG with a cycle is a bug in the plan; running it produces undefined behavior.
5. **Always respect declared chunk scope.** A chunk that touches files outside its scope is a scope violation, not a "minor overreach."
6. **Always log the critical path.** Without it, you can't tell whether a delay is on the critical path (matters) or off it (doesn't).
7. **Always time-box subagents.** A hung subagent blocks the whole plan — 30 min timeout, then re-dispatch.
8. **Never force parallelism that isn't there.** If parallel speedup is < 1.2, run serially — the overhead of coordination exceeds the gain.
