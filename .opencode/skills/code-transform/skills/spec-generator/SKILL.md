---
name: spec-generator
description: "Phase 0 sub-skill. Generates spec.md, plan.md, and tasks.md from project analysis + user intake. Spec has Goals, Stakeholders, Requirements, Acceptance Criteria (SP-N items, testable, given/when/then), Out of Scope, Risks. Every requirement has ≥1 AC; every task references an SP-N. Never start EXECUTE without an approved spec."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: spec-kit
---

# Spec Generator

> Phase 0 sub-skill. The first thing that runs in every project. Without a spec, every downstream phase is guessing. With a good spec, every task has a traceable goal, every test has a traceable acceptance criterion, and every commit has a traceable SP-N.

## When to Use

| Phase                     | Trigger                                              | Why                                                           |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Phase 0 — SPEC GENERATION | Start of every new project                           | First phase, mandatory                                        |
| Phase 0 — SPEC GENERATION | Existing project without spec.md                     | Reverse-engineer from code + README + configs                 |
| Phase 0 — SPEC GENERATION | Spec exists but stale (> 30 days old or behind code) | Update before proceeding                                      |
| Phase 13 — META-AUDIT     | `meta-learning` routed a "wrong assumption" lesson   | Spec had a false assumption; regenerate the affected sections |

**Do NOT use this sub-skill for:** implementing features (use Phase 6 EXECUTE), writing tests (use Phase 7 VERIFY), or one-off tasks (just do them, no spec needed). Specs are for projects, not tasks.

## What It Does

1. **Analyzes the project** via `project_analyzer`: reads README, package.json/requirements.txt, code structure, configs, routes, models, existing tests.
2. **Infer intent**: What does this system do? Who uses it? What are the core flows?
3. **Asks intake questions** (or auto-fills from analysis if running autonomously):
   - What is the primary goal of this project?
   - Who are the stakeholders?
   - What's in scope vs out of scope?
   - What are the non-functional requirements (performance, security, availability)?
4. **Generates three artifacts**:
   - `spec.md` — requirements + acceptance criteria (SP-N items)
   - `plan.md` — phased implementation plan (matching the 15-phase workflow)
   - `tasks.md` — atomic tasks, each < 4 hours, each referencing SP-N
5. **Assigns SP-N IDs**: every spec item gets a unique ID for traceability.
6. **Runs quality gates** (see below) — spec is not "done" until all gates pass.

## Integration Contract

```
INPUT:
  - project_path: string (required)
  - intake_answers: optional object (if absent, ask interactively or auto-fill from analysis)
  - autonomous: bool (default false — if true, auto-fill intake without asking)

OUTPUT (files):
  - spec.md       # requirements + AC (SP-N items)
  - plan.md       # phased implementation plan
  - tasks.md      # atomic tasks, each < 4 hours, each referencing SP-N

OUTPUT (stdout JSON):
  {
    "spec_id_count": 14,
    "requirements_count": 8,
    "acceptance_criteria_count": 22,
    "tasks_count": 18,
    "phases_in_plan": 7,
    "quality_gates_passed": true,
    "gates_failed": [],
    "spec_path": "spec.md",
    "plan_path": "plan.md",
    "tasks_path": "tasks.md"
  }
```

## Spec Structure (spec.md)

```markdown
# [Project Name] — Specification

## Goals

[1-3 sentences: what the system does, who uses it, why it exists]

## Stakeholders

- [Role 1]: [what they care about]
- [Role 2]: [what they care about]

## Requirements

### Functional Requirements

- FR-1 (SP-1): [requirement, testable]
- FR-2 (SP-2): [requirement, testable]

### Non-Functional Requirements

- NFR-1 (SP-3): p95 latency < 200ms for all read endpoints
- NFR-2 (SP-4): 99.9% availability (≤ 8.76h downtime/year)
- NFR-3 (SP-5): All PII encrypted at rest (AES-256)

## Acceptance Criteria

Each AC is testable, written in Given/When/Then format.

### SP-1: User login

- AC-1.1: Given a registered user with valid credentials, When they POST /login with email + password, Then they receive a 200 with a JWT token
- AC-1.2: Given an unregistered email, When they POST /login, Then they receive a 401 with error code INVALID_CREDENTIALS
- AC-1.3: Given 5 failed login attempts, When the 6th attempt is made, Then the account is locked for 15 minutes

### SP-2: User registration

- AC-2.1: ...

## Out of Scope

- [Explicitly listed items the project will NOT do, to prevent scope creep]
- Social login (Google/GitHub) — deferred to v2
- Admin panel — deferred to v2

## Risks

- [Risk 1]: [description] — mitigation: [plan]
- [Risk 2]: [description] — mitigation: [plan]

## Dependencies

- PostgreSQL 15+
- Redis 7+
- Stripe API

## Constraints

- Must stay on Python 3.11 until 2026
- PCI-DSS compliant (no card data in logs)
```

