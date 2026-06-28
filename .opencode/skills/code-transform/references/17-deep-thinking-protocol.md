# Deep Thinking Protocol — Lightweight In-Context Fallback

> **When to use this**: Use this protocol when NO sub-agent API is available (you can't spawn parallel agents). If sub-agents ARE available, use the **Dragon Protocol** (`references/19-dragon-protocol.md`) instead — it's a strict superset with multi-agent debate, tournaments, and Tree-of-Thought.
>
> This is the **lightweight, single-agent** version of the same reasoning principles: think in multiple passes before acting, inspect before touching, gate before committing, and verify in a loop.

## Table of Contents
1. [The 5-Pass Thinking Protocol](#the-5-pass-thinking-protocol)
2. [Pre-Action Inspection Checklist](#pre-action-inspection-checklist)
3. [Decision Gates](#decision-gates)
4. [Verification Loops](#verification-loops)

---

## Why Multi-Pass Thinking?

Single-pass thinking produces shallow work. The first idea is rarely the best. Research (MANTRA arxiv 2503.14340) shows that self-critique — thinking again about your own output — is the single most valuable component in AI-assisted code work. Models that think once produce "looks right" code. Models that think 3-5 times produce "is right" code.

**The cost**: 3-5× more tokens per decision. **The benefit**: 10× fewer regressions, 10× fewer reverts, 10× better quality. The cheapest transformation is the one that works the first time.

**For weak models**: this is even more critical. A weak model's first pass is often wrong. The second pass catches obvious errors. The third pass catches subtle ones. The fourth pass catches edge cases. The fifth pass confirms the decision is sound.

---

## The 5-Pass Thinking Protocol

Before ANY decision (choosing a recipe, applying a transformation, committing code), run these 5 passes. Each pass has a specific question. Do NOT skip passes — each catches different errors.

### Pass 1: UNDERSTAND (What am I looking at?)

**Question**: "Do I fully understand the code, its callers, its callees, its side effects, and its context?"

**Think about**:
- What does this code DO? (not what it's supposed to do — what does it ACTUALLY do?)
- Who calls this? (grep for all callers)
- What does this call? (grep for all callees)
- What side effects does it have? (DB writes, network calls, mutations, logs, metrics)
- What invariants does it maintain? (what must always be true?)
- What implicit contracts does it rely on? (ordering, types, null handling)

**Output**: A 3-sentence understanding statement.

**Gate**: If you can't explain the code in 3 sentences to a junior developer, you don't understand it. Read more.

### Pass 2: ANALYZE (What's wrong? What are the options?)

**Question**: "What are ALL the problems with this code, and what are ALL the ways to fix them?"

**Think about**:
- List EVERY smell from the catalog that applies (not just the first one you notice)
- List EVERY possible recipe that could address each smell
- For each recipe: what's the risk? What's the effort? What's the verification strategy?
- What are the trade-offs between recipes?
- What happens if I do nothing? (sometimes the answer is "nothing bad" — YAGNI)

**Output**: A ranked list of (smell, recipe, risk, effort, verification) tuples.

**Gate**: If you only found one problem or one solution, you haven't thought enough. Find at least 3 problems and 3 solutions.

### Pass 3: PLAN (What's the safest sequence?)

**Question**: "What's the safest, smallest, most reversible sequence of steps?"

**Think about**:
- Decompose compound changes into atomic steps (one Fowler refactoring per commit)
- What order? (Low-risk first, dependencies before dependents)
- What's the verification after each step? (compiler, tests, smoke, mutation)
- What's the rollback if any step fails? (`git reset --hard <tag>`)
- What could go wrong that I haven't considered? (hidden coupling, dynamic dispatch, side-effect ordering)
- Am I being too aggressive? Too cautious? What's the right risk level?

**Output**: An ordered list of steps with verification and rollback per step.

**Gate**: If any step doesn't have a verification and rollback, the plan is incomplete.

### Pass 4: CRITIQUE (Why would this fail?)

**Question**: "If a hostile senior reviewer examined my plan, what would they object to?"

**Think about** (generate ≥3 objections):
- "Did you check callers outside the diff scope?" (hidden coupling)
- "Are there dynamic dispatch / reflection / string-based references you missed?"
- "Did you accidentally change error messages, log formats, or response shapes?"
- "Did you reorder any side effects?" (DB write before log? notification before save?)
- "Did you introduce speculative abstractions?" (interface with 1 impl, no test mock)
- "Are there branches or edge cases that disappeared?" (the #1 AI failure mode)
- "Did 'cleanup' drift into behavior change?" (the #2 AI failure mode)
- "Is the verification strategy sufficient?" (compiler alone is NOT enough for behavior changes)
- "What happens under concurrent access?" (race conditions introduced by refactoring)
- "What happens with empty/null/boundary inputs?" (edge cases silently broken)

**Output**: ≥3 objections, each either fixed or justified.

**Gate**: If you can't generate 3 objections, you haven't looked hard enough. Re-read the diff with hostile eyes.

### Pass 5: CONFIRM (Am I sure?)

**Question**: "Am I confident this is correct, safe, and the best option?"

**Think about**:
- Does the diff change ONLY structure (refactor) or also behavior (fix/feat)? If behavior changed, is that intentional?
- Have I verified with the CHEAPEST sufficient net? (compiler for mechanical, tests for structural, characterization for legacy, mutation for critical)
- Is the commit message accurate? (does it say what ACTUALLY changed?)
- Is there anything I'm unsure about? If yes, STOP and escalate to the user.
- Would I be comfortable explaining this change to the team in a code review?

**Output**: A confidence statement: "I am confident because [evidence]. I am uncertain about [specific thing]."

**Gate**: If you are uncertain about anything that affects behavior, STOP. Do not commit. Escalate.

---

## Pre-Action Inspection Checklist

Before touching ANY file, run this inspection. This is separate from the 5-pass protocol — it's about the mechanical "did I check everything" before acting.

```
[ ] I have read the target file completely (not skimmed)
[ ] I have grepped for ALL callers of every function I'm changing
[ ] I have grepped for string-based references (getattr, dynamic dispatch, config keys)
[ ] I have identified ALL side effects (DB, network, file, log, metric, mutation)
[ ] I have written down the behavior surface (what must stay identical)
[ ] I have committed a baseline tag (git tag refactor-baseline-<scope>)
[ ] I have the revert command ready (git reset --hard <tag>)
[ ] I have chosen the verification strategy (compiler/tests/characterization/mutation)
[ ] I have the reference file loaded for the recipe I'm applying
[ ] I have checked for paradigm-specific risks (concurrent? reactive? event-sourced?)
```

If ANY box is unchecked, DO NOT proceed. Go back and check it.

---

## Decision Gates

At certain points, you MUST stop and pass through a decision gate. These are hard stops — you may not proceed without explicitly passing the gate.

### Gate 1: Before Choosing a Recipe
**Stop and ask**: "Have I considered at least 3 alternative recipes? Why is this one the best?"
- If you only considered 1 recipe → go back, find 2 more alternatives
- If you can't articulate why this recipe is better than the alternatives → you don't understand the trade-offs

### Gate 2: Before Writing Code
**Stop and ask**: "Have I planned the exact diff? Can I describe it in one sentence?"
- If you can't describe the diff in one sentence → you don't know what you're about to do
- If the diff touches more than one named code element → split into multiple commits

### Gate 3: Before Committing
**Stop and ask**: "Have I verified? Have I critiqued? Am I confident?"
- Run verification (compiler/tests/smoke)
- Run the 5-pass protocol (especially Pass 4: CRITIQUE)
- Run the AI-FM sweep (14 LLM failure modes)
- If ANY check fails → fix or revert. Do not commit.

### Gate 4: Before Declaring Done
**Stop and ask**: "Have I walked the behavior surface? Have I compared before/after metrics?"
- Re-read the behavior surface from RECON. Verify each item.
- Compare cognitive complexity before/after.
- Check for dangling references (git grep for old names).
- If ANY behavior surface item is unverified → not done.

---

## Verification Loops

Verification is not a single step — it's a loop. Keep verifying until you're confident.

### The Verification Loop

```
1. Apply transformation (diff)
2. Run verification (compiler / tests / linter / security scan)
   ├─ GREEN → proceed to step 3
   └─ RED → diagnose:
      ├─ Is the cause obvious and <5 lines? → FIX FORWARD → go to step 2
      └─ Is the cause unclear or large? → REVERT (git reset --hard HEAD~1)
         → Write a Failure Note → Re-plan → go to step 1
3. Run AI-FM sweep (14 LLM failure modes)
   ├─ All checked → proceed to step 4
   └─ Any unchecked → fix or justify → go to step 3
4. Run CRITIQUE (≥3 hostile objections)
   ├─ All resolved → proceed to step 5
   └─ Any unresolved → fix or justify → go to step 4
5. Walk the behavior surface (each item verified?)
   ├─ All verified → proceed to step 6
   └─ Any unverified → investigate → fix or revert → go to step 1
6. COMMIT
```

### Failure Notes (Reflexion)

When a transformation fails and you revert, write a Failure Note BEFORE retrying:

```
Failure Note — Attempt N
========================
What I tried: [describe the transformation]
What went wrong: [the specific error or test failure]
Root cause: [why it failed — not just the symptom]
Adjustment for next attempt: [what I'll do differently]
```

**Maximum 3 attempts**. After 3 failures, escalate to the user with all 3 failure notes.

---

## When to Think More (or Less)

### Think MORE (5 passes + extra inspection) when:
- Critical path code (payments, auth, data migration)
- No tests exist (no safety net)
- Concurrency is involved (race conditions)
- The change touches >3 files
- The code uses dynamic dispatch / reflection / string-based coupling
- You're uncertain about the behavior
- The model is weak (Haiku, mini, small open-source)

### Think LESS (3 passes, skip Pass 5) when:
- Mechanical refactor in a typed language (rename, extract with signature preservation)
- Compiler is the primary verification (empty error list = done)
- Single file, single function, no side effects
- The change is trivially reversible (git reset)

### NEVER skip:
- Pass 1 (UNDERSTAND) — always understand before acting
- Pass 4 (CRITIQUE) — always generate ≥3 hostile objections
- Gate 3 (before committing) — always verify before committing

---

## Summary

- **5-Pass Protocol**: UNDERSTAND → ANALYZE → PLAN → CRITIQUE → CONFIRM. Before every decision.
- **Pre-Action Inspection**: 10-point checklist before touching any file.
- **Decision Gates**: 4 hard stops (before choosing recipe, before writing code, before committing, before declaring done).
- **Verification Loop**: apply → verify → AI-FM → critique → behavior surface → commit. Loop until confident.
- **Failure Notes**: after every failed attempt, write what went wrong before retrying. Max 3 attempts.
- **Think more for**: critical paths, no tests, concurrency, >3 files, weak models.
- **Think less for**: mechanical refactors in typed languages, single-file single-function.
- **NEVER skip**: UNDERSTAND, CRITIQUE, or the commit gate.
