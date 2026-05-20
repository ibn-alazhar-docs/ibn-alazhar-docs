# BOOT_SEQUENCE.md — Session Startup Lifecycle

> **Purpose:** Define the sequence of operations when a new AI session starts.
> **Scope:** `.opencode/` runtime initialization.

---

## Boot Sequence Overview

Every session follows this boot sequence to ensure consistent context, correct model selection, and proper phase awareness.

```
1. Load Runtime Manifest
2. Hydrate Memory
3. Detect Active Phase
4. Load Project Context
5. Initialize Model
6. Load Agent Roster
7. Run Health Checks
8. Session Ready
```

---

## Step 1: Load Runtime Manifest

**File:** `SYSTEM.md`

Load the runtime entry point to understand:
- Directory structure
- Source of truth hierarchy
- Quick reference paths
- Runtime version

**Check:** Runtime version is compatible with current project phase.

---

## Step 2: Hydrate Memory

**Files:** `memory/`

Load all memory files in this order:

1. `memory/project/project-overview.md` — What is this project?
2. `memory/project/phase-1-focus.md` — What is the current phase focus?
3. `memory/project/current-status.md` — Where does the project stand?
4. `memory/decisions/architecture-decisions.md` — What decisions have been made?
5. `memory/brand/brand-rules.md` — What are the brand constraints?

**Check:** All memory files exist and are non-empty. If any are missing or empty, flag for population.

---

## Step 3: Detect Active Phase

**File:** `runtime/runtime-status.md`

Read the runtime status to determine:
- Current active phase
- Phase gate status
- Locked specs
- In-progress work
- Blocked items

**Check:** Active phase matches the project's actual state. If mismatch, flag for reconciliation.

---

## Step 4: Load Project Context

**Files:** `PROJECT_RUNTIME.md` + key docs

Load:
- Project identity and problem/solution
- Tech stack
- Current phase scope and exclusions
- Brand rules summary
- Key constraints
- Key document paths

**Cross-reference:** Verify key docs exist at expected paths.

---

## Step 5: Initialize Model

**File:** `MODEL_ROUTING.md` + `runtime/model-selection.md`

Determine the appropriate model for the session's primary task:
- Coding task → coding model
- Reasoning task → reasoning model
- Review task → review model
- Utility task → utility model

Apply fallback routing if primary model is unavailable.

**Check:** Model is available and responsive.

---

## Step 6: Load Agent Roster

**Directory:** `agents/core/`

Load agent definitions for agents relevant to the current session:
- architect
- spec-guardian
- qa-lead
- security-reviewer
- rtl-auditor
- frontend-polish
- docs-sync
- docker-auditor

**Check:** Agent definitions exist and specify role, mission, scope, inputs, outputs, escalation, boundaries, and forbidden actions.

---

## Step 7: Run Health Checks

**File:** `runtime/runtime-health.md`

Verify:
- All required runtime files exist
- Memory is consistent with project state
- Phase gate status is current
- Model routing is configured
- Policies are loaded
- No unresolved blocking issues

**Output:** Health check report. If any check fails, session starts in degraded mode with warnings.

---

## Step 8: Session Ready

Session is initialized and ready for work.

**Session context includes:**
- Project identity and goals
- Active phase and scope
- Brand rules and constraints
- Available agents and skills
- Model routing configuration
- Policy enforcement rules
- Execution boundaries

---

## Boot Failure Modes

| Failure | Symptom | Recovery |
|---------|---------|----------|
| Missing memory file | Context gap | Flag for population, continue with available context |
| Phase mismatch | Wrong scope awareness | Reconcile with `docs/`, update `runtime-status.md` |
| Model unavailable | Cannot route task | Apply fallback routing per `MODEL_ROUTING.md` |
| Corrupted runtime file | Parse error | Restore from template or flag for repair |
| Empty agent definition | Agent cannot operate | Flag for population, skip agent for this session |

---

## Post-Boot Actions

After boot completes:
1. Log session start in `sessions/`
2. Record boot timestamp and model used
3. Note any degraded mode warnings
4. Ready for task intake
