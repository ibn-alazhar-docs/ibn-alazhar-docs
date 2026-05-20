# Skill: Project Awareness

> **Category:** Core
> **File:** `skills/core/project-awareness.md`
> **Status:** Active

---

## Purpose

Ensure every AI agent has current, accurate knowledge of the project's identity, goals, constraints, and state before acting.

## Activation Conditions

- Session starts (part of boot sequence).
- Agent is activated.
- Project context is requested.
- Memory files are updated.
- Phase status changes.

## Expected Inputs

- `memory/project/project-overview.md`
- `memory/project/phase-1-focus.md`
- `memory/project/current-status.md`
- `memory/decisions/architecture-decisions.md`
- `memory/brand/brand-rules.md`
- `PROJECT_RUNTIME.md`
- `docs/00_PROJECT_BRIEF.md`
- `docs/27_MVP_SCOPE_LOCK.md`

## Workflow Integration

This skill is the **first** skill activated in the boot sequence. All other skills depend on project awareness being current.

```
Boot → Project Awareness → [Other Skills] → Task Execution
```

## Outputs

- Loaded project context in session memory.
- Awareness of current phase and scope.
- Awareness of brand rules and constraints.
- Awareness of active decisions and risks.
- Flag if any memory file is outdated or missing.

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| Memory file missing | Flag for population, continue with available context |
| Memory inconsistent with docs | Flag for reconciliation |
| Phase status unclear | Check `runtime/runtime-status.md`, flag if still unclear |
| Brand rules missing | Load from `docs/29_BRAND_IMPLEMENTATION_GUIDE.md` |

## Review Requirements

- No review needed for skill activation itself.
- Memory file updates should be reviewed by docs-sync agent.
