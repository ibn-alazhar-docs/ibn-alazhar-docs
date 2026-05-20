# Runtime: Session Loader

> **File:** `runtime/session-loader.md`
> **Purpose:** Define how session context is hydrated from memory and docs.

---

## Session Loading Process

When a session starts, the session loader hydrates context from persistent storage.

### Step 1: Load Runtime Manifest

- Read `SYSTEM.md`.
- Verify runtime version.
- Load directory structure reference.

### Step 2: Load Manifesto

- Read `RUNTIME_MANIFESTO.md`.
- Load operating principles.
- Set principle enforcement flag.

### Step 3: Hydrate Memory

- Read `memory/project/project-overview.md` → Project identity.
- Read `memory/project/phase-1-focus.md` → Phase focus.
- Read `memory/project/current-status.md` → Current status.
- Read `memory/decisions/architecture-decisions.md` → Decisions.
- Read `memory/brand/brand-rules.md` → Brand constraints.

### Step 4: Load Project Context

- Read `PROJECT_RUNTIME.md`.
- Cross-reference with `docs/00_PROJECT_BRIEF.md`.
- Verify key doc paths exist.

### Step 5: Load Operating Rules

- Read `AI_OPERATING_RULES.md`.
- Read `SESSION_RULES.md`.
- Read `AGENT_RULES.md`.
- Set rule enforcement flags.

### Step 6: Load Execution Framework

- Read `EXECUTION_ENGINE.md`.
- Read `WORKFLOW.md`.
- Read `PHASE_GATES.md`.
- Read `REVIEW_PIPELINE.md`.

### Step 7: Detect Active Phase

- Read `runtime/runtime-status.md`.
- Verify phase matches `docs/13_PHASE_1_PLAN.md`.
- Load phase scope and exclusions.

### Step 8: Initialize Model

- Read `MODEL_ROUTING.md`.
- Classify session task type.
- Select model per routing table.
- Verify model availability.

### Step 9: Load Agents

- Read all agent files in `agents/core/`.
- Verify agent definitions are complete.
- Set agent availability.

### Step 10: Run Health Check

- Run health checks per `runtime/runtime-health.md`.
- Report any failures or warnings.
- Set degraded mode if needed.

### Step 11: Create Session Record

- Create session record in `sessions/`.
- Log timestamp, model, phase, and health status.

---

## Session Context Summary

After loading, the session has:

| Context Element | Source |
|-----------------|--------|
| Runtime identity | `SYSTEM.md` |
| Operating principles | `RUNTIME_MANIFESTO.md` |
| Project overview | `memory/project/project-overview.md` |
| Phase focus | `memory/project/phase-1-focus.md` |
| Current status | `memory/project/current-status.md` |
| Architecture decisions | `memory/decisions/architecture-decisions.md` |
| Brand rules | `memory/brand/brand-rules.md` |
| Project context | `PROJECT_RUNTIME.md` |
| Operating rules | `AI_OPERATING_RULES.md`, `SESSION_RULES.md`, `AGENT_RULES.md` |
| Execution framework | `EXECUTION_ENGINE.md`, `WORKFLOW.md`, `PHASE_GATES.md` |
| Review pipeline | `REVIEW_PIPELINE.md` |
| Active phase | `runtime/runtime-status.md` |
| Model selection | `MODEL_ROUTING.md` |
| Agent roster | `agents/core/*.md` |
| Health status | `runtime/runtime-health.md` |

---

## Session Loading Failure

| Step | Failure | Recovery |
|------|---------|----------|
| 1-2 | Runtime files missing | Cannot proceed. Critical failure. |
| 3 | Memory missing | Flag warning, load from `docs/` as fallback. |
| 4 | Project context missing | Load from `docs/00_PROJECT_BRIEF.md` directly. |
| 5 | Operating rules missing | Use default rules from CLAUDE.md. |
| 6 | Execution framework missing | Use default execution model. |
| 7 | Phase status missing | Derive from `docs/13_PHASE_1_PLAN.md`. |
| 8 | Model unavailable | Apply fallback routing. |
| 9 | Agent files missing | Flag warning, skip missing agents. |
| 10 | Health check fails | Continue in degraded mode with warnings. |
| 11 | Session record creation fails | Log to console, continue. |
