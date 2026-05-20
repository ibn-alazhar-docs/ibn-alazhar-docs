# SESSION_RULES.md — Session Lifecycle and Behavior

> **Purpose:** Define how sessions start, operate, and end.
> **Scope:** All AI sessions in this runtime.

---

## Session Lifecycle

```
Start → Boot → Task Intake → Execution → Verification → Wrap → End
```

---

## Session Start

### Trigger
- User opens a new session.
- User requests work on the project.

### Boot Sequence
Follow `BOOT_SEQUENCE.md`:
1. Load runtime manifest (`SYSTEM.md`).
2. Hydrate memory (`memory/`).
3. Detect active phase (`runtime/runtime-status.md`).
4. Load project context (`PROJECT_RUNTIME.md`).
5. Initialize model (`MODEL_ROUTING.md`).
6. Load agent roster (`agents/core/`).
7. Run health checks (`runtime/runtime-health.md`).

### Session Record
Create a session record in `sessions/`:
```markdown
# Session: YYYY-MM-DD-HHMM

- Start: YYYY-MM-DD HH:MM:SS
- Model: [selected model]
- Phase: [active phase]
- Task: [task description]
- Status: In Progress
```

---

## Task Intake

### Task Classification
Classify the incoming task:
- **Coding:** Implementation, refactoring, bug fix.
- **Reasoning:** Architecture, planning, analysis.
- **Review:** Code review, spec review, audit.
- **Utility:** Summarization, formatting, organization.

### Model Selection
Route to appropriate model per `MODEL_ROUTING.md`.

### Agent Selection
Activate relevant agents per task type:
- Coding → architect (if architecture involved)
- Review → security-reviewer, rtl-auditor, frontend-polish
- Planning → architect
- Docs → docs-sync

---

## Execution

### Execution Rules
1. **Read specs first.** Never implement without reading the spec.
2. **Follow phase scope.** Do not work outside current phase scope.
3. **Respect brand rules.** Use correct colors, fonts, RTL.
4. **No secrets.** Never write secrets to files.
5. **Small changes.** Prefer focused, minimal changes.
6. **Verify as you go.** Check each step before proceeding.

### Execution Boundaries
| Boundary | Rule |
|----------|------|
| Phase scope | Do not implement features outside current phase |
| File scope | Do not modify unrelated files |
| Spec scope | Do not deviate from spec without updating spec |
| Brand scope | Do not use non-brand colors or fonts |
| Security scope | Do not bypass security checks |

---

## Verification

### Self-Verification
Before claiming task completion:
1. Check that all requirements are met.
2. Check that no rules were violated.
3. Check that no unrelated files were modified.
4. Check that brand rules are followed (for UI).
5. Check that RTL is correct (for UI).

### External Verification
- Run relevant tests.
- Run lint and typecheck.
- Run Docker health check (if applicable).
- Request agent review (security, RTL, brand).

---

## Session Wrap

### Actions
1. Update session record with final status.
2. Record changes made (files, lines).
3. Record decisions made.
4. Update memory if project state changed.
5. Update docs if implementation changed documented behavior.
6. Note any follow-up tasks.

### Session Record Update
```markdown
# Session: YYYY-MM-DD-HHMM

- Start: YYYY-MM-DD HH:MM:SS
- End: YYYY-MM-DD HH:MM:SS
- Model: [selected model]
- Phase: [active phase]
- Task: [task description]
- Status: Complete | Partial | Failed
- Changes: [list of changed files]
- Decisions: [list of decisions made]
- Follow-ups: [list of follow-up tasks]
- Notes: [any additional notes]
```

---

## Session End

### Clean Session End
- All tasks complete.
- Session record updated.
- Memory and docs updated.
- No unresolved issues.

### Partial Session End
- Some tasks complete, others blocked.
- Blocking issues documented.
- Follow-up tasks identified.
- Session record updated with status.

### Failed Session End
- Tasks could not be completed.
- Failure reasons documented.
- Recovery path identified.
- Session record updated with status.

---

## Session Constraints

| Constraint | Rule |
|------------|------|
| Time | Sessions should be focused and time-bounded |
| Scope | Sessions should not exceed current phase scope |
| Model | Sessions should use appropriate model |
| Agents | Sessions should activate only relevant agents |
| Files | Sessions should not modify unrelated files |
| Secrets | Sessions must never expose or store secrets |

---

## Session Continuation

If a session ends with incomplete work:
1. Follow-up tasks are clearly documented.
2. Next session picks up from session record.
3. Memory is current.
4. Boot sequence re-runs for next session.

---

## Session Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Jumping to code without reading specs | Wrong implementation | Always read specs first |
| Expanding scope mid-session | Scope creep | Flag scope change, get approval |
| Modifying many unrelated files | Review difficulty | Focus changes on relevant files |
| Claiming completion without verification | False status | Verify before claiming complete |
| Not updating memory/docs | Lost context | Update memory and docs on every change |
| Using wrong model | Poor output quality | Route task to correct model |
