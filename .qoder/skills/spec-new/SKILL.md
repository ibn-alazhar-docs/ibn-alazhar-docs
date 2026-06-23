---
name: spec-new
description: Scaffold a new feature spec and manage the spec lifecycle. Use when starting a new feature, reviewing specs, or checking spec-implementation alignment. Triggers — "new spec", "create spec", "spec for", "scaffold spec", "start feature spec", "write a spec for", "spec status", "spec review".
---

Scaffold a new feature spec at `specs/NNN-feature-name/spec.md` and manage the spec lifecycle.

## Creating a new spec

1. **Determine the next spec number**: List `specs/` directory, find the highest existing `NNN` prefix, and increment by 1 (zero-padded to 3 digits: `001`, `002`, etc.).

2. **Ask for inputs** (if not provided):
   - Feature name (kebab-case, e.g., `document-sharing`)
   - Problem statement (1-2 sentences: what problem does this solve for Azhar students?)

3. **Create the spec file** at `specs/NNN-feature-name/spec.md`:

```markdown
# Spec: Feature Name

## Problem

[1-2 sentences describing the problem this feature solves]

## Goals

- [ ] Goal 1
- [ ] Goal 2

## Non-goals

- [ ] Explicitly excluded scope

## User stories

- As a [role], I want [action] so that [benefit]

## Technical approach

[High-level implementation plan — components, data flow, API changes]

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Dependencies

- [Prerequisite features, services, or infrastructure]

## Open questions

- [Unresolved decisions or unknowns]
```

4. **Verify phase scope**: Check `.opencode/context/active-phase.md` — the feature must be within the current phase scope. If blocked, inform the user and suggest which phase it belongs to.

## Lifecycle rules

- **No implementation without an approved spec** — specs come first
- **No scope creep** — implementation must match spec acceptance criteria
- **Spec changes require re-review** — update the spec before changing code
- **Implementation changes need spec update first** — spec is the source of truth
- **Phase terminology**: Use "Phase" not "Sprint"

## Spec status tracking

Each spec progresses through: `draft` -> `review` -> `approved` -> `implementing` -> `complete`

When asked about spec status, report each active spec and its current status.
