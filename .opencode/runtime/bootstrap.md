# Runtime: Bootstrap

> **File:** `runtime/bootstrap.md`
> **Purpose:** Detailed startup lifecycle for the runtime.

---

## Bootstrap Lifecycle

The bootstrap lifecycle initializes the runtime when a session starts. It ensures all context, models, agents, and policies are loaded before any work begins.

### Phase 1: Runtime Manifest Load

**Action:** Read `SYSTEM.md`.
**Purpose:** Load runtime structure, source of truth hierarchy, and quick reference.
**Verification:** File exists and is non-empty.

### Phase 2: Memory Hydration

**Action:** Read all files in `memory/`.
**Order:**
1. `memory/project/project-overview.md`
2. `memory/project/phase-1-focus.md`
3. `memory/project/current-status.md`
4. `memory/decisions/architecture-decisions.md`
5. `memory/brand/brand-rules.md`

**Purpose:** Load persistent project knowledge.
**Verification:** All files exist and are non-empty. Flag any that are missing.

### Phase 3: Phase Detection

**Action:** Read `runtime/runtime-status.md`.
**Purpose:** Determine active phase, gate status, and locked specs.
**Verification:** Status file exists. If missing, derive from `docs/`.

### Phase 4: Context Loading

**Action:** Read `PROJECT_RUNTIME.md` and cross-reference with `docs/`.
**Purpose:** Load project identity, tech stack, constraints, and key document paths.
**Verification:** Key docs exist at expected paths.

### Phase 5: Model Initialization

**Action:** Read `MODEL_ROUTING.md` and `runtime/model-selection.md`.
**Purpose:** Select appropriate model for session task.
**Verification:** Model is available. Apply fallback if not.

### Phase 6: Agent Loading

**Action:** Read all agent definitions in `agents/core/`.
**Purpose:** Load available agents with their roles, missions, and boundaries.
**Verification:** All agent files exist and are non-empty.

### Phase 7: Policy Loading

**Action:** Read all policy files in `policies/`.
**Purpose:** Load enforcement rules.
**Verification:** All policy files exist.

### Phase 8: Health Check

**Action:** Run health checks per `runtime/runtime-health.md`.
**Purpose:** Verify runtime integrity.
**Output:** Health check report.

### Phase 9: Session Ready

**Action:** Create session record in `sessions/`.
**Purpose:** Log session start with timestamp, model, and phase.
**Output:** Session record created.

---

## Bootstrap Failure Recovery

| Failure Point | Recovery |
|---------------|----------|
| SYSTEM.md missing | Cannot bootstrap. Flag as critical failure. |
| Memory file missing | Flag warning, continue with available memory. |
| Runtime status missing | Derive from `docs/13_PHASE_1_PLAN.md` and `docs/27_MVP_SCOPE_LOCK.md`. |
| Model unavailable | Apply fallback routing from `MODEL_ROUTING.md`. |
| Agent file missing | Flag warning, skip agent for this session. |
| Policy file missing | Flag warning, continue with default policies. |
| Health check fails | Report failures, continue in degraded mode. |

---

## Bootstrap Output

After successful bootstrap:
- Session context is loaded.
- Model is selected and verified.
- Agents are available.
- Policies are enforced.
- Health check passed (or degraded mode noted).
- Session record is created.
