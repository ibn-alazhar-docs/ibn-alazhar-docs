# Runtime: Runtime Health

> **File:** `runtime/runtime-health.md`
> **Purpose:** Define health checks for the runtime system.

---

## Health Check Categories

### 1. File Integrity

**Check:** All required runtime files exist and are non-empty.

**Required Files:**
- `SYSTEM.md`
- `PROJECT_RUNTIME.md`
- `RUNTIME_MANIFESTO.md`
- `EXECUTION_ENGINE.md`
- `BOOT_SEQUENCE.md`
- `REVIEW_PIPELINE.md`
- `WORKFLOW.md`
- `PHASE_GATES.md`
- `MODEL_ROUTING.md`
- `AI_OPERATING_RULES.md`
- `MCP_STACK.md`
- `SESSION_RULES.md`
- `AGENT_RULES.md`

**Required Runtime Mechanics:**
- `runtime/bootstrap.md`
- `runtime/context-loading.md`
- `runtime/escalation-rules.md`
- `runtime/model-selection.md`
- `runtime/runtime-health.md`
- `runtime/runtime-status.md`
- `runtime/session-loader.md`
- `runtime/tool-permissions.md`
- `runtime/rollback-procedures.md`
- `runtime/failure-recovery.md`
- `runtime/deadlock-resolution.md`
- `runtime/session-metrics.md`

**Required Review Standards:**
- `reviews/REVIEW_STANDARD.md`

**Required MCP Docs:**
- `mcp/runtime-hooks.md`
- `mcp/integration-status.md`

**Required Directories:**
- `agents/core/` (8 agent files)
- `skills/` (all skill files)
- `memory/` (all memory files)
- `runtime/` (all runtime files)
- `policies/` (all policy files)
- `workflows/` (all workflow files)
- `templates/` (all template files)

**Status:** PASS if all exist and non-empty. FAIL if any missing.

### 2. Memory Consistency

**Check:** Memory files are consistent with project docs.

**Checks:**
- `memory/project/project-overview.md` matches `docs/00_PROJECT_BRIEF.md`.
- `memory/project/current-status.md` matches actual project state.
- `memory/brand/brand-rules.md` matches `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`.
- `memory/decisions/architecture-decisions.md` references current ADRs.

**Status:** PASS if consistent. WARN if minor drift. FAIL if major inconsistency.

### 3. Phase Gate Status

**Check:** Phase gate status is current.

**Checks:**
- `runtime/runtime-status.md` exists and has current phase.
- Phase matches `docs/13_PHASE_1_PLAN.md` (or relevant phase plan).
- Gate status is not stale (last updated within 7 days).

**Status:** PASS if current. WARN if stale. FAIL if missing.

### 4. Model Routing

**Check:** Model routing is configured.

**Checks:**
- `MODEL_ROUTING.md` exists and has routing table.
- `runtime/model-selection.md` exists.
- Preferred models are listed.
- Fallback chains are defined.

**Status:** PASS if configured. FAIL if missing.

### 5. Policy Enforcement

**Check:** Policies are loaded.

**Checks:**
- All policy files in `policies/` exist.
- Policies are non-empty.
- No policy conflicts detected.

**Status:** PASS if loaded. FAIL if missing.

### 6. Agent Availability

**Check:** All agent definitions exist and are complete.

**Checks:**
- All 8 agent files in `agents/core/` exist.
- Each agent file has: role, mission, scope, inputs, outputs, escalation, boundaries, forbidden actions, workflow participation.

**Status:** PASS if all complete. WARN if incomplete. FAIL if missing.

### 7. Recovery Procedures

**Check:** Recovery and rollback procedures are defined.

**Checks:**
- `runtime/rollback-procedures.md` exists and defines 6 rollback levels.
- `runtime/failure-recovery.md` exists and covers all failure classes.
- `runtime/deadlock-resolution.md` exists and defines 4 deadlock types.
- `runtime/session-metrics.md` exists and defines metric categories.

**Status:** PASS if all exist and non-empty. FAIL if any missing.

### 8. Review Standards

**Check:** Review artifact standards are defined.

**Checks:**
- `reviews/REVIEW_STANDARD.md` exists and defines artifact requirements.
- Review template is included.
- Severity definitions are clear.
- Anti-patterns are documented.

**Status:** PASS if defined. FAIL if missing.

### 9. MCP Integration

**Check:** MCP integration architecture is defined and status is tracked.

**Checks:**
- `mcp/runtime-hooks.md` exists and defines hook points.
- `mcp/integration-status.md` exists and tracks server status.
- Native tools are listed as operational.
- External servers are marked as conceptual/planned (not falsely claimed as operational).
- Fallback model is defined.

**Status:** PASS if architecture defined. WARN if status is stale. FAIL if missing.

---

## Health Check Output

```markdown
## Runtime Health Check

- Timestamp: YYYY-MM-DD HH:MM:SS
- Overall: PASS | WARN | FAIL

| Category | Status | Notes |
|----------|--------|-------|
| File Integrity | PASS/FAIL | [notes] |
| Memory Consistency | PASS/WARN/FAIL | [notes] |
| Phase Gate Status | PASS/WARN/FAIL | [notes] |
| Model Routing | PASS/FAIL | [notes] |
| Policy Enforcement | PASS/FAIL | [notes] |
| Agent Availability | PASS/WARN/FAIL | [notes] |
| Recovery Procedures | PASS/FAIL | [notes] |
| Review Standards | PASS/FAIL | [notes] |
| MCP Integration | PASS/WARN/FAIL | [notes] |
```

---

## Health Check Frequency

| Trigger | Frequency |
|---------|-----------|
| Session start | Every session |
| Runtime file update | After update |
| Phase status change | After change |
| Manual request | On demand |
| Scheduled | Daily (if runtime is active) |

---

## Degraded Mode

If health check returns WARN or FAIL:

1. Log the specific failures.
2. Continue session with degraded mode flag.
3. Display warnings at session start.
4. Prioritize fixing failures in next available session.
