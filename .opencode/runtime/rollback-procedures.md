# Runtime: Rollback Procedures

> **File:** `runtime/rollback-procedures.md`
> **Purpose:** Define rollback procedures for failed implementations, bad decisions, and corrupted state.
> **Scope:** All runtime rollback scenarios.

---

## When Rollback Is Needed

Rollback is triggered when:

1. **Implementation fails** — Code changes break build, tests, or introduce regressions.
2. **Spec is wrong** — Approved spec is later found to have incorrect requirements.
3. **Phase gate passed with hidden issues** — Gate passed but blocking issues surface post-merge.
4. **Memory corruption** — Memory files contain incorrect or stale data.
5. **Runtime file corruption** — Runtime files are modified incorrectly.
6. **Bad migration** — Database migration fails or corrupts data.
7. **Docker config breakage** — Container configuration prevents services from starting.

---

## Rollback Levels

### Level 1: File-Level Rollback

**Scope:** Single file or small set of files.
**Trigger:** Incorrect file modification, typo, wrong content.
**Recovery:** `git checkout <file>` or restore from last known good state.

**Procedure:**

1. Identify the corrupted file(s).
2. Run `git diff <file>` to see what changed.
3. If change is in current session: revert the edit.
4. If change was committed: `git checkout HEAD~1 -- <file>` or `git revert <commit>`.
5. Verify file is correct.
6. Document the rollback in session record.

**Time:** < 5 minutes.
**Risk:** Low.

---

### Level 2: Session-Level Rollback

**Scope:** All changes made in a single session.
**Trigger:** Session produced incorrect output, wrong implementation, or violated policies.
**Recovery:** Revert all session changes.

**Procedure:**

1. Identify the session to rollback (session ID in `sessions/`).
2. List all files changed in that session (from session record).
3. For each changed file:
   - If uncommitted: revert edits.
   - If committed: `git revert <commit>` (one commit per session).
4. Update session record to `Rolled Back` with reason.
5. Update `memory/project/current-status.md` to reflect rollback.
6. Document the rollback decision.

**Time:** 10-30 minutes.
**Risk:** Medium.

---

### Level 3: Spec-Level Rollback

**Scope:** A spec that was approved but later found to be incorrect.
**Trigger:** Spec has wrong requirements, missing edge cases, or conflicts with other specs.
**Recovery:** Return spec to Draft state, revise, re-review.

**Procedure:**

1. Identify the incorrect spec.
2. Change spec status from `Locked` or `Approved` to `Draft`.
3. Document the reason for rollback in `spec/review.md`.
4. Record the decision in `docs/19_DECISION_LOG.md`.
5. If implementation already started:
   - Run Level 2 rollback for implementation changes.
   - Update session records.
6. Revise the spec.
7. Re-run spec review.
8. Re-lock at next phase gate if still applicable.

**Time:** 30 minutes - 2 hours (depends on implementation progress).
**Risk:** Medium-High.

---

### Level 4: Phase-Level Rollback

**Scope:** An entire phase that passed gate but has hidden blocking issues.
**Trigger:** Phase gate passed but critical issues surface that invalidate the phase.
**Recovery:** Revert phase changes, re-evaluate gate criteria, re-run gate.

**Procedure:**

1. Identify the blocking issue(s).
2. Document the issue in `docs/19_DECISION_LOG.md`.
3. Change phase gate status from `PASS` to `FAIL`.
4. Identify all commits since phase started.
5. Create a rollback branch: `git checkout -b rollback/phase-N`.
6. Revert all phase commits on the rollback branch.
7. Test that the codebase is stable after rollback.
8. Create PR to merge rollback branch.
9. Re-evaluate phase scope and gate criteria.
10. Fix the blocking issue(s).
11. Re-implement phase.
12. Re-run phase gate.

**Time:** 2-8 hours (depends on phase scope).
**Risk:** High.

---

### Level 5: Memory/Runtime Rollback

