# Workflow: Review Pipeline

> **File:** `workflows/review/review-pipeline.md`
> **Purpose:** Define the review pipeline from PR open to merge.

---

## Review Pipeline Stages

```
PR Open → CI → CodeRabbit → Agent Reviews → Human Review → Merge
```

## Stage 1: CI (Automated)

**Trigger:** PR opened or updated.
**Checks:**
- ESLint — no errors
- TypeScript typecheck — no errors
- Vitest — all tests pass
- Build — succeeds

**Pass:** All checks green.
**Fail:** PR blocked. Must fix before proceeding.

## Stage 2: CodeRabbit (Automated)

**Trigger:** CI passes.
**Categories:**
- Required findings: security, privacy, data loss, broken build, scope creep, spec mismatch.
- Advisory findings: style, optional refactoring.

**Pass:** No required findings, or all addressed.
**Fail:** Required findings unresolved. PR blocked.

## Stage 3: Agent Reviews (Parallel)

**Trigger:** CodeRabbit passes (or no required findings).

### Parallel Reviews

| Agent | Trigger | Focus |
|-------|---------|-------|
| security-reviewer | Any code change | Security baseline |
| rtl-auditor | UI change | RTL and Arabic compliance |
| frontend-polish | UI change | Brand consistency |
| docker-auditor | Docker change | Container compliance |
| spec-guardian | Any change | Spec compliance |
| qa-lead | Any change | Test coverage |

**Pass:** All agent reviews pass.
**Fail:** Any agent finds blocking issue. Must fix.

## Stage 4: Human Review

**Trigger:** All automated and agent reviews pass.
**Reviewer:** Human engineer with review rights.
**Focus:**
- Code quality and readability
- Spec compliance
- Architecture consistency
- Test adequacy
- Overall assessment

**Pass:** PR approved.
**Fail:** PR returned with revision notes.

## Stage 5: Merge

**Trigger:** Human review approves.
**Action:** Merge PR to main branch.
**Post-Merge:**
- Update spec status.
- Update memory.
- Update docs if needed.
- Close related issues.

---

## Review Parallelization

```
CI → CodeRabbit → ┬→ Security Review
                  ├→ RTL Audit (UI only)
                  ├→ Brand Audit (UI only)
                  ├→ Docker Audit (infra only)
                  ├→ Spec Compliance
                  └→ QA Review
                  ↓
              Human Review → Merge
```

Reviews that don't depend on each other run in parallel. Human review waits for all reviews to complete.

---

## Review Escalation

| Issue | Escalates To |
|-------|-------------|
| CI failure | PR author |
| CodeRabbit required finding | PR author |
| Security finding | Security-reviewer → Human |
| RTL finding | RTL-auditor → Human |
| Brand finding | Frontend-polish → Human |
| Spec mismatch | Spec-guardian → Human |
| Human review rejection | PR author |

---

## Reference

- `REVIEW_PIPELINE.md` — Review lifecycle definition.
- `PHASE_GATES.md` — Phase gate enforcement.
- `AGENT_RULES.md` — Agent orchestration rules.
