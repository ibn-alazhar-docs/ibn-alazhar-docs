---
name: meta-learning
description: "Captures lesson candidates emitted by meta-auditor (Phase 13), classifies them into a four-bucket taxonomy (missing sub-skill / weak heuristic / outdated knowledge / wrong assumption), prioritizes by frequency × impact, and routes each to the correct downstream self-improvement sub-skill. Never discards a lesson — even low-priority ones are queued."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Meta-Learning

> The classifier-and-router of the self-improvement loop. Takes raw friction events from `meta-auditor` and turns them into actionable work items with the right destination. Without this, friction is observed but never acted on.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 13 — META-LEARN | Immediately after `meta-auditor` completes | Consumes `lesson-candidates.json`, produces `prioritized-lessons.json` |
| Phase 14 — SELF-UPGRADE | Each routed lesson is then picked up by its target sub-skill | `self-patch-generator`, `sub-skill-generator`, `knowledge-base`, `spec-sync` pull from the prioritized queue |
| User asks "what have you learned?" | Anytime | Read `prioritized-lessons.json`, summarize top lessons |
| Cross-project trend review | Monthly | Aggregate `prioritized-lessons.json` across projects to find systemic gaps |

**Do NOT use this sub-skill for:** auditing performance (use `meta-auditor`), generating patches (use `self-patch-generator`), writing knowledge entries (use `knowledge-base`). This sub-skill only *classifies*, *prioritizes*, and *routes*.

## What It Does

1. Reads `lesson-candidates.json` from the just-completed `meta-auditor` run.
2. For each candidate, classifies it into one of four buckets (see Taxonomy below).
3. For each candidate, computes a priority score = `frequency × impact`:
   - **Frequency (1-5):** how many times this lesson (or a near-duplicate) has appeared across projects, per `OMNIPROJECT_SELF_IMPROVEMENT.md`.
   - **Impact (1-5):** how much friction it caused (reverts, lost time, user intervention).
4. Sorts lessons by priority descending and writes `prioritized-lessons.json`.
5. Routes each lesson to its target sub-skill by writing a work item into the appropriate queue file:
   - `queue.sub-skill-generator.jsonl`
   - `queue.self-patch-generator.jsonl`
   - `queue.knowledge-base.jsonl`
   - `queue.spec-sync.jsonl`
6. Appends a summary to `OMNIPROJECT_SELF_IMPROVEMENT.md` for historical search.

## Integration Contract

```
INPUT:
  - lesson_candidates_path: path to lesson-candidates.json (from meta-auditor)
  - history_path: OMNIPROJECT_SELF_IMPROVEMENT.md (for frequency lookup)
  - project_id: string (for traceability)

OUTPUT (files):
  - prioritized-lessons.json       # sorted list with priority score + classification + route
  - queue.sub-skill-generator.jsonl    # appended work items
  - queue.self-patch-generator.jsonl   # appended work items
  - queue.knowledge-base.jsonl         # appended work items
  - queue.spec-sync.jsonl              # appended work items
  - OMNIPROJECT_SELF_IMPROVEMENT.md    # appended summary

OUTPUT (stdout JSON):
  {
    "classified_count": 12,
    "by_bucket": {"missing_sub_skill": 2, "weak_heuristic": 5, "outdated_knowledge": 3, "wrong_assumption": 2},
    "top_3_priority": [...],
    "routed_to": {"sub-skill-generator": 2, "self-patch-generator": 5, ...}
  }
```

## Lesson Taxonomy

| Bucket | Definition | Example | Route |
|--------|-----------|---------|-------|
| Missing sub-skill | A capability the skill doesn't have — it improvised | "Had to manually test SSE; no sse-testing sub-skill" | `sub-skill-generator` |
| Weak heuristic | An existing rule gave the wrong answer | "Long-method threshold flagged a 25-line test setup as a smell" | `self-patch-generator` |
| Outdated knowledge | Knowledge-base entry no longer accurate | "Next.js 13 advice used Pages Router; project is App Router" | `knowledge-base` (re-verify + update) |
| Wrong assumption | Spec or plan made a false assumption | "Assumed Postgres; project uses MySQL — spec item SP-3 needs rewrite" | `spec-sync` |

If a lesson doesn't cleanly fit one bucket, default to **weak heuristic** (most common) and add a note in `prioritized-lessons.json` flagging it for human review.

## Prioritization Formula

```
priority_score = frequency × impact

frequency (1-5):
  1 = first time seen
  2 = seen once before
  3 = seen 2-3 times
  4 = seen 4-6 times
  5 = seen 7+ times (systemic)

impact (1-5):
  1 = minor friction, no time lost
  2 = <15 min lost
  3 = 15-60 min lost OR 1 revert
  4 = 1-4 hours lost OR 2-3 reverts
  5 = ≥4 hours lost OR user intervention OR production-adjacent
```

Priority ≥ 15 → marked `high_priority`, picked up in the next Phase 14 cycle.
Priority 5-14 → `medium`, picked up when capacity allows.
Priority ≤ 4 → `low`, retained in queue but not auto-picked (never discarded).

## Decision Tree (autonomous)