## Plan Structure (plan.md)

```markdown
# [Project Name] — Implementation Plan

## Phase 1: DISCOVERY

- Task 1.1 (SP-1, SP-2): Analyze existing auth code — 2h
- Task 1.2 (SP-3): Profile current API latency — 1h

## Phase 2: BLUEPRINT

- Task 2.1 (SP-1, SP-2): Design new auth flow — 3h

## Phase 3: SAFETY

- Task 3.1: Create baseline tag — 0.5h
- Task 3.2: Set up test fixtures — 2h

## Phase 4-5: AUDIT + PRIORITIZE

- Task 4.1 (SP-1): Audit existing auth against AC-1.\* — 2h
- Task 5.1: Sequence tasks by dependency — 1h

## Phase 6: EXECUTE

- Task 6.1 (SP-1, AC-1.1): Implement login endpoint — 3h
- Task 6.2 (SP-1, AC-1.2): Invalid credentials handling — 1h
- Task 6.3 (SP-1, AC-1.3): Rate limiting — 2h
- Task 6.4 (SP-2, AC-2.1): Registration — 3h

## Phase 7-15: VERIFY, ROLLOUT, META-AUDIT...
```

Every phase is listed; phases that are `n/a` for this project are still listed with a one-line reason (never omitted).

## Tasks Structure (tasks.md)

```markdown
## Task 6.1: Implement login endpoint

- **SP-N:** SP-1 (User login) | **AC:** AC-1.1 | **Estimated:** 3h
- **Files:** src/auth/login.ts, src/auth/jwt.ts
- **Acceptance:** POST /login returns 200 with JWT for valid credentials
- **Depends on:** Task 3.2 (test fixtures)

## Task 6.2: Invalid credentials handling

- **SP-N:** SP-1 | **AC:** AC-1.2 | **Estimated:** 1h
- **Files:** src/auth/login.ts
- **Acceptance:** POST /login returns 401 INVALID_CREDENTIALS for unregistered email
- **Depends on:** Task 6.1
```

## Quality Gates

A spec is not "done" until ALL of these pass:

- [ ] Every functional requirement has ≥1 acceptance criterion
- [ ] Every acceptance criterion is testable (Given/When/Then or equivalent)
- [ ] Every spec item has an SP-N ID
- [ ] Every task references at least one SP-N
- [ ] Every task is estimated < 4 hours (larger = decompose)
- [ ] Plan covers all 15 phases (some may be "n/a" but must be listed)
- [ ] Out of Scope section is non-empty (forces explicit boundaries)
- [ ] Risks section lists ≥1 risk with mitigation
- [ ] No ambiguity ("should handle errors" → "should return 422 with error code INVALID_INPUT")
- [ ] Edge cases cover: empty input, null, boundary, concurrent access, network failure

If any gate fails, the spec is rejected and the generator iterates.

## Autonomous Spec Generation (existing projects)

When entering a project without spec.md:

1. Read README → stated purpose; read package.json/requirements.txt → dependencies
2. Scan routes/endpoints → user-facing features; scan models/schema → data entities
3. Scan tests → expected behavior; scan configs → non-functional requirements
4. Synthesize all into spec.md, marked `origin: reverse-engineered` (vs `origin: user-intake`)
5. Flag for user review: "I reverse-engineered this spec from your code; please verify the goals and out-of-scope sections."

Reverse-engineered specs have lower confidence; `spec-sync` watches them more carefully in Phase 6.

## CLI

```bash
# Generate spec for a new project (interactive intake)
python3 scripts/spec_generator.py generate --project-path ./my-project --interactive

# Generate spec autonomously (auto-fill intake from analysis)
python3 scripts/spec_generator.py generate --project-path ./my-project --autonomous

# Update an existing spec (re-analyze and propose diffs)
python3 scripts/spec_generator.py update --project-path ./my-project --spec-path ./spec.md

# Validate a spec against quality gates
python3 scripts/spec_generator.py validate --spec-path ./spec.md

# Reverse-engineer a spec from existing code
python3 scripts/spec_generator.py reverse-engineer \
  --project-path ./existing-project
```

