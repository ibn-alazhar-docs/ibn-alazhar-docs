# Runtime: Failure Recovery

> **File:** `runtime/failure-recovery.md`
> **Purpose:** Define recovery procedures for runtime failures across all operational layers.
> **Scope:** Boot failures, execution failures, review failures, agent failures, model failures, degraded mode recovery.

---

## Failure Classification

| Class | Description | Example | Recovery Time |
|-------|-------------|---------|---------------|
| **Boot Failure** | Session cannot start | Missing memory file, corrupted runtime | < 10 min |
| **Execution Failure** | Implementation cannot proceed | Spec ambiguity, build failure, test failure | 10 min - 2 hrs |
| **Review Failure** | Review cannot pass | Security finding, RTL failure, brand violation | 10 min - 2 hrs |
| **Agent Failure** | Agent cannot operate | Missing definition, conflict, timeout | 5-30 min |
| **Model Failure** | Model is unavailable or produces bad output | API down, context limit, hallucination | 5-30 min |
| **Runtime Degradation** | Runtime is partially functional | Missing files, stale memory, inconsistent state | 10-60 min |

---

## Boot Failure Recovery

### B-01: Missing Memory File

**Symptom:** Boot sequence fails at Step 2 (Hydrate Memory).
**Detection:** Health check reports missing memory file.

**Recovery:**
1. Identify which memory file is missing.
2. Rebuild from source doc:
   - `memory/project/project-overview.md` ← `docs/00_PROJECT_BRIEF.md` + `PROJECT_RUNTIME.md`
   - `memory/project/phase-1-focus.md` ← `docs/13_PHASE_1_PLAN.md`
   - `memory/project/current-status.md` ← `runtime/runtime-status.md` + git history
   - `memory/decisions/architecture-decisions.md` ← `docs/ADR/`
   - `memory/brand/brand-rules.md` ← `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`
3. Verify the rebuilt file matches the source.
4. Continue boot sequence.
5. Log the recovery in session record.

### B-02: Corrupted Runtime File

**Symptom:** Boot sequence fails at Step 1 (Load Runtime Manifest) or Step 4 (Load Project Context).
**Detection:** File cannot be parsed, content is garbled, or critical fields are missing.

**Recovery:**
1. Identify the corrupted file.
2. Restore from git: `git checkout HEAD -- <file>`.
3. If git restore fails: rebuild from template or source.
4. Verify the restored file is valid.
5. Continue boot sequence.
6. Log the recovery.

### B-03: Phase Mismatch

**Symptom:** Boot sequence detects phase mismatch between `runtime/runtime-status.md` and `docs/`.
**Detection:** Phase in runtime status does not match phase in project docs.

**Recovery:**
1. Identify the correct phase from `docs/13_PHASE_1_PLAN.md` (or relevant phase plan).
2. Update `runtime/runtime-status.md` to match.
3. Update `memory/project/current-status.md` to match.
4. Continue boot sequence.
5. Log the reconciliation.

### B-04: All Models Unavailable

**Symptom:** Boot sequence fails at Step 5 (Initialize Model) — no models respond.
**Detection:** All 3 preferred models + fallbacks fail availability check.

**Recovery:**
1. Flag to human: "All models unavailable. Non-urgent work paused."
2. Check if this is a temporary outage (network, API rate limit).
3. If temporary: wait and retry.
4. If persistent: switch to offline mode — work with available context, defer model-dependent tasks.
5. Log the degradation.

---

## Execution Failure Recovery

### E-01: Spec Ambiguity Blocks Implementation

**Symptom:** Implementation cannot proceed because spec is unclear or contradictory.
**Detection:** Agent flags spec ambiguity during implementation.

**Recovery:**
1. Agent flags ambiguity to architect (escalation: Medium).
2. Architect reviews the spec and clarifies.
3. If architect cannot resolve: escalate to human engineer.
4. Update spec with clarification.
5. Re-run spec review if clarification changes requirements.
6. Resume implementation.

### E-02: Build Failure