```
Q: Does the lesson describe a capability the skill lacks?
  YES → bucket = missing_sub_skill → route to sub-skill-generator
  NO  → continue

Q: Does the lesson describe an existing rule/heuristic/threshold that gave the wrong answer?
  YES → bucket = weak_heuristic → route to self-patch-generator
  NO  → continue

Q: Does the lesson describe knowledge that was wrong or stale?
  YES → bucket = outdated_knowledge → route to knowledge-base
  NO  → continue

Q: Does the lesson describe a spec/plan that was wrong from the start?
  YES → bucket = wrong_assumption → route to spec-sync
  NO  → default to weak_heuristic, flag for human review

Q: Has this lesson (or near-duplicate) been seen before?
  YES → bump frequency, recompute priority, mark "recurring"
  NO  → frequency = 1, priority = impact

Q: Is priority ≥ 15?
  YES → mark high_priority, surface in next Phase 14 immediately
  NO  → queue at appropriate priority level (never discard)
```

## Deduplication

Two lessons are "near-duplicates" if they share:
- Same bucket
- Same root-cause signature (a normalized phrase: e.g. "auth-jwt-reverts", "circular-import-late-detection")
- Same target sub-skill

When a near-duplicate is detected, the new lesson is **merged** into the existing one: frequency incremented, impact = max(old, new), evidence list extended. The original lesson ID is preserved.

## CLI

```bash
# Standard run after meta-auditor
python3 scripts/meta_learning.py classify \
  --project-id proj-2024-11-payments \
  --candidates ./lesson-candidates.json

# Show top priority lessons across all projects
python3 scripts/meta_learning.py top --limit 10

# Re-prioritize after a knowledge-base update (some lessons may now be obsolete)
python3 scripts/meta_learning.py recompute --since 30d
```

## Self-Improvement Hook

Every classified lesson appends a one-liner to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```markdown
- [2024-11-22] proj-2024-11-payments | bucket=weak_heuristic | freq=3 | impact=4 | pri=12 | route=self-patch-generator | "auth module reverts due to JWT library mismatch"
```

`meta-auditor` reads these lines on the next project to compute frequency.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Lesson doesn't fit any bucket | Genuine novel case | Default to weak_heuristic, flag `needs_human_review: true` |
| Same lesson routed 5+ times with no patch applied | Downstream sub-skill backlog | Escalate to high_priority, surface in next Phase 14 stand-up |
| Frequency counts drift | `OMNIPROJECT_SELF_IMPROVEMENT.md` got pruned | Re-build frequency index from audit-trail.jsonl |
| Conflicting lessons (opposite directions) | Different projects, different contexts | Keep both, tag with `context: <framework/version>` |

## Tools

- **meta-auditor** (upstream) — provides `lesson-candidates.json`
- **OMNIPROJECT_SELF_IMPROVEMENT.md** — frequency lookup
- **Queue files** — JSONL append-only, one per downstream sub-skill
- **No direct skill mutation** — only routes

## Permissions

- Filesystem: read `lesson-candidates.json`, `OMNIPROJECT_SELF_IMPROVEMENT.md`, `audit-trail.jsonl`; write `prioritized-lessons.json`, queue files, append to `OMNIPROJECT_SELF_IMPROVEMENT.md`
- Network: none
- Processes: none

## Work Item Schema (queue entries)

Each queue file (`queue.<target>.jsonl`) receives work items in this schema:

```json
{
  "work_id": "work-2024-11-22-001",
  "lesson_id": "lesson-2024-11-22-auth-reverts",
  "target_subskill": "self-patch-generator",
  "bucket": "weak_heuristic",
  "priority": 12,
  "frequency": 3,
  "impact": 4,
  "project_id": "proj-2024-11-payments",
  "ts_queued": "2024-11-22T14:35:00Z",
  "evidence": ["commit abc123", "audit-trail:2024-11-22T14:33:00Z"],
  "root_cause": "Auth module reverts due to JWT library mismatch",
  "status": "pending"
}
```

The downstream sub-skill pops items by priority (highest first), updates `status` to `in_progress` → `done` or `rejected` (with reason), and the loop closes.

## Hard Rules

1. **Never discard a lesson.** Even priority=1 lessons stay in the queue. Low priority ≠ irrelevant — it just means "not yet."
2. **Always classify before prioritizing.** A lesson without a bucket cannot be routed; default to `weak_heuristic` if ambiguous, but never leave it unclassified.
3. **Always link to the original friction event.** Every prioritized lesson references a `meta-auditor` lesson candidate, which references a PROGRESS.md line or audit-trail entry — full traceability.
4. **Never auto-apply patches.** Classification produces a routed work item; the downstream sub-skill applies changes through its own safety gates.
5. **Always deduplicate before queueing.** A recurring lesson increments frequency on the existing record; it does not create a duplicate.
6. **Always cite the project_id and timestamp.** Lessons without provenance are useless for trend analysis.
7. **Always surface high-priority (≥15) lessons immediately.** They are picked up in the next Phase 14 cycle, not deferred.
8. **Always emit work items in the standard schema.** Downstream sub-skills parse the queue programmatically; schema deviations break the loop.