## Decision Tree (autonomous)

```
Q: Does spec.md already exist?
  YES → Q: Is it stale (> 30 days old or code has diverged)?
          YES → run `update` mode, propose diffs
          NO  → Q: Does it pass quality gates?
                  YES → proceed to Phase 1
                  NO  → run `validate`, fix failures, re-validate
  NO  → continue to generation

Q: Is this a new project (no code) or existing (has code)?
  NEW → generate from user intake (interactive or autonomous)
  EXISTING → reverse-engineer from code + README

Q: Are intake answers provided?
  YES → use them
  NO  → Q: autonomous mode?
          YES → auto-fill from analysis, flag for review
          NO  → ask interactively

Q: Do all quality gates pass?
  YES → write spec.md, plan.md, tasks.md; proceed to Phase 1
  NO  → iterate (fix failures, re-validate); max 3 iterations before surfacing to user

Q: Is the spec approved (explicit user approval or autonomous-mode auto-approve)?
  YES → proceed
  NO  → halt; never start EXECUTE without approved spec
```

## Self-Improvement Hook

Every spec generation appends to `audit-trail.jsonl`:

```json
{
  "ts": "...",
  "phase": "0",
  "action": "spec-generate",
  "project_id": "...",
  "sp_count": 14,
  "ac_count": 22,
  "task_count": 18,
  "origin": "user-intake",
  "quality_gates_passed": true,
  "iterations": 2
}
```

`meta-auditor` checks:

- Did any spec item get added retroactively in Phase 6/7? (spec was incomplete → lesson for spec-generator)
- Did any task exceed 4 hours? (decomposition was insufficient → lesson for spec-generator)
- Did the spec require > 3 iterations? (intake was unclear → lesson for spec-generator's intake questions)

## Failure Modes & Recovery

| Symptom                                       | Cause                                | Recovery                                                         |
| --------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Quality gates fail after 3 iterations         | Spec is fundamentally unclear        | Halt, surface to user for clarification                          |
| Reverse-engineered spec disagrees with README | Code drifted from docs               | Trust code, flag disagreement, ask user which is correct         |
| Tasks exceed 4 hours                          | Decomposition insufficient           | Auto-decompose: split into sub-tasks, each < 4h                  |
| Plan has phases with no tasks                 | Phase genuinely n/a for this project | Mark `n/a` with one-line reason; do not omit                     |
| Spec is approved but later found wrong        | Wrong assumptions                    | `spec-sync` detects in Phase 6/7; route lesson to spec-generator |

## Tools

- **project_analyzer** (upstream) — code structure, dependencies, configs
- **knowledge-base** (sibling) — known patterns for the project's stack
- **spec-sync** (sibling) — keeps spec in sync with code after generation
- **No code execution** — generates docs only

## Permissions

- Filesystem: read project files (code, configs, README); write `spec.md`, `plan.md`, `tasks.md`
- Network: none (unless calling knowledge-base which may fetch URLs)
- Processes: none

## Hard Rules

1. **Every requirement has ≥1 acceptance criterion.** A requirement without an AC is untestable and therefore unverifiable — rejected at gate time.
2. **Every task references SP-N.** A task without a spec reference is unspec'd work — rejected at gate time.
3. **Never start EXECUTE without an approved spec.** Phase 6 EXECUTE before Phase 0 SPEC is forbidden; the spec is the contract.
4. **Every task is < 4 hours.** Larger tasks are decomposed; if a task can't be decomposed below 4h, it's a project, not a task.
5. **Always list Out of Scope.** A spec without "Out of Scope" invites scope creep; force the question.
6. **Always list Risks with mitigations.** A spec without risks is a spec that hasn't thought hard enough.
7. **Never ship an ambiguous AC.** "Should handle errors" is rejected; "should return 422 with error code INVALID_INPUT" is accepted.
8. **Always mark spec origin.** `user-intake` vs `reverse-engineered` vs `updated` — origin affects downstream confidence.
9. **Always iterate on gate failures (max 3).** Don't ship a spec that fails gates; if 3 iterations don't fix it, surface to user.
