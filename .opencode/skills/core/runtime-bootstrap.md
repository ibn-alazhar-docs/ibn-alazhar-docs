# Skill: Runtime Bootstrap

> **Category:** Core
> **File:** `skills/core/runtime-bootstrap.md`
> **Status:** Active

---

## Purpose

Execute the session boot sequence to initialize the runtime with correct context, model, agents, and policies.

## Activation Conditions

- New session starts.
- Runtime files are updated.
- User requests a fresh boot.
- Phase status changes.

## Expected Inputs

- `SYSTEM.md` — Runtime manifest.
- `BOOT_SEQUENCE.md` — Boot sequence definition.
- `memory/` — All memory files.
- `PROJECT_RUNTIME.md` — Project context.
- `MODEL_ROUTING.md` — Model routing table.
- `runtime/runtime-status.md` — Active phase status.
- `agents/core/` — All agent definitions.

## Workflow Integration

This skill runs **once per session** at startup. It is the foundation for all subsequent work.

```
Session Start → Runtime Bootstrap → Session Ready → Task Intake
```

## Outputs

- Session initialized with correct context.
- Model selected and verified.
- Agents loaded and available.
- Policies loaded and enforced.
- Health check report.
- Session record created in `sessions/`.

## Escalation Behavior

| Condition                     | Action                                        |
| ----------------------------- | --------------------------------------------- |
| Critical runtime file missing | Flag as degraded mode, continue with warnings |
| Model unavailable             | Apply fallback routing                        |
| Memory corrupted              | Flag for repair, use docs as fallback         |
| Health check fails            | Report failures, continue in degraded mode    |

## Review Requirements

- No review needed for bootstrap execution.
- Bootstrap failures should be logged and reviewed by human.
