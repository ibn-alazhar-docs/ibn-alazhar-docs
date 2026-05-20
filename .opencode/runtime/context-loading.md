# Runtime: Context Loading

> **File:** `runtime/context-loading.md`
> **Purpose:** Define the order and priority of context loading during session startup.

---

## Context Loading Order

Context is loaded in layers, from most critical to least critical. Each layer builds on the previous.

### Layer 1: Runtime Identity (Critical)

**Files:**
- `SYSTEM.md`
- `RUNTIME_MANIFESTO.md`

**Purpose:** What is this runtime? What principles govern it?
**Load Priority:** FIRST. Cannot proceed without these.

### Layer 2: Project Memory (Critical)

**Files:**
- `memory/project/project-overview.md`
- `memory/project/phase-1-focus.md`
- `memory/project/current-status.md`
- `memory/decisions/architecture-decisions.md`
- `memory/brand/brand-rules.md`

**Purpose:** What is the project? What phase? What decisions? What brand rules?
**Load Priority:** SECOND. Cannot proceed without these.

### Layer 3: Project Context (High)

**Files:**
- `PROJECT_RUNTIME.md`
- `docs/00_PROJECT_BRIEF.md`
- `docs/27_MVP_SCOPE_LOCK.md`
- `docs/13_PHASE_1_PLAN.md`

**Purpose:** Detailed project context, scope, and phase plan.
**Load Priority:** THIRD. Needed for informed work.

### Layer 4: Operating Rules (High)

**Files:**
- `AI_OPERATING_RULES.md`
- `SESSION_RULES.md`
- `AGENT_RULES.md`

**Purpose:** What rules must be followed?
**Load Priority:** FOURTH. Needed for compliant work.

### Layer 5: Execution Framework (Medium)

**Files:**
- `EXECUTION_ENGINE.md`
- `WORKFLOW.md`
- `PHASE_GATES.md`
- `REVIEW_PIPELINE.md`

**Purpose:** How does work get done? What are the workflows?
**Load Priority:** FIFTH. Needed for structured work.

### Layer 6: Model & Agent Config (Medium)

**Files:**
- `MODEL_ROUTING.md`
- `MCP_STACK.md`
- `agents/core/*.md`

**Purpose:** Which model? Which agents? What tools?
**Load Priority:** SIXTH. Needed for task execution.

### Layer 7: Skills & Policies (Low)

**Files:**
- `skills/**/*.md`
- `policies/**/*.md`

**Purpose:** What skills are available? What policies apply?
**Load Priority:** SEVENTH. Activated on demand.

### Layer 8: Runtime Mechanics (Low)

**Files:**
- `runtime/*.md`
- `templates/*.md`
- `workflows/**/*.md`

**Purpose:** How does the runtime work internally?
**Load Priority:** EIGHTH. Referenced as needed.

---

## Context Loading Rules

1. **Load in order.** Each layer depends on the previous.
2. **Critical layers are mandatory.** Layers 1-2 must load successfully.
3. **High layers are expected.** Layers 3-4 should load. Flag if missing.
4. **Medium layers are recommended.** Layers 5-6 should load. Warn if missing.
5. **Low layers are optional.** Layers 7-8 load on demand.
6. **Cross-reference validation.** After loading, verify cross-references between files.
7. **Memory consistency.** Verify memory is consistent with docs.

---

## Context Loading Failure

| Layer | Failure | Impact | Recovery |
|-------|---------|--------|----------|
| 1 | Runtime identity missing | Critical | Cannot bootstrap |
| 2 | Memory missing | Critical | Cannot proceed without project context |
| 3 | Project context missing | High | Load from `docs/` directly |
| 4 | Operating rules missing | High | Use default rules from CLAUDE.md |
| 5 | Execution framework missing | Medium | Use default execution model |
| 6 | Model/agent config missing | Medium | Use default model and agents |
| 7 | Skills/policies missing | Low | Load on demand |
| 8 | Runtime mechanics missing | Low | Reference as needed |
