# EXECUTION_ENGINE.md — How Work Gets Done

> **Purpose:** Define the execution lifecycle from idea to shipped code.
> **Scope:** End-to-end workflow for all work in this repository.

---

## Execution Model

The execution engine follows a **docs-first, spec-driven, phase-gated** model:

```
Idea → Spec → Review → Phase Gate → Implementation → Review → Merge
```

Each stage has defined inputs, outputs, and gates.

---

## Stage 1: Idea Capture

**Input:** Feature request, bug report, improvement suggestion.
**Output:** Open question or draft spec.
**Location:** `docs/_incoming/` or `docs/18_OPEN_QUESTIONS.md`.

### Rules
- Ideas are captured before they are discussed.
- No implementation starts from an idea without a spec.
- Ideas are triaged by the architect agent.

---

## Stage 2: Spec Creation

**Input:** Approved idea or identified need.
**Output:** Feature spec in `specs/<NNN>-<name>/`.
**Responsible:** Architect agent + human engineer.

### Spec Structure
```
specs/NNN-feature-name/
├── spec.md          ← Feature specification
├── design.md        ← Design decisions (if applicable)
├── tasks.md         ← Implementation tasks
└── review.md        ← Review notes
```

### Rules
- Spec follows the template in `templates/spec-review-template.md`.
- Spec references relevant ADRs from `docs/ADR/`.
- Spec defines empty/loading/error/success states for UI features.
- Spec includes test plan or test requirements.

---

## Stage 3: Spec Review

**Input:** Draft spec.
**Output:** Reviewed and approved spec, or returned for revision.
**Responsible:** Spec-guardian agent + relevant review agents.

### Review Checklist
- [ ] Spec is complete and unambiguous
- [ ] Spec references correct ADRs
- [ ] Spec defines all UI states (empty/loading/error/success)
- [ ] Spec includes test plan
- [ ] Spec is within current phase scope
- [ ] Spec respects brand rules (colors, fonts, RTL)
- [ ] Spec respects security baseline

### Rules
- Spec must pass review before phase gate consideration.
- Failed specs are returned with specific revision notes.
- Approved specs are marked with review date and reviewer.

---

## Stage 4: Phase Gate

**Input:** Approved spec(s).
**Output:** Phase gate approval or deferral.
**Responsible:** Architect agent + human approval.

### Gate Criteria
- [ ] All specs for this phase are reviewed and approved
- [ ] Phase scope is defined and locked
- [ ] Dependencies between specs are identified
- [ ] Phase success criteria are defined
- [ ] Risk assessment is complete

### Rules
- Phase gate uses template in `templates/phase-gate-template.md`.
- Gate approval is recorded in `docs/19_DECISION_LOG.md`.
- Locked phase scope is recorded in `docs/27_MVP_SCOPE_LOCK.md` (for MVP) or phase-specific lock file.

---

## Stage 5: Implementation

**Input:** Phase-gated specs.
**Output:** Code changes, tests, documentation updates.
**Responsible:** Human engineer + AI agents (as appropriate).

### Implementation Rules
- Code follows the spec. Deviations require spec update.
- TypeScript strict mode is enforced.
- ESLint + Prettier rules are followed.
- No secrets in code or config files.
- Docker Compose is the local development environment.
- Arabic-first and RTL-first are enforced for all UI.

### Agent Involvement
- **architect:** Architecture guidance, ADR updates.
- **spec-guardian:** Spec compliance monitoring.
- **security-reviewer:** Security review of changes.
- **rtl-auditor:** RTL and Arabic compliance review.
- **frontend-polish:** UI quality and brand consistency.
- **docker-auditor:** Docker and container compliance.
- **docs-sync:** Documentation synchronization.
- **qa-lead:** Test plan execution.

---

## Stage 6: Code Review

**Input:** Implementation (PR).
**Output:** Approved PR, or returned for revision.
**Responsible:** Human reviewer + CodeRabbit (automated) + AI agents.

### Review Layers
1. **Automated:** CI (lint, typecheck, test, build).
2. **CodeRabbit:** Automated PR review (security, style, scope).
3. **AI Agents:** Security review, RTL audit, brand audit.
4. **Human:** Final approval.

### Rules
- CI must pass before human review.
- CodeRabbit required findings must be addressed.
- Security review findings are required to address.
- RTL audit findings are required to address for UI changes.
- Brand audit findings are required to address for UI changes.

---

## Stage 7: Merge

**Input:** Approved PR.
**Output:** Merged code on main branch.
**Responsible:** Human engineer with merge rights.

### Rules
- Merge via PR only. No direct push to main.
- Main branch is protected.
- Merge commit message references the spec and phase.
- Post-merge: update relevant docs and memory.

---

## Stage 8: Post-Merge

**Input:** Merged code.
**Output:** Updated docs, memory, and status.
**Responsible:** Docs-sync agent + human engineer.

### Actions
- Update `memory/project/current-status.md` if phase status changed.
- Update `memory/decisions/architecture-decisions.md` if new decisions made.
- Update relevant docs if implementation changed documented behavior.
- Close or update spec review notes.

---

## Execution Boundaries

| Boundary | Rule |
|----------|------|
| Phase 1 → Phase 2 | Phase 1 gate must pass. All Phase 1 deliverables verified. |
| Spec → Implementation | Spec must be reviewed and approved. |
| Implementation → Review | CI must pass. Code must follow spec. |
| Review → Merge | All required reviews must pass. |
| Merge → Post-Merge | Docs and memory must be updated. |

---

## Escalation

When execution is blocked:

1. **Spec ambiguity** → Architect resolves.
2. **Security concern** → Security-reviewer escalates to human.
3. **Scope creep** → Spec-guardian flags, human decides.
4. **Brand violation** → Frontend-polish flags, human decides.
5. **RTL failure** → RTL-auditor flags, human fixes.
6. **Docker failure** → Docker-auditor investigates, human resolves.

See `runtime/escalation-rules.md` for full escalation logic.
