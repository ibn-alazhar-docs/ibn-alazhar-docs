# Phase Lock Policy

## Rules

1. Work must stay within the active phase scope (see `.opencode/context/active-phase.md`)
2. No implementation from a future phase without explicit phase gate approval
3. Phase transitions require:
   - All phase items marked complete
   - Phase gate review passed
   - active-phase.md updated

## Enforcement

- `.opencode/skills/phase-lock.md` checks active phase before implementation
- Spec review validates phase alignment
- PRs must reference the approved phase
- Violations trigger re-review and possible rollback

## Current Phase

See `.opencode/context/active-phase.md` for the current active phase and allowed work items.
