# Skill: Session Management

> **Category:** Runtime
> **File:** `skills/runtime/session-management.md`
> **Status:** Active

---

## Purpose

Manage session lifecycle from start to end, including context loading, task tracking, and session wrap.

## Activation Conditions

- Session starts.
- Session context needs refresh.
- Session is wrapping up.
- Session continuation is needed.

## Expected Inputs

- `BOOT_SEQUENCE.md` — Boot sequence definition.
- `SESSION_RULES.md` — Session rules.
- `memory/` — Project memory.
- `runtime/runtime-status.md` — Active phase status.
- `sessions/` — Previous session records.

## Workflow Integration

This skill manages the session lifecycle:

```
Session Start → Boot → Task Intake → Execution → Verification → Wrap → Session End
```

## Outputs

- Session record in `sessions/`.
- Session status (In Progress, Complete, Partial, Failed).
- Task completion status.
- Follow-up tasks (if any).
- Memory updates (if project state changed).

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| Session blocked | Document blocking issue, identify recovery path |
| Session scope exceeds phase | Flag scope creep, pause |
| Session model fails | Apply fallback routing |
| Session cannot complete | Mark as Partial, document follow-ups |

## Review Requirements

- Session records should be complete and accurate.
- Follow-up tasks should be clearly documented.
- Memory updates should be verified against project state.
