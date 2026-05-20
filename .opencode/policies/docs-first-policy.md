# Policy: Docs-First

> **File:** `policies/docs-first-policy.md`
> **Status:** Active
> **Enforced by:** Spec-guardian agent, docs-sync agent

---

## Purpose

Ensure documentation drives implementation, not the reverse.

## Rules

1. **Spec before code.** No implementation file is created before its spec exists and passes review.
2. **ADR before architecture change.** No architecture change is made without an ADR.
3. **API spec before API change.** No API endpoint is added or changed without updating the API spec.
4. **DB schema before DB change.** No database change is made without updating the Prisma schema.
5. **Docs update after merge.** When code changes impact documented behavior, docs must be updated.

## Enforcement

- Spec-guardian blocks implementation without spec.
- Architect blocks architecture changes without ADR.
- Docs-sync detects doc impact and flags missing updates.
- CI can include doc consistency checks.

## Exceptions

- Emergency bug fixes may precede docs, but docs must be updated in the same PR.
- Experimental spikes may proceed without full spec, but must be documented as spikes.

## Reference

- `docs/31_SPEC_KIT_WORKFLOW.md`
- `AI_OPERATING_RULES.md` (Rule 1)
- `EXECUTION_ENGINE.md`
