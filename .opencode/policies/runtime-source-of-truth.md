# Policy: Runtime Source of Truth

> **File:** `policies/runtime-source-of-truth.md`
> **Status:** Active
> **Enforced by:** All agents

---

## Purpose

Define the runtime layer as the source of truth for AI agent behavior, while respecting product docs as the source of truth for product decisions.

## Hierarchy

1. **Product docs (`docs/`)** — Source of truth for product decisions, requirements, and architecture.
2. **Specs (`specs/`)** — Source of truth for feature specifications.
3. **Runtime (`.opencode/`)** — Source of truth for AI agent behavior, workflows, and execution rules.
4. **Code** — Source of truth for implementation.

## Rules

1. **Runtime does not override product docs.** If runtime conflicts with product docs, product docs win.
2. **Runtime operationalizes product docs.** Runtime translates product decisions into agent behavior.
3. **Runtime is updated when product docs change.** When product docs change, runtime must be reviewed for impact.
4. **Runtime is the agent's guide.** Agents follow runtime rules for how to work, not what to build.

## Enforcement

- All agents read runtime files for behavior guidance.
- Agents read product docs for product context.
- Conflicts are flagged to architect.
- Runtime updates are reviewed when product docs change.

## Reference

- `SYSTEM.md` — Source of truth hierarchy.
- `PROJECT_RUNTIME.md` — Project context.
- `docs/` — Product documentation.
