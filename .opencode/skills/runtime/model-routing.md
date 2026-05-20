# Skill: Model Routing

> **Category:** Runtime
> **File:** `skills/runtime/model-routing.md`
> **Status:** Active

---

## Purpose

Route tasks to the appropriate model based on task type, capability requirements, and availability.

## Activation Conditions

- Session starts (model selection).
- Task type changes mid-session.
- Primary model becomes unavailable.
- User requests model change.

## Expected Inputs

- `MODEL_ROUTING.md` — Model routing table.
- `runtime/model-selection.md` — Current model availability.
- Task type classification (coding, reasoning, review, utility).
- Model availability status.

## Workflow Integration

This skill operates during session initialization and task routing:

```
Task Intake → Model Routing → Model Selected → Task Execution
```

## Outputs

- Selected model for current task.
- Fallback model (if primary unavailable).
- Model selection rationale.
- Flag if no model is available.

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| Primary model unavailable | Apply fallback routing |
| All models unavailable | Flag to human, pause non-urgent work |
| Model produces incorrect output | Retry with different model |
| Security-sensitive task | Prefer reasoning model, human review mandatory |

## Review Requirements

- Model selection should follow `MODEL_ROUTING.md`.
- Fallback usage should be logged.
- Model performance should be tracked per task type.
