# Workflow: Spec Lifecycle

> **File:** `workflows/spec-kit/spec-lifecycle.md`
> **Purpose:** Define the complete spec lifecycle from idea to closure.

---

## Spec Lifecycle States

```
Draft → Review → Approved → Locked → In Progress → Implemented → Verified → Closed
```

## State Transitions

### Draft → Review

**Trigger:** Spec author marks spec as complete.
**Requirements:**

- All spec sections filled.
- Acceptance criteria defined (Given/When/Then).
- UI states defined (empty/loading/error/success).
- Test plan included.
- References relevant ADRs.

**Action:** Spec-guardian begins review.

### Review → Approved

**Trigger:** Spec passes spec-guardian review.
**Requirements:**

- All review checklist items pass.
- No blocking ambiguities.
- Within phase scope.

**Action:** Spec marked as Approved, ready for phase gate.

### Review → Draft (Revision)

**Trigger:** Spec fails spec-guardian review.
**Requirements:**

- Specific revision notes provided.
- Blocking issues identified.

**Action:** Spec returned to author for revision.

### Approved → Locked

**Trigger:** Phase gate passes.
**Requirements:**

- Phase gate review complete.
- Spec is part of approved phase scope.

**Action:** Spec locked. No changes without spec update process.

### Locked → In Progress

**Trigger:** Phase starts, implementation assigned.
**Requirements:**

- Phase gate passed.
- Implementation task assigned.

**Action:** Implementation begins.

### In Progress → Implemented

**Trigger:** Code is written, tests pass, PR opened.
**Requirements:**

- Implementation follows spec.
- Tests pass.
- CI passes.
- PR opened with spec reference.

**Action:** Code review begins.

### Implemented → Verified

**Trigger:** PR merged.
**Requirements:**

- All reviews passed.
- Code merged to main.
- Docs updated.

**Action:** Spec marked as Verified.

### Verified → Closed

**Trigger:** Post-merge verification complete.
**Requirements:**

- Feature works as expected.
- No follow-up issues.
- Memory updated.

**Action:** Spec archived.

---

## Spec Structure

```
specs/NNN-feature-name/
├── spec.md          ← Feature specification
├── design.md        ← Design decisions (if applicable)
├── tasks.md         ← Implementation tasks
└── review.md        ← Review notes
```

### spec.md Sections

1. Title and ID
2. Summary
3. Problem statement
4. Proposed solution
5. Acceptance criteria (Given/When/Then)
6. UI states (empty/loading/error/success)
7. Technical considerations
8. Security considerations
9. RTL/Arabic considerations
10. Test plan
11. References (ADRs, docs)

### tasks.md Sections

1. Task list with estimates
2. Dependencies
3. Ownership
4. Status tracking

### review.md Sections

1. Review history
2. Findings
3. Revision notes
4. Approval record

---

## Spec Update Process

Once a spec is Locked, changes require:

1. Open question in `docs/18_OPEN_QUESTIONS.md`.
2. Discuss impact with architect and spec-guardian.
3. Update spec with change log entry.
4. Re-review if change is significant.
5. Re-lock if approved.

---

## Reference

- `docs/31_SPEC_KIT_WORKFLOW.md` — Spec Kit workflow definition.
- `PHASE_GATES.md` — Phase gate enforcement.
- `REVIEW_PIPELINE.md` — Review lifecycle.