**Symptom:** Code changes break the build (TypeScript errors, lint errors, build failure).
**Detection:** CI fails or local build fails.

**Recovery:**
1. Read the build error output.
2. Identify the failing file(s) and line(s).
3. Fix the error(s).
4. Re-run the build locally.
5. If fix is non-trivial: consider Level 1 rollback (revert the change).
6. Re-submit for review.

### E-03: Test Failure

**Symptom:** Code changes break existing tests.
**Detection:** Vitest reports failing tests.

**Recovery:**
1. Read the test failure output.
2. Determine if the failure is:
   - **Regression:** Code broke existing functionality → fix the code.
   - **Expected behavior change:** Requirements changed → update the test.
   - **Flaky test:** Intermittent failure → investigate and fix the test.
3. Apply the appropriate fix.
4. Re-run tests locally.
5. Re-submit for review.

### E-04: Scope Creep Detected

**Symptom:** Implementation exceeds current phase scope.
**Detection:** Spec-guardian flags out-of-scope work.

**Recovery:**
1. Spec-guardian flags the scope violation.
2. Agent stops work on out-of-scope items.
3. Human decides:
   - **Remove:** Revert out-of-scope changes.
   - **Approve:** Document scope expansion, update phase scope lock.
4. Resume or rollback based on decision.

---

## Review Failure Recovery

### R-01: Security Finding Blocks Merge

**Symptom:** Security review finds a required finding that must be addressed.
**Detection:** Security-reviewer reports High or Critical finding.

**Recovery:**
1. Read the security finding in detail.
2. Determine the fix:
   - **Secret in code:** Remove secret, rotate if exposed, use environment variable.
   - **Missing input validation:** Add Zod schema.
   - **Missing auth check:** Add authentication middleware.
   - **SQL injection risk:** Verify Prisma parameterized queries.
   - **XSS risk:** Add output encoding, verify CSP.
3. Apply the fix.
4. Re-run security review.
5. If finding cannot be fixed: escalate to human engineer with risk acceptance decision.

### R-02: RTL Audit Failure

**Symptom:** RTL audit finds direction, alignment, or layout issues.
**Detection:** RTL-auditor reports failing checks.

**Recovery:**
1. Read the RTL finding in detail.
2. Fix the specific issue:
   - **Direction:** Add `dir="rtl"` or use `dir="auto"`.
   - **Alignment:** Use logical properties (`text-start` not `text-left`).
   - **Layout:** Use `flex-row-reverse` or logical margin/padding.
   - **Icons:** Use `rtl:rotate-180` or flip icons.
   - **Font:** Verify Cairo font is loaded for Arabic text.
3. Re-run RTL audit.
4. If issue persists: escalate to human engineer.

### R-03: Brand Audit Failure

**Symptom:** Brand audit finds color, font, or tone violations.
**Detection:** Frontend-polish reports brand violations.

**Recovery:**
1. Read the brand finding in detail.
2. Fix the violation:
   - **Wrong color:** Replace with design token (`--color-primary-600`).
   - **Wrong font:** Use Cairo font for Arabic text.
   - **Hardcoded values:** Replace with CSS custom properties.
   - **Wrong tone:** Adjust copy to calm academic tone.
3. Re-run brand audit.
4. If issue persists: escalate to human engineer.

### R-04: Review Deadlock

**Symptom:** Two or more reviews conflict — one passes, another fails on the same change.
**Detection:** Human reviewer notices conflicting review findings.

**Recovery:**
1. Identify the conflicting reviews.
2. Architect reviews both findings.
3. Determine which finding takes priority:
   - **Security always wins** over brand or RTL.
   - **RTL always wins** over brand styling.
   - **Brand wins** over aesthetic preferences.
4. Apply the priority fix.
5. Re-run all affected reviews.
6. If architect cannot resolve: escalate to human engineer.

---

## Agent Failure Recovery

### A-01: Agent Definition Missing

**Symptom:** Agent cannot be loaded because definition file is missing or empty.
**Detection:** Boot sequence reports incomplete agent definition.

