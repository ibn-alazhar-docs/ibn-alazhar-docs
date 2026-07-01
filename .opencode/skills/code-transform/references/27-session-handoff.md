# Session Handoff — Multi-Session Protocol

## Session Lifecycle

```
SESSION START → READ artifacts → VERIFY state (drift detection) → STATE plan (3 sentences)
→ EXECUTE transforms (one per commit) → UPDATE artifacts → CHECK stop conditions
→ WRITE session summary → WRITE next-session plan → SESSION END
```

## Phase -1: MEMORY LOAD (at session start)

Read: INTAKE.md, CONSTRAINTS.md, BLUEPRINT.md, PROGRESS.md, TRACEABILITY_MATRIX.md, AUDIT_REPORT.md
Run: `python3 scripts/traceability_matrix.py check-drift .`
State in 3 sentences: what was done, what's next, open issues.

## Drift Detection

```bash
LAST_COMMIT=<from PROGRESS.md>
git log ${LAST_COMMIT}..HEAD --oneline
python3 scripts/traceability_matrix.py check-drift .
```

| Level           | Action                       |
| --------------- | ---------------------------- |
| LOW (1-3 files) | Acknowledge, proceed         |
| MEDIUM (4-10)   | Pause, ask user              |
| HIGH (>10)      | Re-audit affected dimensions |

## Re-Audit Triggers

External drift (HIGH), original audit incomplete, transformations revealed new issues, scope expansion, long pause (>2 weeks), quality gate failures.

## Stop Conditions

A. All success criteria met (from INTAKE.md)
B. All P0-P3 items closed (from TRACEABILITY_MATRIX.md)
C. User says stop
D. Budget exhausted
E. Unresolved escalation (Dragon Reflexion max 3)

## Per-Commit Checklist

- [ ] Transformation named (Fowler recipe)
- [ ] Output as diff
- [ ] One transformation per commit
- [ ] Verified (compiler, tests, linter)
- [ ] Self-critiqued
- [ ] AI-FM sweep
- [ ] Committed with descriptive message
- [ ] TRACEABILITY_MATRIX.md updated
- [ ] CONSTRAINTS.md checked

## Session End Checklist

- [ ] PROGRESS.md updated
- [ ] BLUEPRINT.md updated
- [ ] TRACEABILITY_MATRIX.md final state
- [ ] CONSTRAINTS.md updated (if new)
- [ ] Artifacts consistent
- [ ] Handoff summary presented

## Anti-Patterns

1. Amnesiac session — doesn't read PROGRESS.md
2. Orphan commit — doesn't update TRACEABILITY
3. Stale blueprint — completed items not marked
4. Drift blindspot — doesn't notice external changes
5. Never-ending run — no stop conditions
6. Inconsistent standards
7. Lost constraint
8. Unverified closure

## Handoff Summary Template

```markdown
## Session N Summary

**Completed**: N transforms (commits: abc1234, def5678)
**Verified by**: tests (47/47), lint, security 0 findings
**Findings closed**: 3 Critical, 2 High
**Remaining**: 1 Critical (P0), 4 High (P1-P2)
**Open issues**: [list]
**Next session**: [plan]
**Artifacts updated**: PROGRESS, BLUEPRINT, TRACEABILITY, CONSTRAINTS
```
