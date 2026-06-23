---
name: phase-check
description: Check the current project phase and what's allowed or blocked. Use before implementing features to ensure you're working within the active phase scope. Trigger with "phase", "what can I work on", "is this in scope", "phase gate", or when checking phase gates.
---

Check the current active phase and report what's allowed and blocked.

## Steps

1. Read `.opencode/context/active-phase.md` to get the current phase status.
2. Report:
   - **Current phase** name and status
   - **Allowed** work items (what you can implement now)
   - **Blocked** work items (what you must wait on)
   - **Next phase** and what it will unlock

3. If the user asks about a specific feature, cross-reference it against the allowed/blocked lists and give a clear YES/NO on whether it's in scope.

## Enforcement rules

1. Work **must** stay within current phase scope — tasks outside scope are **rejected**, not deferred
2. Phase N+1 does **not** start until Phase N passes gate review
3. Phase scope changes require documented approval
4. If a feature request is blocked, explain which phase it belongs to and what needs to happen first

## Gate review

When asked to run a phase gate review:

1. Read `.opencode/PHASE_GATES.md` for full gate criteria
2. Check all deliverables for the current phase
3. Verify CI passes (`pnpm ci:all`)
4. Produce a gate decision: **Pass** / **Fail** / **Conditional** (with specific conditions and deadline)
5. If **Fail**, list blocking issues and remediation steps

## Context

This project uses phase-locked development. All phases 1A-2D are complete. The active phase file at `.opencode/context/active-phase.md` is the source of truth for what's currently in scope.