**Recovery:**
1. Identify the missing agent.
2. Check if a template exists for the agent.
3. If template exists: populate from template.
4. If no template: create minimal agent definition with required fields.
5. Verify the agent definition is complete.
6. Continue boot sequence.
7. Log the recovery.

### A-02: Agent Conflict

**Symptom:** Two agents produce conflicting findings on the same change.
**Detection:** Review outputs contradict each other.

**Recovery:**
1. Architect reviews both findings.
2. Apply conflict resolution rules (see `AGENT_RULES.md`):
   - Security > RTL > Brand > Style.
3. Document the resolution.
4. If architect cannot resolve: escalate to human.

### A-03: Agent Timeout

**Symptom:** Agent does not respond within expected time.
**Detection:** Session detects no agent output after timeout period.

**Recovery:**
1. Retry the agent request.
2. If retry fails: try a different model.
3. If all models fail: flag to human, continue without the agent.
4. Log the timeout.

---

## Model Failure Recovery

### M-01: Primary Model Unavailable

**Symptom:** Primary model does not respond or returns errors.
**Detection:** Model availability check fails.

**Recovery:**
1. Apply fallback chain per `MODEL_ROUTING.md`.
2. Verify fallback model is responsive.
3. Log the model switch.
4. Continue session with fallback model.

### M-02: Model Produces Incorrect Output

**Symptom:** Model output is clearly wrong (hallucination, incorrect code, wrong analysis).
**Detection:** Human or agent identifies incorrect output.

**Recovery:**
1. Flag the incorrect output.
2. Retry with a different model.
3. If retry produces correct output: use it, log the failure.
4. If retry also fails: escalate to human.
5. Do not use known-incorrect output.

### M-03: Model Context Limit Exceeded

**Symptom:** Model cannot process the full context.
**Detection:** Model returns error or truncated output.

**Recovery:**
1. Split the task into smaller sub-tasks.
2. Process each sub-task separately.
3. Combine results.
4. If splitting is not possible: use a model with larger context window.

---

## Runtime Degradation Modes

### Degraded Mode: WARN

**Trigger:** Health check returns WARN (minor issues).
**Behavior:**
- Session continues with warnings displayed.
- All operations proceed normally.
- Warnings are logged in session record.
- Issues are prioritized for next session.

**Examples:**
- Stale memory file (minor drift).
- Empty auxiliary files.
- Missing optional runtime file.

### Degraded Mode: FAIL (Partial)

**Trigger:** Health check returns FAIL on non-critical category.
**Behavior:**
- Session continues with degraded mode flag.
- Affected operations may be limited.
- Human is notified of the failure.
- Recovery is attempted before proceeding.

**Examples:**
- Missing agent definition.
- Model routing misconfigured.
- Policy file missing.

### Degraded Mode: FAIL (Critical)

**Trigger:** Health check returns FAIL on critical category.
**Behavior:**
- Session is blocked until recovery.
- Human must intervene.
- No operations proceed until critical issue is resolved.

**Examples:**
- Corrupted runtime manifest.
- All memory files missing.
- No models available.

---

## Recovery Record Format

All recoveries are recorded in the session record:

```markdown
## Recovery: [description]

- Date: YYYY-MM-DD
- Class: [Boot/Execution/Review/Agent/Model/Degradation]
- Trigger: [what caused the failure]
- Recovery: [what was done to recover]
- Time: [how long recovery took]
- Outcome: Success | Partial | Failed
- Follow-up: [what needs to be done next]
```

---

## Recovery Testing

Recovery procedures should be tested periodically:
- **Boot failures:** Simulate missing memory file, verify recovery.
- **Execution failures:** Introduce a known build error, verify recovery.
- **Review failures:** Introduce a known security finding, verify recovery.
- **Agent failures:** Temporarily remove an agent definition, verify recovery.
- **Model failures:** Simulate model unavailability, verify fallback.
- **Degradation:** Introduce a WARN condition, verify degraded mode behavior.

---

**Last Updated:** 2026-05-20
**Next Review:** After first failure recovery event or Phase 1 gate review
