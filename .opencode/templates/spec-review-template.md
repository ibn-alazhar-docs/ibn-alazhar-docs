# Spec Review Template

> **Template:** Spec review document.
> **Usage:** Copy and fill for each spec review.

---

# Spec Review: [Spec ID] — [Spec Title]

- **Date:** YYYY-MM-DD
- **Reviewer:** [name/agent]
- **Spec:** `specs/[NNN]-[name]/spec.md`
- **Status:** APPROVED | REVISION_REQUIRED

---

## Completeness Check

- [ ] Title and ID present
- [ ] Summary is clear and concise
- [ ] Problem statement defined
- [ ] Proposed solution described
- [ ] Acceptance criteria (Given/When/Then) present
- [ ] UI states defined (empty/loading/error/success)
- [ ] Technical considerations documented
- [ ] Security considerations identified
- [ ] RTL/Arabic considerations noted
- [ ] Test plan included
- [ ] References to ADRs present

## Quality Check

- [ ] Spec is unambiguous
- [ ] Spec is testable
- [ ] Spec is within phase scope
- [ ] Spec references correct ADRs
- [ ] Acceptance criteria are specific and measurable
- [ ] UI states are complete
- [ ] Test plan covers acceptance criteria

## Ambiguities

| # | Section | Ambiguity | Clarification Needed |
|---|---------|-----------|---------------------|
| 1 | [section] | [description] | [what needs clarification] |

## Scope Check

- [ ] Feature is in MVP scope (per `docs/27_MVP_SCOPE_LOCK.md`)
- [ ] Feature is in current phase scope
- [ ] No scope creep detected

## Security Check

- [ ] Security implications identified
- [ ] Auth requirements documented
- [ ] Input validation requirements noted
- [ ] Data sensitivity assessed

## RTL/Arabic Check

- [ ] RTL considerations documented
- [ ] Arabic text requirements noted
- [ ] UI direction specified

---

## Decision

**Status:** APPROVED | REVISION_REQUIRED

**Notes:**
[Review summary, required revisions if any]

**Revision Deadline:** YYYY-MM-DD (if applicable)

---

**Reviewed by:** [name/agent]
**Date:** YYYY-MM-DD