**Scope:** Corrupted memory files or runtime configuration.
**Trigger:** Memory files contain incorrect data, runtime files are misconfigured.
**Recovery:** Restore from last known good state or rebuild from source docs.

**Procedure:**

1. Identify the corrupted file(s).
2. Determine the source of truth:
   - Memory files → source docs (`docs/`, `PROJECT_RUNTIME.md`).
   - Runtime files → `SYSTEM.md` and templates.
3. Rebuild the corrupted file from source:
   - `memory/project/project-overview.md` ← `docs/00_PROJECT_BRIEF.md`
   - `memory/project/phase-1-focus.md` ← `docs/13_PHASE_1_PLAN.md`
   - `memory/brand/brand-rules.md` ← `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`
   - `memory/decisions/architecture-decisions.md` ← `docs/ADR/`
4. Verify consistency across all memory files.
5. Update `runtime/runtime-status.md` to note the rollback.
6. Run a health check to verify runtime integrity.

**Time:** 10-20 minutes.
**Risk:** Medium.

---

### Level 6: Database Rollback

**Scope:** Failed or corrupted database migration.
**Trigger:** Prisma migration fails, data corruption, schema mismatch.
**Recovery:** Revert migration, restore from backup.

**Procedure:**

1. Stop all services that use the database.
2. Identify the failed migration: `npx prisma migrate status`.
3. If migration is partially applied:
   - Run `npx prisma migrate resolve --rolled-back <migration_name>`.
   - Or manually revert the migration in the database.
4. If data is corrupted:
   - Restore from backup (if available).
   - Or reset the database: `npx prisma migrate reset`.
   - Re-run seed script.
5. Verify database state: `npx prisma studio`.
6. Update `memory/project/current-status.md` to note the rollback.
7. Document the issue and resolution.

**Time:** 15-60 minutes.
**Risk:** High (potential data loss).

---

## Rollback Decision Matrix

| Scenario           | Rollback Level | Who Decides              | Who Executes            |
| ------------------ | -------------- | ------------------------ | ----------------------- |
| Wrong file content | Level 1        | Session agent            | Session agent           |
| Bad session output | Level 2        | Human engineer           | Human engineer + agents |
| Incorrect spec     | Level 3        | Architect + human        | Architect + human       |
| Failed phase gate  | Level 4        | Product Lead + Tech Lead | Human engineer          |
| Corrupted memory   | Level 5        | Docs-sync agent          | Docs-sync agent + human |
| Bad migration      | Level 6        | Human engineer           | Human engineer          |

---

## Rollback Safety Rules

1. **Never rollback without documentation.** Every rollback is recorded in `docs/19_DECISION_LOG.md`.
2. **Never rollback production data without backup.** Always verify backup exists before Level 6 rollback.
3. **Never rollback without human approval for Level 3+.** Level 1-2 can be executed by agents. Level 3+ requires human approval.
4. **Always verify after rollback.** Run health checks, tests, and build verification after any rollback.
5. **Preserve rollback history.** Do not delete rollback records. They are part of project history.

---

## Rollback Record Format

All rollbacks are recorded in `docs/19_DECISION_LOG.md`:

```markdown
## Rollback: [description]

- Date: YYYY-MM-DD
- Level: [1-6]
- Trigger: [what caused the rollback]
- Scope: [what was rolled back]
- Decided By: [who approved the rollback]
- Executed By: [who performed the rollback]
- Reason: [why the rollback was necessary]
- Impact: [what was lost or reverted]
- Follow-up: [what needs to be done next]
- Status: Complete | In Progress | Failed
```

---

## Rollback Testing

Rollback procedures should be tested:

- **Level 1-2:** Test during normal development (naturally occurs).
- **Level 3-4:** Test during phase gate preparation (simulate spec/phase rollback).
- **Level 5:** Test during runtime health checks (simulate memory corruption).
- **Level 6:** Test in staging environment before production use.

---

**Last Updated:** 2026-05-20
**Next Review:** After first rollback event or Phase 1 gate review
