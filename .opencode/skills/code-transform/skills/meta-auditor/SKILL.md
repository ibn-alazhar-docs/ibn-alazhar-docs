---
name: meta-auditor
description: "Audits the skill's own performance after every project delivery (Phase 13). Reviews PROGRESS.md + git log, scores each phase on efficiency/accuracy/friction, detects systemic friction patterns, and emits lesson candidates that feed meta-learning. Never skipped — always finds ≥1 lesson."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Meta-Auditor

> Phase 13 sub-skill. The skill's self-awareness layer: turns the just-finished project into structured feedback for `meta-learning`, `self-patch-generator`, and `sub-skill-generator`. Without this, every project is forgotten.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 13 — META-AUDIT | After every project delivery (mandatory) | Project is fresh in memory; friction events are still in PROGRESS.md and git log |
| User asks "how did it go?" | Anytime | Pull the latest audit-report and summarize |
| `meta-learning` invoked | Phase 13, immediately after this sub-skill | `meta-learning` consumes `lesson-candidates.json` produced here |
| Cross-project pattern search | Monthly | `meta-auditor` re-runs across last 10 audits to detect systemic friction |

**Do NOT use this sub-skill for:** patching the skill (use `self-patch-generator`), classifying lessons (use `meta-learning`), writing new knowledge entries (use `knowledge-base`). This sub-skill only *observes* and *scores* — it never mutates the skill.

## What It Does

1. Reads the project's `PROGRESS.md`, `git log --stat` for the project branch, and the last 30 days of `audit-trail.jsonl` entries tagged with this project's `project_id`.
2. Walks each of the 15 phases (DISCOVERY → DELIVERY) and scores it on three axes:
   - **Efficiency (1-5):** Was the phase fast? 5 = under typical time, 1 = took ≥3× typical time.
   - **Accuracy (1-5):** Was the output correct on first pass? 5 = no corrections, 1 = ≥2 reverts.
   - **Friction (1-5):** How many retries/reverts? 5 = zero, 1 = ≥3 reverts or a manual intervention.
3. Detects systemic friction patterns (see Friction Patterns table below).
4. For each detected friction event, emits a **lesson candidate** — a structured JSON record linking the friction to its root cause.
5. Writes `meta-audit-report.md` (human-readable) and `lesson-candidates.json` (machine-readable).
6. Appends a one-line summary to `OMNIPROJECT_SELF_IMPROVEMENT.md` so historical audits are searchable.

## Integration Contract

```
INPUT:
  - project_id: string (required, must match audit-trail.jsonl entries)
  - progress_md: path to PROGRESS.md (default: ./PROGRESS.md)
  - git_branch: string (default: current branch)
  - audit_trail_path: path to audit-trail.jsonl (default: ./audit-trail.jsonl)
  - history_path: path to OMNIPROJECT_SELF_IMPROVEMENT.md (default: ./OMNIPROJECT_SELF_IMPROVEMENT.md)

OUTPUT (files):
  - meta-audit-report.md          # human-readable summary
  - lesson-candidates.json        # array of lesson objects
  - OMNIPROJECT_SELF_IMPROVEMENT.md (appended one-liner)

OUTPUT (stdout JSON):
  {
    "project_id": "...",
    "phase_scores": [
      {"phase": "DISCOVERY", "efficiency": 4, "accuracy": 5, "friction": 4, "notes": "..."},
      {"phase": "EXECUTE", "efficiency": 2, "accuracy": 3, "friction": 2, "notes": "3 reverts on auth"},
      ...
    ],
    "friction_patterns": ["reverts>3:auth-module", "long-debug>30min:circular-import"],
    "lesson_count": 4,
    "report_path": "meta-audit-report.md",
    "candidates_path": "lesson-candidates.json"
  }
```

## CLI

```bash
# Standard audit after a delivery
python3 scripts/meta_audit.py run \
  --project-id proj-2024-11-payments \
  --progress-md ./PROGRESS.md \
  --git-branch feat/payments-refactor

# Cross-project pattern scan (monthly)
python3 scripts/meta_audit.py scan-history \
  --since 30d \
  --min-repeats 3 \
  --output systemic-friction.json

# Just re-emit the report from a prior run (no recompute)
python3 scripts/meta_audit.py show --project-id proj-2024-11-payments
```

## Friction Patterns

| Pattern | Detector | Severity | Routes to |
|---------|----------|----------|-----------|
| Reverts > 3 on same area | `git log` revert count per file | Systemic | `self-patch-generator` (weak heuristic) |
| Debug session > 30 min | `audit-trail.jsonl` time delta between DEBUG entries | High | `sub-skill-generator` (missing sub-skill) |
| Wrong assumption (spec gap) | Spec items added retroactively in Phase 7 | High | `spec-generator` / `spec-sync` |
| Missing sub-skill (improvised) | PROGRESS.md mentions "ad-hoc" or "manual" | Medium | `sub-skill-generator` |
| Outdated knowledge | Knowledge-base entry citation older than 12 months | Low | `knowledge-base` re-verify |
| Manual user intervention | `audit-trail.jsonl` `human_input_required` flag | High | `self-patch-generator` |
| Skipped quality gate | `audit-trail.jsonl` `gate_skipped` flag | Systemic | `policy-evolution` |

