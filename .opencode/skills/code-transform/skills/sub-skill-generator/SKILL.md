---
name: sub-skill-generator
description: "Creates new sub-skills for novel domains the skill hasn't seen. Triggered by meta-learning when a 'missing sub-skill' lesson is routed. Researches the domain (via research-crawler), drafts a SKILL.md following the 10-section template, validates structure, adds to routing, flags experimental for 3 projects."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Sub-Skill Generator

> Phase 14 sub-skill. Grows the skill's capability surface. When the skill hits a wall it can't patch around — a genuinely new domain — this sub-skill drafts a new SKILL.md, validates it, and ships it under an experimental flag. The skill's equivalent of "we need to hire a specialist."

## When to Use

| Phase                                                                | Trigger                                                                                  | Why                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Phase 14 — SELF-UPGRADE                                              | `meta-learning` routed a `missing_sub_skill` lesson to `queue.sub-skill-generator.jsonl` | The skill improvised a capability it doesn't have |
| Phase 1 — DISCOVERY                                                  | Project type completely unknown, no sub-skill matches in routing table                   | May need a new sub-skill to cover this domain     |
| User explicit request                                                | "Create a sub-skill for X"                                                               | Direct capability request                         |
| `research-crawler` returns a novel domain with no existing sub-skill | Phase 14                                                                                 | Research confirms the gap is real                 |

