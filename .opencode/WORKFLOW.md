# WORKFLOW.md — Workflow Definitions

> **Purpose:** Define all workflows operating in this runtime.
> **Scope:** Spec lifecycle, review lifecycle, release lifecycle, ADR lifecycle, phase gate enforcement, docs sync, runtime bootstrap.

---

## 1. Spec Lifecycle

```
Draft → Review → Approved → Locked → In Progress → Implemented → Verified → Closed
```

| State       | Description                           | Transition                       |
| ----------- | ------------------------------------- | -------------------------------- |
| Draft       | Spec is being written                 | → Review when complete           |
| Review      | Spec is under review by spec-guardian | → Approved or → Draft (revision) |
| Approved    | Spec passes review                    | → Locked at phase gate           |
| Locked      | Spec is part of a locked phase        | → In Progress when phase starts  |
| In Progress | Implementation is underway            | → Implemented when code is ready |
| Implemented | Code is written and in PR             | → Verified when merged           |
| Verified    | Code is merged and docs updated       | → Closed                         |
| Closed      | Spec is complete                      | —                                |

**Rules:**

- Spec cannot move to In Progress without being Locked.
- Spec cannot move to Implemented without passing all reviews.
- Closed specs are archived but remain readable.

**Location:** `specs/<NNN>-<name>/spec.md` with status in frontmatter.

---

## 2. Review Lifecycle

```
Trigger → Automated Checks → Agent Reviews → Human Review → Decision
```

| Stage            | Trigger                       | Responsible                                     | Output                    |
| ---------------- | ----------------------------- | ----------------------------------------------- | ------------------------- |
| Trigger          | PR opened or review requested | System                                          | Review initiated          |
| Automated Checks | PR opened                     | GitHub Actions                                  | Pass/fail report          |
| Agent Reviews    | Automated checks pass         | Security-reviewer, RTL-auditor, Frontend-polish | Review findings           |
| Human Review     | Agent reviews pass            | Human engineer                                  | Approve / Request changes |
| Decision         | Human review complete         | System                                          | PR merged or returned     |

**Parallel execution:** Automated checks and agent reviews run in parallel when possible.

**Sequential execution:** Human review waits for all automated and agent reviews.

---

## 3. Release Lifecycle

```
Phase Complete → Gate Review → Release Candidate → Validation → Release → Post-Release
```

| Stage             | Description                                    |
| ----------------- | ---------------------------------------------- |
| Phase Complete    | All tasks in phase are implemented and merged  |
| Gate Review       | Phase gate review confirms all deliverables    |
| Release Candidate | Version tagged, release notes drafted          |
| Validation        | Smoke tests, manual verification               |
| Release           | Version published, notes published             |
| Post-Release      | Monitor metrics, collect feedback, update docs |

**Release naming:** `v<major>.<minor>.<patch>` — e.g., `v1.0.0`.

**Release notes template:** `docs/20_RELEASE_NOTES_TEMPLATE.md`.

---

## 4. ADR Lifecycle

```
Identify → Draft → Review → Accept → Implement → Obsolete (optional)
```

| Stage     | Description                                     |
| --------- | ----------------------------------------------- |
| Identify  | Architecture decision is needed                 |
| Draft     | ADR is written in `docs/ADR/ADR-NNN-<title>.md` |
| Review    | ADR is reviewed by architect + human            |
| Accept    | ADR is accepted and recorded                    |
| Implement | Code changes follow the ADR                     |
| Obsolete  | ADR is superseded (status changed, not deleted) |

**ADR format:**

```markdown
# ADR-NNN: Title

- Status: Proposed | Accepted | Deprecated | Superseded
- Date: YYYY-MM-DD
- Context: ...
- Decision: ...
- Consequences: ...
```

**Rule:** Before changing architecture, create or update an ADR.

---

## 5. Phase Gate Enforcement

```
Phase N Complete → Gate Review → Pass → Phase N+1 Starts
                                → Fail → Phase N Remediation
```

### Gate Review Process

1. Verify all Phase N deliverables are complete.
2. Verify all Phase N specs are implemented and merged.
3. Verify CI passes on main branch.
4. Verify docs are updated.
5. Verify memory is updated.
6. Verify no blocking issues.
7. Record gate decision in `docs/19_DECISION_LOG.md`.

### Gate Pass Criteria

- [ ] All deliverables verified
- [ ] CI green on main
- [ ] Docs updated
- [ ] Memory updated
- [ ] No blocking issues
- [ ] Human approval recorded

### Gate Fail Actions

- Identify blocking issues.
- Create remediation tasks.
- Schedule re-review.
- Do not start Phase N+1.

---

## 6. Docs Synchronization Workflow

```
Code Change → Detect Doc Impact → Update Docs → Verify Consistency → Record
```

### When Docs Must Be Updated

| Change Type         | Docs to Update                                     |
| ------------------- | -------------------------------------------------- |
| New API endpoint    | `docs/06_API_SPEC.md`                              |
| DB schema change    | `docs/07_DATABASE_SCHEMA.md`, Prisma schema        |
| Architecture change | Relevant ADR in `docs/ADR/`                        |
| UI change           | `docs/04_UI_DESIGN_SYSTEM.md`                      |
| Security change     | `docs/08_SECURITY_PRIVACY.md`                      |
| Phase change        | `docs/13_PHASE_1_PLAN.md` (or relevant phase plan) |
| Scope change        | `docs/27_MVP_SCOPE_LOCK.md`                        |
| Decision made       | `docs/19_DECISION_LOG.md`                          |

### Docs-Sync Agent Role

- Detect when code changes impact docs.
- Flag missing doc updates.
- Verify doc consistency across files.
- Update `memory/` when project state changes.

---

## 7. Runtime Bootstrap Workflow

```
Session Start → Boot Sequence → Context Loaded → Task Intake
```

See `BOOT_SEQUENCE.md` for the detailed boot sequence.

### Bootstrap Triggers

- New session starts.
- Runtime files are updated.
- Phase status changes.
- Memory is updated.

### Bootstrap Outputs

- Session context loaded.
- Model selected.
- Agents available.
- Policies enforced.
- Health check passed.

---

## 8. Implementation Approval Workflow

```
Code Ready → CI Pass → Agent Reviews → Human Review → Approve/Merge → Post-Merge
```

### Approval Gates (All Must Pass)

1. **CI:** Lint, typecheck, test, build.
2. **CodeRabbit:** No required findings.
3. **Security:** Security-reviewer passes.
4. **RTL:** RTL-auditor passes (for UI changes).
5. **Brand:** Frontend-polish passes (for UI changes).
6. **Spec:** Spec-guardian confirms spec compliance.
7. **Human:** Final approval.

### Post-Merge Actions

- Update spec status to Verified.
- Update memory if project state changed.
- Update docs if implementation changed documented behavior.
- Close related issues.
