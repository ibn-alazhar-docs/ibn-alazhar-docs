# The Dragon Protocol — Ultimate Reasoning Engine

> This is the core engine that makes ANY model — even the cheapest, weakest — reason like a frontier model. Based on 25+ research papers including DeepSeek-R1 (Nature 2025), Reflexion (NeurIPS 2023), Multi-Agent Debate (MIT 2023), Tree-of-Thoughts (Princeton 2023), and Mixture-of-Agents (Together AI 2024). The key insight: **inference-time scaffolding closes the gap between cheap and frontier models.**

## Table of Contents

1. [The Three Non-Negotiable Rules](#the-three-non-negotiable-rules)
2. [The 11-Phase Dragon Protocol](#the-11-phase-dragon-protocol)
3. [Sub-Agent Tournament](#sub-agent-tournament)
4. [Multi-Agent Debate](#multi-agent-debate)
5. [Reflexion Loop (Verifier-Gated)](#reflexion-loop-verifier-gated)
6. [Tree-of-Thought Exploration](#tree-of-thought-exploration)
7. [Constitutional Checklist](#constitutional-checklist)
8. [Meta-Cognitive Checkpoint](#meta-cognitive-checkpoint)
9. [Adaptive Scaffolding](#adaptive-scaffolding)
10. [Research Evidence](#research-evidence)

---

## The Three Non-Negotiable Rules

These rules come from the research literature. Violating them **silently degrades** performance — even for strong models.

### Rule 1: NEVER self-correct without external signal

**Source**: Huang et al., "LLMs Cannot Self-Correct Reasoning Yet" (ICLR 2024).

Intrinsic self-correction (same model reviews its own output with no new information) **degrades accuracy**. GPT-4 gets _worse_ when asked to self-critique without external feedback.

**Implication**: every critique step MUST ingest one of:

- A test result (pass/fail)
- A compiler error
- A linter warning
- Another agent's output (multi-agent debate)
- A verifier's flag

**Never** ask "is this correct?" without running something external first.

### Rule 2: Verification earns the output

**Source**: DeepSeek-R1 (Nature 2025). R1 didn't _tell_ the model to verify — RL _made_ verification pay off.

Self-verification is a **terminal gate**, not optional. You may NOT produce final output until verification has passed. This is the behavior that RL rewards, so we force it promptingly.

### Rule 3: Scale scaffolding to weakness + difficulty

**Source**: "Rethinking the Value of Multi-Agent Workflow" (arXiv:2601.12307).

A single strong agent with strong prompts can match auto-discovered multi-agent workflows. Scaffolding helps **weak models disproportionately**; for strong models it's often redundant overhead.

**Implication**: the Dragon Protocol is **adaptive**. Triage first. Spend debate/ToT only where the model is weak or the task is hard. For easy tasks on strong models, a simple Plan→Execute→Verify suffices.

---

## The 11-Phase Dragon Protocol

This is the mandatory sequence for any non-trivial decision. Each phase has a specific purpose and a gate. Do NOT skip phases.

```
 1. TRIAGE      → Classify difficulty; set thinking-budget (shallow vs deep)
 2. PLAN        → Extract variables; list subtasks; list edge cases
 3. EXPLORE     → ToT: generate 3 candidate approaches; self-score; keep top 1-2
 4. DEBATE      → 3 lens-diverse agents propose + cross-critique (1-2 rounds)
 5. SYNTHESIZE  → Judge/Aggregator merges surviving proposals into one draft
 6. EXECUTE     → Carry out the plan; produce the artifact (diff, test, fix)
 7. VERIFY      → Run tests/verifier/lint (EXTERNAL signal). If fail → REFLEXION
 8. CRITIQUE    → Constitutional checklist review by a critic agent
 9. REFINE      → 1-2 Self-Refine iterations gated on the rubric/verifier
10. META-CHECK  → Confidence rating + name top residual risk; if low → loop to DEBATE
11. OUTPUT      → Commit / report / deliver
```

### Phase 1: TRIAGE (Set Thinking Budget)

**Question**: "How hard is this, and how weak am I?"

Classify the task:

- **Easy** (mechanical rename, simple extract, type-driven in typed language): shallow thinking. Plan→Execute→Verify. Skip DEBATE, EXPLORE, REFINE.
- **Medium** (structural refactor, multi-file, some tests): standard thinking. Full 11 phases but 1 debate round, 1 refine iteration.
- **Hard** (architecture redesign, legacy no-tests, critical path, concurrency): deep thinking. Full 11 phases, 2 debate rounds, 2 refine iterations, ToT exploration.

Also consider model strength:

- **Strong model** (Opus, GPT-4, Sonnet): reduce rounds by 1.
- **Weak model** (Haiku, mini, small open-source): use maximum rounds. Weak models benefit most from scaffolding.

**Output**: A thinking-budget declaration: "Task: [easy/medium/hard]. Model: [strong/weak]. Budget: [shallow/standard/deep]. Phases to run: [list]."

### Phase 2: PLAN (Plan-and-Solve)

**Question**: "What are the variables, the subtasks, and the edge cases?"

**Source**: Wang et al., "Plan-and-Solve" (ACL 2023). Beats zero-shot CoT by reducing skipped steps.

```
PLAN:
  Variables: [list every variable and its type]
  Subtasks:
    1. [first step]
    2. [second step]
    ...
  Edge cases:
    - empty input
    - null/None
    - boundary values
    - concurrent access
    - [domain-specific edge cases]
  Verification plan:
    - [how will I verify each subtask?]
  Rollback plan:
    - [what's the revert if this fails?]
```

**Gate**: Every subtask has a verification plan? Every edge case is listed? If not, replan.

### Phase 3: EXPLORE (Tree-of-Thought)

**Question**: "What are 3 different ways to approach this?"

**Source**: Yao et al., "Tree of Thoughts" (Princeton 2023). Game of 24: 4% → 74% (18× improvement).

Generate **3 candidate approaches** (not 1 — forcing 3 prevents anchoring on the first idea):

```
Approach A: [description]
  Pros: [list]
  Cons: [list]
  Risk: [Low/Medium/High]
  Self-score: [1-5 for likelihood of success] + [1-sentence justification]

Approach B: [description]
  Pros: ...
  Cons: ...
  Risk: ...
  Self-score: ...

Approach C: [description]
  Pros: ...
  Cons: ...
  Risk: ...
  Self-score: ...
```

**Decision**:

- If one approach scores ≥4 and others ≤2: proceed with the top one.
- If two approaches score within 1 point: **keep both** for the DEBATE phase (GoT merge later).
- If all score ≤2: the problem is harder than TRIAGE suggested. Re-escalate to deep thinking.

**Gate**: At least 3 approaches generated? Each scored with justification?

### Phase 4: DEBATE (Multi-Agent Debate)

**Question**: "If 3 experts with different lenses examined this, what would each say?"

**Source**: Du et al., "Multi-Agent Debate" (MIT 2023). 3 agents, 2 rounds is the optimal balance.

This is the **keystone** — it supplies the external feedback that self-critique lacks (Rule 1).

**If sub-agent API available**: spawn 3 sub-agents, each with a different lens:

```
Agent 1 (Correctness Lens):
  "You are a correctness-focused reviewer. For the proposed approach, find:
   - Any logic error
   - Any missing edge case
   - Any incorrect assumption
   Output: [approach ID] + [issues found] + [confidence 1-5]"

Agent 2 (Safety Lens):
  "You are a safety-focused reviewer. For the proposed approach, find:
   - Any behavior change
   - Any side-effect reordering
   - Any race condition
   - Any security issue
   Output: [approach ID] + [issues found] + [confidence 1-5]"

Agent 3 (Simplicity Lens):
  "You are a simplicity-focused reviewer. For the proposed approach, find:
   - Any unnecessary abstraction
   - Any over-engineering
   - Any simpler alternative
   Output: [approach ID] + [issues found] + [confidence 1-5]"
```

**If no sub-agent API**: simulate in-context with 3 sequential passes, each with a different lens. Write each pass's output to a shared scratchpad before the next pass starts.

**Round 1**: Each agent independently reviews the approach(es).
**Round 2** (if budget allows): Each agent sees the others' reviews and revises its assessment.

**Gate**: Each agent produced a review with ≥1 specific issue? If any agent found 0 issues, it didn't look hard enough — re-run with "find at least 2 issues" instruction.

### Phase 5: SYNTHESIZE (Judge/Aggregator)

**Question**: "Given the debate, what's the best merged approach?"

**Source**: Together AI's Mixture-of-Agents — layered aggregation is strictly more powerful than flat voting.

A **Judge** (can be the main agent) reads all proposals + all debate transcripts and produces a **synthesized approach**:

```
SYNTHESIS:
  Selected approach: [A/B/C/merged]
  Rationale: [why this approach, incorporating debate findings]
  Issues from debate that are addressed:
    - [issue 1 from Agent 1] → addressed by [how]
    - [issue 2 from Agent 2] → addressed by [how]
    - [issue 3 from Agent 3] → addressed by [how]
  Residual risks (not fully resolved):
    - [risk 1] → accepted because [reason]
  Final plan:
    1. [step 1]
    2. [step 2]
    ...
```

**GoT Merge**: if two approaches had complementary strengths, merge them — take the best elements of each. This is the Graph-of-Thought advantage over simple selection.

**Gate**: Every issue from the debate is either addressed or explicitly accepted as a residual risk?

### Phase 6: EXECUTE (Produce the Artifact)

**Question**: "Am I producing exactly what the synthesized plan says?"

Carry out the plan. Produce the diff / test / fix / document.

**Rules** (from the refactor skill):

- Output as **diff** (never whole-file rewrite)
- **One transformation per commit**
- Name the Fowler refactoring or improvement type
- Follow the synthesized plan exactly — don't improvise mid-execution

### Phase 7: VERIFY (External Signal — Reflexion Trigger)

**Question**: "Does it pass the external verifier?"

**This is the critical phase.** Run the **cheapest sufficient external verifier**:

- Compiler / type-checker (mechanical refactors)
- Test suite (structural refactors)
- Linter (code quality)
- Security scanner (security fixes)
- Manual smoke test (behavior verification)

```
IF verification PASSES:
  → proceed to Phase 8 (CRITIQUE)

IF verification FAILS:
  → enter REFLEXION LOOP:
    Attempt 1: Write Failure Note:
      "Attempt 1 failed because: [root cause from the error message].
       Adjustment: [specific change to the plan or approach]."
      Re-plan → Re-execute → Re-verify.

    Attempt 2: If fails again:
      "Attempt 2 failed because: [root cause].
       Adjustment: [different change — don't repeat the same fix]."
      Re-plan → Re-execute → Re-verify.

    Attempt 3: If fails again:
      ESCALATE to user. "3 attempts failed. Failure Notes:
      1. [note 1]
      2. [note 2]
      3. [note 3]
      Need guidance."
```

**Source**: Reflexion (Shinn et al., NeurIPS 2023). GPT-3.5-class model achieved 91% on HumanEval (beating GPT-4's 80%) through verifier-gated reflexion.

**Gate**: Verification passed? Or escalated after 3 failures?

### Phase 8: CRITIQUE (Constitutional Checklist)

**Question**: "Does the output satisfy every principle in the constitution?"

**Source**: Constitutional AI (Anthropic, 2022). Principle-anchored critique converts unreliable free-form self-critique into reliable structured critique.

Review the output against this **constitution**:

```
CONSTITUTION:
[ ] CORRECTNESS: Does it produce the same outputs for the same inputs?
[ ] COMPLETENESS: Are all edge cases handled? (empty, null, boundary, large, invalid)
[ ] NO BEHAVIOR CHANGE: (for refactors) Did I change only structure, not behavior?
[ ] NO SPECULATION: Did I avoid adding abstractions/features not demanded by the task?
[ ] NO SILENT FAILURES: Are all errors surfaced (not swallowed)?
[ ] NO AI FAILURE MODES: Run the 14-point AI-FM sweep (references/15-ai-failure-modes.md)
[ ] FOLLOWED THE PLAN: Did I execute the synthesized plan, or did I drift?
[ ] VERIFIABLE: Can a reviewer reproduce my verification?
```

For each unchecked box: **fix it now** or **justify why it's acceptable**.

**Gate**: All 8 constitution items checked or justified?

### Phase 9: REFINE (Self-Refine, Verifier-Gated)

**Question**: "Can I improve this further in 1-2 iterations?"

**Source**: Madaan et al., "Self-Refine" (2023). ~20% improvements when gated on external signal.

**Iteration 1**:

- Re-read the output.
- Identify **one specific, actionable improvement** (not vague "make it better").
- Apply the improvement.
- Re-verify (Phase 7).

**Iteration 2** (if budget allows and iteration 1 improved something):

- Same process.

**Stop conditions** (any one):

- No improvement found → done.
- Verification fails after refinement → revert the refinement.
- 2 iterations completed → done (diminishing returns).

**Gate**: Either no improvements found, or 2 iterations completed with verification passing?

### Phase 10: META-CHECK (Confidence + Residual Risk)

**Question**: "How confident am I, and what's the biggest remaining risk?"

**Source**: DeepSeek-R1's "aha moment" — emergent meta-cognition. Meta-thinking questions force the model to monitor its own reasoning.

```
META-CHECK:
  Confidence: [1-5]
  Top residual risk: [the single most likely way this could still be wrong]
  If confidence < 4:
    → Loop back to Phase 4 (DEBATE) with the residual risk as the new focus
    → Max 1 meta-loop; if still <4 after re-debate, accept and document
  If confidence ≥ 4:
    → Proceed to OUTPUT
```

**Meta-cognitive questions** (use any that apply):

- "What assumption am I making that, if false, invalidates my plan?"
- "What would an expert who disagrees say is the flaw here?"
- "Am I solving the right problem, or am I solving the symptom?"
- "If this breaks in production, what's the most likely cause?"

**Gate**: Confidence ≥4? Or documented acceptance of residual risk?

### Phase 11: OUTPUT (Commit / Report / Deliver)

**Question**: "Is the commit message accurate? Is the report complete?"

Produce the final output:

- **Commit message**: follows conventions (`refactor:`, `fix:`, `test:`, `perf:`, `security:`, `docs:`)
- **Issue log**: any issues noticed but not fixed
- **Progress update**: update PROGRESS.md

**Gate**: Commit message accurate? Issue log complete? PROGRESS.md updated?

---

## Sub-Agent Tournament

**When**: high-stakes decisions (architecture choices, security fixes, critical-path refactors).

**Source**: Best-of-N sampling (OpenAI o1). Mixture-of-Agents (Together AI) — weak models beat GPT-4o with this pattern.

```
TOURNAMENT:
  1. GENERATE: 3-5 candidate solutions, each with a different lens:
     - Candidate A: "correctness-first" approach
     - Candidate B: "simplicity-first" approach
     - Candidate C: "performance-first" approach
     (each generated independently, without seeing the others)

  2. SCORE: rate each candidate on a rubric:
     | Criterion | Weight | Candidate A | Candidate B | Candidate C |
     |-----------|--------|-------------|-------------|-------------|
     | Correctness | 40% | [1-5] | [1-5] | [1-5] |
     | Safety | 30% | [1-5] | [1-5] | [1-5] |
     | Simplicity | 15% | [1-5] | [1-5] | [1-5] |
     | Performance | 15% | [1-5] | [1-5] | [1-5] |
     | TOTAL | 100% | [score] | [score] | [score] |

  3. PROMOTE: highest score wins.
     If top 2 are within 5%: GoT-merge their best elements.

  4. REFINE THE WINNER: apply the critiques generated for the LOSERS.
     (The losers' identified weaknesses become the winner's repair list.)
     This reuses the debate's external signal.

  5. VERIFY: run external verifier on the refined winner.
```

---

## Multi-Agent Debate

**When**: the task is Hard (Phase 1 TRIAGE) or confidence is low after Phase 10.

**Source**: Du et al. (MIT 2023). 3 agents, 2 rounds.

### Implementation (with sub-agent API)

```
Round 1 — Independent Proposals:
  Spawn Agent A (Correctness lens): "Propose a solution. Find logic errors."
  Spawn Agent B (Safety lens): "Propose a solution. Find behavior changes."
  Spawn Agent C (Simplicity lens): "Propose a solution. Find over-engineering."
  Collect all 3 proposals.

Round 2 — Cross-Critique:
  Agent A sees B and C's proposals → critiques them → revises its own.
  Agent B sees A and C's proposals → critiques them → revises its own.
  Agent C sees A and B's proposals → critiques them → revises its own.
  Collect all 3 revised proposals.

Synthesis:
  Judge (main agent) reads all 6 proposals (3 original + 3 revised).
  Merges into one final approach (GoT-merge if complementary).
```

### Implementation (without sub-agent API — in-context simulation)

```
Pass 1: "As a correctness-focused expert, propose a solution and find logic errors."
  → Write output to scratchpad.

Pass 2: "As a safety-focused expert, read the above. Find behavior changes. Propose your solution."
  → Write output to scratchpad.

Pass 3: "As a simplicity-focused expert, read the above. Find over-engineering. Propose your solution."
  → Write output to scratchpad.

Pass 4 (Synthesis): "Read all 3 proposals above. Merge into the best final approach.
  Address every issue raised. Document residual risks."
```

---

## Reflexion Loop (Verifier-Gated)

**When**: Phase 7 (VERIFY) fails.

**Source**: Shinn et al. (NeurIPS 2023). 91% HumanEval with GPT-3.5-class model.

**CRITICAL**: Reflexion only works with **external feedback** (test results, compiler errors). Never do Reflexion without running something external first (Rule 1).

```
ATTEMPT 1:
  → Execute transformation
  → Run verifier (tests/compiler/lint)
  → If PASS: proceed to CRITIQUE
  → If FAIL:
    → Write Failure Note: "Failed because: [specific error]. Adjustment: [specific change]."
    → Re-plan (incorporating the failure note)
    → Re-execute
    → Re-verify

ATTEMPT 2:
  → If FAIL:
    → Write Failure Note: "Failed because: [different root cause — don't repeat the same diagnosis]."
    → Re-plan with a DIFFERENT approach (don't repeat the same fix)
    → Re-execute
    → Re-verify

ATTEMPT 3:
  → If FAIL:
    → ESCALATE to user. Provide all 3 failure notes.
    → Do NOT attempt a 4th time.
```

**Why max 3**: research shows diminishing returns beyond 3 attempts. The model fixates on the same misdiagnosis. Escalation is the correct response.

---

## Tree-of-Thought Exploration

**When**: Phase 3 (EXPLORE) for Hard tasks.

**Source**: Yao et al. (Princeton 2023). Game of 24: 4% → 74%.

```
ToT:
  Root: [the problem]
  ├── Branch 1: [approach A]
  │   ├── Sub-branch 1a: [variation of A]
  │   └── Sub-branch 1b: [variation of A]
  ├── Branch 2: [approach B]
  │   └── Sub-branch 2a: [variation of B]
  └── Branch 3: [approach C]
      └── Sub-branch 3a: [variation of C]

Self-evaluation at each node:
  "Rate this approach's likelihood of success: [1-5]. Justify in 1 sentence."

Prune: discard branches scoring ≤2.
Keep: branches scoring ≥3.
GoT-merge: if two branches have complementary strengths, merge.
```

---

## Constitutional Checklist

**When**: Phase 8 (CRITIQUE).

**Source**: Constitutional AI (Anthropic 2022). Principle-anchored critique works; free-form self-critique doesn't.

```
CONSTITUTION (check every item):
[ ] CORRECTNESS: same inputs → same outputs?
[ ] COMPLETENESS: all edge cases handled? (empty, null, boundary, large, invalid)
[ ] NO BEHAVIOR CHANGE: (refactors) structure only, not behavior?
[ ] NO SPECULATION: no abstractions/features not demanded?
[ ] NO SILENT FAILURES: all errors surfaced?
[ ] NO AI FAILURE MODES: 14-point AI-FM sweep passed?
[ ] FOLLOWED THE PLAN: executed the synthesized plan, not improvised?
[ ] VERIFIABLE: reviewer can reproduce my verification?
```

Each unchecked → fix or justify.

---

## Meta-Cognitive Checkpoint

**When**: Phase 10 (META-CHECK).

**Source**: DeepSeek-R1's "aha moment" — emergent meta-cognition.

**Questions that force deeper reasoning**:

1. "What assumption am I making that, if false, invalidates my plan?"
2. "What would an expert who disagrees say is the flaw here?"
3. "Am I solving the right problem, or the symptom?"
4. "If this breaks in production, what's the most likely cause?"
5. "What's my confidence (1-5)? If <4, what check would raise it?"
6. "State the strongest counterargument to your approach, then rebut it."

**If confidence < 4**: loop back to DEBATE with the residual risk as focus. Max 1 meta-loop.

---

## Adaptive Scaffolding

**When**: Phase 1 (TRIAGE).

**Source**: "Rethinking Multi-Agent Workflow" — scaffolding helps weak models disproportionately.

### Decision Matrix

| Task Difficulty | Strong Model                                                | Weak Model                                          |
| --------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| **Easy**        | Plan → Execute → Verify (skip 3-5, 8-10)                    | Plan → Execute → Verify → Critique (skip 3-5, 9-10) |
| **Medium**      | Plan → Explore → Execute → Verify → Critique (skip 4, 9-10) | FULL 11 phases, 1 debate round, 1 refine            |
| **Hard**        | FULL 11 phases, 1 debate round, 1 refine                    | FULL 11 phases, 2 debate rounds, 2 refine, ToT      |

**Weak model + Hard task = maximum scaffolding**. This is where the Dragon Protocol shines — a weak model with full scaffolding can match a strong model without it.

---

## Research Evidence

| Technique               | Source                    | Key Result                                          |
| ----------------------- | ------------------------- | --------------------------------------------------- |
| Multi-Agent Debate      | Du et al. MIT 2023        | 3 agents + 2 rounds improves reasoning              |
| Mixture-of-Agents       | Together AI 2024          | Weak open models beat GPT-4o (65.1% vs 57.5%)       |
| Reflexion               | Shinn et al. NeurIPS 2023 | GPT-3.5-class beats GPT-4 on HumanEval (91% vs 80%) |
| Tree-of-Thought         | Yao et al. Princeton 2023 | Game of 24: 4% → 74% (18× improvement)              |
| Graph-of-Thought        | Besta et al. AAAI 2024    | Merging reasoning branches improves over ToT        |
| Plan-and-Solve          | Wang et al. ACL 2023      | Reduces skipped steps vs zero-shot CoT              |
| Constitutional AI       | Anthropic 2022            | Principle-anchored self-correction works            |
| DeepSeek-R1             | Nature 2025               | Pure RL elicits reasoning; "aha moment"             |
| Self-Refine             | Madaan et al. 2023        | ~20% improvement with verifier-gated refinement     |
| LLMs Can't Self-Correct | Huang et al. ICLR 2024    | Self-critique WITHOUT external signal degrades      |
| Best-of-N / o1          | OpenAI 2024               | Test-time compute scaling law                       |

---

## Summary

The Dragon Protocol is the **ultimate reasoning engine**. It makes any model — even the cheapest — reason like a frontier model by:

1. **Never self-correcting without external signal** (Rule 1 — Huang et al.)
2. **Earning the output through verification** (Rule 2 — DeepSeek-R1)
3. **Scaling scaffolding to weakness + difficulty** (Rule 3 — adaptive)
4. **Running 11 phases**: TRIAGE → PLAN → EXPLORE → DEBATE → SYNTHESIZE → EXECUTE → VERIFY → CRITIQUE → REFINE → META-CHECK → OUTPUT
5. **Using sub-agent tournaments** for high-stakes decisions (Best-of-N + judge)
6. **Using multi-agent debate** for external feedback (3 lens-diverse agents)
7. **Using verifier-gated Reflexion** for error correction (max 3 attempts)
8. **Using Tree-of-Thought** for hard sub-problems (18× improvement)
9. **Using constitutional checklists** for structured critique
10. **Using meta-cognitive checkpoints** for confidence assessment

**The result**: a weak model with the Dragon Protocol approximates a frontier model. The Mixture-of-Agents result (weak models beating GPT-4o) and Reflexion result (GPT-3.5 beating GPT-4 on HumanEval) are the existence proofs.