**Do NOT use this sub-skill for:** refining existing rules (use `self-patch-generator`), updating knowledge (use `knowledge-base`), or one-off improvisation (just do the work, don't generalize). Sub-skills are created only for **recurring** capability gaps.

## What It Does

1. Pops a work item from `queue.sub-skill-generator.jsonl`.
2. Calls `research-crawler` to investigate the domain — official docs, popular repos, common patterns, gotchas.
3. Drafts a new `SKILL.md` (200-300 lines, 10 standard sections) following the `browser-launcher` template.
4. Validates the draft structure (see Validation Gates below) — fails fast if any gate fails.
5. Adds the new sub-skill to the routing table in the parent `SKILL.md`.
6. Mirrors the entry in `AGENTS.md` (agent-facing routing mirror).
7. Updates sub-skill counts in the parent skill's metadata.
8. Flags the new sub-skill `experimental: true` for the next 3 projects; promotes to `stable` after 3 clean projects.

## Integration Contract

```
INPUT:
  - lesson_id: string (from meta-learning queue)
  - domain_description: string (e.g. "WebSocket load testing")
  - examples: optional list of past friction events (from audit-trail)
  - dry_run: bool (default true — must explicitly set false to ship)

OUTPUT (dry_run=true):
  {
    "draft_path": "skills/<new-skill-name>/SKILL.md",
    "line_count": 245,
    "validation": {
      "sections_present": 10,
      "hard_rules_count": 7,
      "frontmatter_valid": true,
      "examples_count": 4
    },
    "ready_to_ship": true
  }

OUTPUT (dry_run=false):
  {
    "shipped": true,
    "skill_name": "ws-load-testing",
    "path": "skills/ws-load-testing/SKILL.md",
    "added_to_routing": true,
    "added_to_agents_md": true,
    "experimental_until": "2025-02-22",   // 3 projects or 90 days
    "promotion_criteria": "3 clean projects (no friction attributed to this sub-skill)"
  }
```

## Drafting Process

1. **Research (time-boxed 30 min):** `research-crawler` runs against the domain, returns `research-report.md` with patterns, anti-patterns, tools, gotchas.
2. **Outline:** Map the research findings to the 10 standard sections:
   1. Frontmatter (YAML with `name`, `description`, `license`, `metadata`)
   2. Title + intro blockquote
   3. When to Use (table: Phase / Trigger / Why)
   4. What It Does (numbered)
   5. Integration Contract (INPUT/OUTPUT schema)
   6. CLI (bash examples)
   7. Decision Tree (autonomous, ASCII)
   8. Failure Modes & Recovery (table)
   9. Tools & Permissions
   10. Hard Rules (≥5 numbered)
3. **Draft:** Write each section with concrete content — real examples, real schemas, real decision criteria. No placeholders, no TODOs.
4. **Validate:** Run all Validation Gates (below). Fix any failures.
5. **Ship:** Write the file, update routing, flag experimental.

## Validation Gates

A draft fails validation if any of these are false:

- [ ] Frontmatter has `name`, `description`, `license`, `metadata` (with `version`, `author`, `category`)
- [ ] All 10 standard sections present (verified by header scan)
- [ ] Line count is 200-300 (too short = under-specified; too long = unfocused)
- [ ] Hard Rules section has ≥5 numbered rules
- [ ] At least 1 concrete example (code/schema/CLI invocation) per major section
- [ ] Decision Tree is present and uses ASCII branching (`Q:` / `YES` / `NO`)
- [ ] Failure Modes table has ≥3 rows
- [ ] No TODOs, no "TBD", no placeholder strings (`<...>`, `[FILL IN]`)
- [ ] Description in frontmatter is one paragraph (3-5 sentences), suitable for routing
- [ ] `category` is one of: `browser-infrastructure | meta | spec-kit | <domain>`
- [ ] No duplicate name in existing `skills/*/SKILL.md` files

If any gate fails, the draft is written to `skills/_drafts/<name>/SKILL.md` for revision, NOT shipped.

## CLI

```bash
# Draft a new sub-skill from the next lesson in queue
python3 scripts/sub_skill_gen.py next --dry-run

# Ship a validated draft
python3 scripts/sub_skill_gen.py ship --name ws-load-testing

# Validate an existing draft
python3 scripts/sub_skill_gen.py validate --path skills/_drafts/ws-load-testing/SKILL.md

# Promote an experimental sub-skill to stable (after 3 clean projects)
python3 scripts/sub_skill_gen.py promote --name ws-load-testing

# Retire an experimental sub-skill that didn't work out
python3 scripts/sub_skill_gen.py retire --name ws-load-testing --reason "overlapped too much with webapp-testing"
```

## Decision Tree (autonomous)

```
Q: Is there a work item in queue.sub-skill-generator.jsonl?
  YES → pop the highest-priority one
  NO  → emit "no pending sub-skill work" and exit

Q: Has this capability been requested before (frequency ≥ 2)?
  ONE-OFF → defer (don't create sub-skills for one-offs)
  RECURRING → continue

Q: Does an existing sub-skill already cover this (even partially)?
  YES → patch the existing sub-skill's routing description instead (self-patch-generator)
  NO  → continue

Q: Can research-crawler find enough material (≥3 authoritative sources)?
  YES → draft
  NO  → defer; log "insufficient domain knowledge to draft"; surface in next Phase 14

Q: Does the draft pass all Validation Gates?
  YES → ship under experimental flag
  NO  → write to _drafts/, log which gates failed, defer to next Phase 14 cycle

Q: After 3 projects, was the sub-skill used and friction-free?
  YES → promote to stable
  NO  → retire with reason logged
```

## Experimental Period

New sub-skills are flagged `experimental: true` in their frontmatter. During the experimental period (3 projects or 90 days):

- The routing table tags the sub-skill with `(experimental)` so the orchestrator knows to verify outputs more carefully.
- `meta-auditor` checks whether the sub-skill was actually invoked (if never invoked, that's a sign the routing description is wrong).
- `meta-auditor` checks whether invoking the sub-skill caused friction (if yes, the sub-skill needs revision or retirement).

After 3 clean projects: promote to `stable`, remove the experimental tag.
If retired: move to `skills/_retired/<name>/` with a `RETIREMENT.md` explaining why.

## Routing Update

When a sub-skill ships, two files are updated atomically:

1. **Parent `SKILL.md` routing table** — append a row:
   ```
   | ws-load-testing | Phase 6 EXECUTE when project has WebSocket endpoints | Load-test WS connections |
   ```
2. **`AGENTS.md` mirror** — append the agent-facing description:
   ```
   - ws-load-testing: "Load-test WebSocket endpoints (concurrent connections, message throughput, reconnection behavior)."
   ```
3. **Counts** — increment the parent skill's `metadata.sub_skill_count`.

If any of these writes fail, the entire ship operation is rolled back — partial updates leave the skill in an inconsistent state.

## Self-Improvement Hook

Every shipped sub-skill appends to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```markdown
- [2024-11-22] SHIPPED sub-skill: ws-load-testing (experimental until 2025-02-22)
  Source lesson: lesson-2024-11-15-ws-improvisation
  Research report: ./research/2024-11-ws-load-testing.md
  Validation: all 11 gates passed
  Lines: 247
```

## Failure Modes & Recovery

| Symptom                                             | Cause                                  | Recovery                                                      |
| --------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| Draft fails validation                              | Insufficient examples, wrong structure | Write to `_drafts/`, log failures, defer                      |
| New sub-skill overlaps > 50% with existing          | Domain was too narrow                  | Merge into existing sub-skill (patch, not new)                |
| Experimental sub-skill never invoked in 3 projects  | Routing description wrong              | Rewrite description, re-flag experimental for 3 more projects |
| Experimental sub-skill caused friction in project N | Sub-skill content wrong                | Revise (treat as a patch), or retire if unfixable             |
| Two sub-skill-generator runs collide on same name   | Concurrency                            | Serialize by lesson_id; second run gets `_2` suffix or waits  |

## Tools

- **research-crawler** (sibling) — domain research
- **Parent `SKILL.md`** — routing table to update
- **`AGENTS.md`** — agent mirror to update
- **`skills/_drafts/`** — staging area for unvalidated drafts
- **`skills/_retired/`** — graveyard for retired sub-skills (kept for audit)

## Permissions

- Filesystem: write `skills/<new-name>/SKILL.md`, append to parent `SKILL.md` and `AGENTS.md`, write `skills/_drafts/`, write `skills/_retired/`
- Network: only via `research-crawler` (which is separately sandboxed)
- Processes: none

## Hard Rules

1. **Never ship a sub-skill under 100 lines.** A 50-line "sub-skill" is a stub; if you can't fill 200-300 lines, the domain isn't worth a sub-skill yet.
2. **Never skip validation.** All 11 gates must pass; a sub-skill with a missing section or 4 hard rules is rejected.
3. **Always research before drafting.** No `research-crawler` run → no draft. Drafting from imagination produces wrong content.
4. **Always flag experimental.** No sub-skill goes straight to stable; 3 clean projects is mandatory.
5. **Always update routing + AGENTS.md atomically.** A sub-skill that exists on disk but isn't in the routing table is invisible — useless.
6. **Always log the source lesson and research report.** Sub-skills don't appear from nowhere; traceability is mandatory.
7. **Never delete a retired sub-skill.** Move to `skills/_retired/` with a `RETIREMENT.md` — the audit trail must remain.
8. **Always cite the source lesson.** Every new sub-skill references the `meta-learning` lesson that triggered it; without that link, the sub-skill's existence is unexplained.
