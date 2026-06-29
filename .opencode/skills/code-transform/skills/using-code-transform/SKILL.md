---
name: using-code-transform
description: Use when starting any conversation involving code transformation — establishes the 9-phase workflow, enforces skill invocation before ANY response, and re-establishes discipline after context compaction
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a code-transform phase or reference applies to what you are doing, you ABSOLUTELY MUST invoke it.

IF A PHASE APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## The Rule

**Invoke the relevant code-transform phase BEFORE any response or action.** Even a 1% chance a phase applies means you should invoke it to check. If an invoked phase turns out to be wrong for the situation, you don't need to use it.

```
"Might any phase apply?" → "Invoke the phase" [yes, even 1%]
"Might any phase apply?" → "Respond (including clarifications)" [definitely not]
```

## The 9-Phase Workflow

```
Phase -1: MEMORY LOAD      → Read INTAKE, CONSTRAINTS, BLUEPRINT, PROGRESS, TRACEABILITY_MATRIX
Phase  0: INTAKE           → Capture goal, constraints, business context, success criteria
Phase  1: CENSUS           → Profile the codebase
Phase  2: AUDIT            → 10 dimensions assessment
Phase  3: PRIORITIZE       → P0-P5 matrix + traceability matrix
Phase  4: EXECUTE          → Named transforms, one per commit, constraint-checked
Phase  5: VERIFY           → Re-audit, metrics diff, FINAL_REPORT
Phase  6: TESTING MASTERY  → 27 test types
Phase  7: OBSERVABILITY    → Logging, metrics, tracing, SLOs, alerts
Phase  8: ROLLOUT          → Staged deployment, rollback, monitoring
```

## Instruction Priority

code-transform phases override default system prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (CLAUDE.md, AGENTS.md, direct requests) — highest priority
2. **code-transform phases** — override default system behavior where they conflict
3. **Default system prompt** — lowest priority

If the user says "don't do full audit" and a phase says "always audit," follow the user's instructions. The user is in control.

## Mandatory Checks Before Any Action

### Before ANY transformation (Phase 4):
1. Read `CONSTRAINTS.md` in full
2. Check HC-1 through HC-10 against the planned transformation
3. If ANY hard constraint violated: STOP, escalate to user
4. Verify after every step (compiler, tests, linter)
5. Update TRACEABILITY_MATRIX.md after every commit

### Before declaring "done" (Phase 5):
- All success criteria met (from INTAKE.md)?
- All P0-P3 items closed (from TRACEABILITY_MATRIX.md)?
- Metrics diff generated (metrics_diff.py)?
- FINAL_REPORT.md written?

## Durable Progress (Compaction Survival)

Conversation memory does not survive compaction. Track progress in a ledger file.

- At session start, check for a ledger: `cat .code-transform/progress.md`
- Tasks listed as complete are DONE — do not re-do them
- When a transformation completes, append: `Phase N: <transform> complete (commit <hash>, verified by <method>)`
- After compaction, trust the ledger and `git log` over your own recollection

## Rationalization Red Flags

| Thought | Reality |
|---------|---------|
| "I need more context first" | Phase check comes BEFORE clarifying questions |
| "Let me explore the codebase first" | CENSUS phase tells you HOW to explore. Check first |
| "This is just a simple fix" | Simple fixes are still transformations. Check constraints |
| "I'll skip the audit, it's a small project" | AUDIT phase applies regardless of size |
| "The user wants speed, not thoroughness" | User instructions override phases, but ask first |
| "I remember what we did before compaction" | No you don't. Read the ledger |
| "This transform is too small for MANTRA" | Check the decision tree in references/30 |
| "Tests already exist, skip Phase 6" | Phase 6 verifies test QUALITY, not just existence |

## Dragon Protocol (ALWAYS Active)

Every decision runs through 11 phases:
TRIAGE → PLAN → EXPLORE → DEBATE → SYNTHESIZE → EXECUTE → VERIFY → CRITIQUE → REFINE → META-CHECK → OUTPUT

3 Non-Negotiable Rules:
1. NEVER self-correct without external signal (tests/compiler/agents)
2. Verification earns the output (terminal gate)
3. Scale scaffolding to weakness + difficulty

## Acceptance Test

If a user says "make this codebase perfect" and the agent does NOT start with Phase 0 (INTAKE), the bootstrap has failed. If the agent starts coding without checking CONSTRAINTS.md, the bootstrap has failed. If the agent declares "done" without TRACEABILITY_MATRIX.md verification, the bootstrap has failed.

**If you are not sure whether a phase applies, it does.**