## Scoring Rubric

| Score | Efficiency | Accuracy | Friction |
|-------|-----------|----------|----------|
| 5 | Under typical time, automated | No corrections needed | Zero retries |
| 4 | On time | Minor self-corrections | 1 retry |
| 3 | Slightly over | 1 revert | 2 retries |
| 2 | 2× typical | 2 reverts | 3 retries |
| 1 | ≥3× typical | ≥3 reverts or user-blocked | ≥4 retries or human intervention |

A phase with any score ≤2 automatically generates a lesson candidate.

## Decision Tree (autonomous)

```
Q: Does PROGRESS.md exist for this project?
  YES → continue
  NO  → emit warning, fall back to git log only (audit will be sparse but still run)

Q: Does audit-trail.jsonl have entries for this project_id?
  YES → cross-reference friction events with timestamps
  NO  → emit warning, score from PROGRESS.md + git log alone

Q: Were any phases skipped (per PROGRESS.md)?
  YES → mark skipped phases with score=0 and a "SKIPPED — manual review required" note
  NO  → continue

Q: Are ≥1 friction patterns detected?
  YES → for each, emit lesson candidate with root-cause hypothesis
  NO  → still emit ≥1 lesson (the Iron Law: "you're not looking hard enough")
        → look for: sub-optimal choices, near-misses, time spent that could be saved

Q: Was a user intervention recorded?
  YES → always emit a lesson candidate (intervention = skill gap)
  NO  → continue
```

## Self-Improvement Hook

Every audit run appends a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```markdown
## [2024-11-22] proj-2024-11-payments — Audit
- Phase scores: DISCOVERY 4/5/4, EXECUTE 2/3/2, VERIFY 5/5/5
- Friction: 3 reverts on auth module (missing JWT sub-skill knowledge)
- Lessons emitted: 4 (1 → sub-skill-generator, 2 → self-patch-generator, 1 → knowledge-base)
- Report: ./meta-audit-report.md
```

`meta-learning` reads this file in the next step to deduplicate against historical lessons (a lesson seen 3+ times across projects becomes a high-priority self-patch candidate).

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Empty PROGRESS.md | Sub-agent didn't log | Score from git log alone, flag in report |
| Corrupt audit-trail.jsonl | Concurrent write | Skip corrupt lines, log count skipped |
| Phase scores all 5/5/5 | Auditor not looking hard enough | Force the Iron Law: re-scan for near-misses |
| >20 lesson candidates | Threshold too loose | Deduplicate by root-cause; keep top 10 by severity |

## Tools

- **git** — `log`, `diff`, `revert` counts
- **audit-trail** (read-only) — for timestamps and decisions
- **knowledge-base** (read-only) — to compare current findings against past patterns
- **No write tools to the skill itself** — that's `self-patch-generator`'s job

## Permissions

- Filesystem: read `PROGRESS.md`, `audit-trail.jsonl`, `OMNIPROJECT_SELF_IMPROVEMENT.md`; write only `meta-audit-report.md`, `lesson-candidates.json`, and append to `OMNIPROJECT_SELF_IMPROVEMENT.md`
- Network: none
- Processes: `git` read-only commands only

## Lesson Candidate Schema

Every lesson candidate emitted by `meta-auditor` follows this schema, consumed by `meta-learning`:

```json
{
  "lesson_id": "lesson-2024-11-22-auth-reverts",
  "project_id": "proj-2024-11-payments",
  "ts": "2024-11-22T14:33:00Z",
  "phase": "6",
  "friction_event": {
    "type": "reverts>3",
    "area": "auth-module",
    "evidence": ["commit abc123 (revert)", "commit def456 (revert)", "commit ghi789 (revert)"],
    "time_lost_min": 95,
    "user_intervention": false
  },
  "root_cause_hypothesis": "Auth module reverts due to JWT library mismatch — knowledge-base had no entry for jsonwebtoken@9 quirks.",
  "preliminary_bucket": "outdated_knowledge",
  "severity": "high",
  "suggested_route": "knowledge-base"
}
```

`preliminary_bucket` is a hint for `meta-learning` — the actual classification happens there. `meta-auditor` does not classify; it only observes.

## Hard Rules

1. **Never skip the meta-audit.** Phase 13 is mandatory after every delivery — no exceptions, no "the project went fine."
2. **Always identify ≥1 lesson candidate.** If you find none, you are not looking hard enough — re-scan for sub-optimal choices, near-misses, and manual interventions.
3. **Never blame the user.** Every friction event is attributed to a process gap in the skill, not to user behavior. Even "user changed their mind" → "spec was underspecified."
4. **Never mutate the skill.** This sub-skill only observes and reports. Patches go through `self-patch-generator`; new sub-skills go through `sub-skill-generator`.
5. **Always cross-reference history.** A friction event seen for the first time is interesting; the third time is systemic — flag it.
6. **Always link lesson candidates to evidence.** Every candidate must reference a specific commit, PROGRESS.md line, or audit-trail entry — no abstract lessons.
7. **Always score on all three axes.** Efficiency without accuracy is reckless; accuracy without friction-awareness hides pain.
8. **Always emit the lesson in the standard schema.** `meta-learning` parses `lesson-candidates.json` programmatically; deviating from the schema breaks downstream routing.
