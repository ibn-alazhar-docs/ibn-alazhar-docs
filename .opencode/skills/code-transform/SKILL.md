---
name: code-transform
description: "Transform ANY application into its best version — architecture, database, UI/UX, testing, security, performance, documentation — even with weak/cheap models and small context windows. Use when the user says 'make this app perfect', 'improve this codebase', 'audit this project', 'fix this app', 'restructure this application', 'clean up this project', or wants comprehensive improvement across multiple dimensions. Handles web, mobile, full-stack, monolith, or microservices, small or massive codebases. Three modes: AUDIT (assess and report), TRANSFORM (fix specific issues), PERFECT (audit → plan → transform multi-session). Do NOT use for single-step refactoring (use the refactor skill), adding single features, or quick fixes."
metadata:
  version: "8.1.0"
  author: "code-transform-skill"
  last-updated: "2026-06-26"
license: "Complete terms in LICENSE.txt"
---

# Code Transform — Make Any Codebase Perfect

> **Mission.** Take ANY application — small or massive, new or legacy, web or mobile, monolith or microservices — and transform it to its best version across ALL dimensions: architecture, database, UI/UX, testing, security, performance, code quality, DevOps, documentation, and full-stack coordination. Works with weak/cheap models and small context windows through progressive disclosure, decision trees, and artifact persistence.

> **Be aggressive about improvement; uncompromising about safety.** Move whole modules to their correct layer, split god classes, add missing tests, fix security holes, optimize queries, improve UI structure — but verify every change and never break working behavior without explicit intent.

> **Commit every step.** Each transformation is its own commit: transform → verify → commit, then the next.

## ⚠️ The Dragon Protocol (MANDATORY — Read `references/19-dragon-protocol.md`)

The Dragon Protocol is the **ultimate reasoning engine**. It makes ANY model — even the cheapest, weakest — reason like a frontier model. Based on 25+ research papers including DeepSeek-R1 (Nature 2025), Reflexion (NeurIPS 2023), Multi-Agent Debate (MIT 2023), and Mixture-of-Agents (Together AI 2024).

### The 3 Non-Negotiable Rules

1. **NEVER self-correct without external signal.** (Huang et al. ICLR 2024) — self-critique WITHOUT external feedback degrades performance. Every critique MUST ingest a test result, compiler error, or another agent's output.
2. **Verification earns the output.** (DeepSeek-R1) — self-verification is a terminal gate, not optional. You may NOT produce output until verification passes.
3. **Scale scaffolding to weakness + difficulty.** — weak models need maximum scaffolding; strong models need less. Triage first.

### The 11-Phase Dragon Protocol (runs BEFORE every decision)

```
 1. TRIAGE      → Classify difficulty (easy/medium/hard); set thinking-budget
 2. PLAN        → Extract variables; list subtasks; list edge cases; verification + rollback plan
 3. EXPLORE     → ToT: generate 3 candidate approaches; self-score (1-5); keep top 1-2
 4. DEBATE      → 3 lens-diverse agents (Correctness/Safety/Simplicity) propose + cross-critique
 5. SYNTHESIZE  → Judge merges surviving proposals (GoT-merge if complementary) into one plan
 6. EXECUTE     → Carry out the plan; produce the artifact (diff, test, fix)
 7. VERIFY      → Run external verifier (tests/compiler/lint). If fail → REFLEXION (max 3)
 8. CRITIQUE    → Constitutional checklist (8 principles). Each checked or justified.
 9. REFINE      → 1-2 Self-Refine iterations (verifier-gated). Stop if no improvement.
10. META-CHECK  → Confidence rating (1-5) + name top residual risk. If <4 → re-DEBATE (max 1 loop).
11. OUTPUT      → Commit / report / deliver.
```

### Adaptive Scaffolding (Phase 1 TRIAGE decides depth)

| Task       | Strong Model                                 | Weak Model                                     |
| ---------- | -------------------------------------------- | ---------------------------------------------- |
| **Easy**   | Plan → Execute → Verify                      | Plan → Execute → Verify → Critique             |
| **Medium** | Plan → Explore → Execute → Verify → Critique | FULL 11 phases, 1 debate round                 |
| **Hard**   | FULL 11 phases, 1 debate round               | FULL 11 phases, 2 debate rounds, 2 refine, ToT |

### Sub-Agent Tournament (for high-stakes decisions)

```
1. GENERATE: 3 candidates (correctness-first, simplicity-first, performance-first)
2. SCORE: rubric (correctness 40%, safety 30%, simplicity 15%, performance 15%)
3. PROMOTE: highest score wins. If top 2 within 5% → GoT-merge.
4. REFINE WINNER: apply losers' critiques to the winner
5. VERIFY: run external verifier
```

### Reflexion Loop (Phase 7 VERIFY fails)

```
Attempt 1: Execute → Verify → FAIL → Failure Note → Re-plan → Re-execute → Re-verify
Attempt 2: FAIL → Different Failure Note → Different approach → Re-execute → Re-verify
Attempt 3: FAIL → ESCALATE to user with all 3 failure notes. DO NOT attempt a 4th.
```

### Meta-Cognitive Questions (Phase 10)

- "What assumption am I making that, if false, invalidates my plan?"
- "What would an expert who disagrees say is the flaw here?"
- "If this breaks in production, what's the most likely cause?"
- "State the strongest counterargument, then rebut it."
- "Confidence (1-5)? If <4, what check would raise it?"

## Mode Selection (DECIDE FIRST)

Three modes, chosen based on what the user wants:

| User says                                                   | Mode          | What happens                                            |
| ----------------------------------------------------------- | ------------- | ------------------------------------------------------- |
| "audit this", "review this", "assess this", "what's wrong?" | **AUDIT**     | Multi-dimensional assessment → report (NO code changes) |
| "fix this", "improve this", "refactor this", "clean up"     | **TRANSFORM** | Apply specific transformations with safety gates        |
| "make this perfect", "improve everything", "fix this app"   | **PERFECT**   | AUDIT → prioritize → TRANSFORM across multiple sessions |

**If unsure**: ask the user. "Do you want a full audit report, or should I fix specific issues, or make everything perfect?"

## The Perfect Workflow (PERFECT mode)

```
PHASE -1: MEMORY LOAD → Read PROGRESS.md + BLUEPRINT.md (resumed sessions only)
PHASE 0: CENSUS    → Profile the codebase (files, lines, languages, dependencies)
PHASE 1: AUDIT     → Multi-dimensional assessment (10 dimensions, each in its own context window)
PHASE 2: PRIORITIZE → Severity × Effort × Risk matrix → batch into sessions
PHASE 3: EXECUTE   → Named transformations, one per commit, verified
PHASE 4: VERIFY    → Re-audit, compare metrics, generate final report
```

### Phase −1: MEMORY LOAD (resumed sessions only)

Before anything else in a resumed PERFECT-mode session:

1. Read `PROGRESS.md` — what was completed last session?
2. Read `BLUEPRINT.md` — what's next?
3. Run `git log --oneline -10` — what was committed recently?
4. State in 3 sentences: (a) what was done, (b) what's next, (c) any open Failure Notes.
5. If no `PROGRESS.md` exists, this is a new session — skip to Phase 0.

**Why**: Claude Fable 5 research shows persistent file-based memory improves performance **3×**. Re-ingesting artifacts at session start eliminates re-auditing completed work.

### Note: Dragon Protocol vs 8-Phase Refactor Workflow

The **Dragon Protocol** (ref 19) is the OUTER reasoning loop — run once per DECISION. The **8-phase refactor workflow** (RECON→TRIAGE→BLUEPRINT→SAFETY→EXECUTE→VERIFY→CRITIQUE→REPORT) is the INNER per-transformation execution loop — run once per COMMIT. They compose:

```
Dragon TRIAGE → Dragon PLAN → Dragon EXPLORE → Dragon DEBATE → Dragon SYNTHESIZE
  → [8-phase: RECON → TRIAGE → BLUEPRINT → SAFETY → EXECUTE → VERIFY → CRITIQUE → REPORT]
→ Dragon META-CHECK → Dragon OUTPUT
```

## Phase 0 — CENSUS (Profile the Codebase)

Before any audit, profile the codebase to understand what you're working with.

**Steps**:

1. Count files: `find . -type f -name "*.py" -o -name "*.ts" -o -name "*.js" | wc -l`
2. Count lines: `find . -name "*.py" | xargs wc -l | tail -1`
3. Identify languages: `find . -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10`
4. Identify framework: check `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `pubspec.yaml`
5. Check for tests: count test files, run test suite if possible
6. Check for git: `git log --oneline | wc -l` for history depth

**Output**: `CODEBASE_PROFILE.md` with: total files, total lines, languages, framework(s), test coverage estimate, git history depth, recommended audit dimensions.

**For massive codebases (>50 files)**: require the user to scope down. "This codebase has 200 files. I recommend starting with the [X] module. Should I proceed with that, or audit everything (will take multiple sessions)?"

## Phase 1 — AUDIT (10 Dimensions)

Each dimension is assessed in its own context window. Results are saved to `AUDIT_REPORT.md`. Load only the reference file for the current dimension.

### Dimension 1: Architecture

**Load**: `references/01-architecture-audit.md`
**Check**: Layer violations, dependency direction, DDD compliance, bounded contexts, aggregate design. Does the domain layer import external dependencies? Are services doing business logic or just orchestration?

### Dimension 2: Database

**Load**: `references/02-database-audit.md`
**Check**: Normalization (1NF-BCNF), indexing (every FK indexed?), N+1 queries, migration safety (expand/contract), connection pooling, schema design.

### Dimension 3: Testing

**Load**: `references/03-testing-audit.md`
**Check**: Test pyramid health (70/20/10), coverage gaps, test quality (mutation score), test smells (brittle, flaky, overspecified), missing edge cases.

### Dimension 4: Security

**Load**: `references/04-security-audit.md`
**Check**: OWASP Top 10, input validation at boundaries, auth/authz patterns, secrets in code/logs, SQL injection, XSS, CSRF, dependency vulnerabilities.

### Dimension 5: Performance

**Load**: `references/05-performance-audit.md`
**Check**: Hotspots (churn × complexity), N+1 queries, missing indexes, bundle size (frontend), memory leaks, unnecessary re-renders, slow algorithms.

### Dimension 6: UI/UX Code

**Load**: `references/06-uiux-audit.md`
**Check**: Component structure (Atomic Design), design system compliance, accessibility (WCAG), state management, prop drilling, component size, co-location.

### Dimension 7: Code Quality

**Load**: `references/07-code-quality-audit.md`
**Check**: Code smells (30+ catalog), cognitive complexity (≤15), naming, duplication, dead code, magic numbers, deep nesting, long methods.

### Dimension 8: DevOps

**Load**: `references/08-devops-audit.md`
**Check**: CI/CD pipeline quality, IaC usage, deployment safety (zero-downtime), health checks, observability (logging/metrics/tracing), secrets management.

### Dimension 9: Documentation

**Load**: `references/09-documentation-audit.md`
**Check**: ADRs for significant decisions, API documentation (OpenAPI/Swagger), README quality, inline comments (WHY not WHAT), architecture diagrams.

### Dimension 10: Full-Stack Coordination

**Load**: `references/10-fullstack-audit.md`
**Check**: API contract (schema-first?), type sharing between frontend/backend, contract testing, versioning strategy, error format consistency.

### Audit Output Format

Each dimension produces a section in `AUDIT_REPORT.md`:

```markdown
## Dimension N: [Name]

**Findings**: [count]
**Critical**: [count] | **High**: [count] | **Medium**: [count] | **Low**: [count]

### Critical Issues

- **[D1-C1]** `file:line` — [issue] → [suggested fix]

### High Issues

- **[D1-H1]** `file:line` — [issue] → [suggested fix]

### Summary

[1-2 sentence assessment of this dimension]
```

## ⚠️ Agent Orchestration (for >10 files — see `references/18-agent-orchestration.md`)

For large codebases, DON'T try to audit everything in one context window. **Spawn sub-agents** — one per dimension — each with a specific scope and checklist. They report findings; the orchestrator synthesizes.

### When to Orchestrate

- **>10 files**: orchestrate (spawn 8 audit agents in parallel)
- **<10 files**: single-pass (one agent, one dimension at a time)

### Orchestration Pattern

```
ORCHESTRATOR (you)
  ├── Spawn Agent 1: Architecture Auditor (parallel)
  ├── Spawn Agent 2: Security Auditor (parallel)
  ├── Spawn Agent 3: Database Auditor (parallel)
  ├── Spawn Agent 4: Testing Auditor (parallel)
  ├── Spawn Agent 5: Performance Auditor (parallel)
  ├── Spawn Agent 6: UI/UX Auditor (parallel)
  ├── Spawn Agent 7: Code Quality Auditor (parallel)
  ├── Spawn Agent 8: DevOps Auditor (parallel)
  │
  ├── Collect all 8 reports
  ├── SYNTHESIS: merge → cross-reference → prioritize
  └── Generate BLUEPRINT.md
```

### Agent Rules

- Each agent: **specific scope, specific checklist, report-only** (NO code changes)
- Each agent runs the **5-Pass Thinking Protocol** on its findings
- Orchestrator: **cross-references** findings (architecture violation + security issue = compound risk)
- Execution: **sequential** (one transformation per commit), NOT parallel

### Agent Prompt Template

```
Task: Audit [DIMENSION] of this codebase.
Scope: [specific files/directories]
Check: [checklist from references/0N-*.md]
Output: findings list with file:line, severity, suggested fix.
Run the 5-Pass Thinking Protocol on your findings.
Do NOT edit code. Report only.
```

---

## Phase 2 — PRIORITIZE

Load the complete `AUDIT_REPORT.md`. Apply the prioritization matrix:

| Severity    | Effort | Priority                 | Action                      |
| ----------- | ------ | ------------------------ | --------------------------- |
| Critical    | Low    | **P0 — Immediate**       | Fix in current session      |
| Critical    | High   | **P1 — Urgent**          | Schedule next session       |
| High        | Low    | **P2 — Quick Win**       | Fix in current session      |
| High        | High   | **P3 — Strategic**       | Plan dedicated session      |
| Medium      | Low    | **P4 — When convenient** | Batch with other quick wins |
| Medium/High | High   | **P5 — Backlog**         | Log for future              |

**Output**: `BLUEPRINT.md` with:

- P0 items (fix NOW)
- P1 items (next session)
- P2 items (quick wins, batch them)
- P3 items (strategic, dedicated sessions)
- P4-P5 items (backlog)

## Phase 3 — EXECUTE (Transformations)

For each transformation, follow the proven 8-phase workflow from the `refactor` skill:

```
RECON → TRIAGE → BLUEPRINT → SAFETY → EXECUTE → VERIFY → CRITIQUE → REPORT
```

**Key rules** (from refactor skill v6.0):

1. **Name every transformation** (Fowler refactoring OR improvement type)
2. **Output as diff** (never whole-file rewrite)
3. **One transformation per commit**
4. **Verify after every step** (compiler, tests, linter)
5. **Self-critique** (≥3 hostile objections)
6. **AI-FM sweep** (14 LLM failure modes)
7. **Commit with descriptive message** (`refactor:`, `fix:`, `test:`, `perf:`, `docs:`)

**For non-refactoring transformations** (bug fixes, test writing, security fixes):

- `fix:` for bug fixes (behavior change, intentional)
- `test:` for adding missing tests
- `perf:` for performance improvements
- `security:` for security fixes
- `docs:` for documentation
- `refactor:` for behavior-preserving structural changes

**Update `PROGRESS.md`** after each session:

```markdown
## Session [N] — [Date]

**Completed**: [list of transformations]
**Verified by**: [compiler/tests/linter/security scan]
**Remaining**: [next session's items from BLUEPRINT.md]
```

## Phase 4 — VERIFY (Final Report + Self-Improvement)

After all transformations:

1. Re-run the 10-dimension audit
2. Compare before/after metrics
3. Generate `FINAL_REPORT.md` (see `assets/final_report_template.md`)

### Self-Improvement Pass (PERFECT mode, multi-session only)

After generating FINAL_REPORT.md, if this was a multi-session PERFECT run:

1. Review all Failure Notes from `PROGRESS.md` across all sessions.
2. Identify patterns: "3 failures were caused by missing edge-case tests → add 'test boundary cases' to the testing checklist."
3. Propose 1-3 updates to `BLUEPRINT.md` or transformation recipes for future sessions.
4. Write proposals to `SELF_IMPROVEMENT_PROPOSALS.md`. Do NOT auto-apply — user reviews and approves.

**Why**: Research (arXiv 2504.15228, "Self-Improving Coding Agent", NeurIPS 2025; Sakana Darwin Gödel Machine) shows agents that learn from their own failures improve performance 17% → 53% on SWE-bench. Our Reflexion loop handles per-attempt learning; this pass handles cross-session learning.

```markdown
# Code Transform — Final Report

## Summary

[1-paragraph summary of what was done]

## Before/After Metrics

| Dimension    | Before                     | After             | Improvement |
| ------------ | -------------------------- | ----------------- | ----------- |
| Architecture | [violations]               | [violations]      | [-N]        |
| Database     | [issues]                   | [issues]          | [-N]        |
| Testing      | [coverage%]                | [coverage%]       | [+N%]       |
| Security     | [vulnerabilities]          | [vulnerabilities] | [-N]        |
| Performance  | [hotspots]                 | [hotspots]        | [-N]        |
| Code Quality | [cognitive complexity avg] | [avg]             | [-N]        |

## What Was Done

[Per-dimension summary of transformations applied]

## Remaining Issues

[Items logged for future (P4-P5 from BLUEPRINT.md)]

## ADRs Generated

[List of Architecture Decision Records created during transformation]
```

## Handling Massive Codebases with Small Context Windows

**The key insight**: you don't need to read the entire codebase to transform it. You need:

1. **The target files** (what you're changing)
2. **Their direct callers** (what depends on them)
3. **Their direct callees** (what they depend on)
4. **The API contract** (if full-stack)

**Techniques** (see `references/11-context-management.md`):

- **Sampling RECON**: read entry points fully, signatures only of transitive code
- **Grep-first navigation**: `git grep` for callers before reading files
- **One dimension per context window**: don't mix architecture audit with security audit
- **Artifact persistence**: findings saved to disk, loaded as summaries
- **Context summarization**: after reading a file, summarize in 3 sentences, don't re-read

**For >50 files**: require the user to scope down. Suggest the highest-priority module.

## Weak Model Optimization

This skill is designed to work with weak/cheap models (GPT-4o-mini, Haiku, DeepSeek, Qwen):

1. **Decision trees, not judgment calls**: every ambiguous decision is a yes/no tree
2. **One dimension per context window**: don't overload the model
3. **Binary verification**: compiler pass/fail, test pass/fail — not "does this look good?"
4. **Explicit step-by-step instructions**: "Step 1: Read the file. Step 2: Check if X. Step 3: If yes, do Y."
5. **2-3 worked examples**: before asking for new work, show examples
6. **Load one reference at a time**: the routing table tells you which reference to load
7. **Artifact persistence**: PROGRESS.md carries context across sessions
8. **≤5-step procedures**: each step produces a verifiable artifact

## Tool Use

- **Read** to read files (never `cat`).
- **Grep** to find callers/references (never bash `grep`).
- **Edit** to make changes (never rewrite whole files).
- **Bash** for git + tests/builds + running audit scripts.
- **Bundled scripts** (see below).
- **Bundled assets** (templates for reports).

## Bundled Scripts

| Script                                | When                         | Purpose                                                                          |
| ------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `scripts/codebase_census.sh`          | Phase 0 (CENSUS)             | Profile the codebase (files, lines, languages)                                   |
| `scripts/detect_smells.py`            | Phase 1 Dim 7 (Code Quality) | Detect 30+ smells mechanically                                                   |
| `scripts/cognitive_complexity.py`     | Phase 1 Dim 7                | Calculate cognitive complexity (Python)                                          |
| `scripts/layer_violation_detector.py` | Phase 1 Dim 1 (Architecture) | Check dependency direction                                                       |
| `scripts/verify_behavior.sh`          | Phase 3 (EXECUTE)            | Type-check + tests + lint → SUCCESS/FAILURE                                      |
| `scripts/audit_orchestrate.sh`        | Phase 1 (AUDIT)              | Run all audit scripts → unified report                                           |
| `scripts/behavior_snapshot.sh`        | Phase 3 (VERIFY)             | Golden-master: capture test output before/after, diff to detect behavior changes |
| `scripts/layer_violation_detector.py` | Phase 1 Dim 1 (Architecture) | Check dependency direction (service must not import controller)                  |

## Bundled Assets

| Asset                             | When    | Purpose                                      |
| --------------------------------- | ------- | -------------------------------------------- |
| `assets/audit_report_template.md` | Phase 1 | Template for AUDIT_REPORT.md                 |
| `assets/blueprint_template.md`    | Phase 2 | Template for BLUEPRINT.md (prioritized plan) |
| `assets/progress_template.md`     | Phase 3 | Template for PROGRESS.md (session log)       |
| `assets/final_report_template.md` | Phase 4 | Template for FINAL_REPORT.md                 |
| `assets/adr_template.md`          | Any     | Architecture Decision Record template        |
| `assets/diff_template.md`         | Phase 3 | Unified diff output format                   |

## References (load on demand)

| File                                      | When to load               | Topic                                                                         |
| ----------------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `references/01-architecture-audit.md`     | Dim 1: Architecture        | Layering, DDD, dependency rules                                               |
| `references/02-database-audit.md`         | Dim 2: Database            | Normalization, indexes, N+1, migrations                                       |
| `references/03-testing-audit.md`          | Dim 3: Testing             | Pyramid, coverage, mutation, characterization                                 |
| `references/04-security-audit.md`         | Dim 4: Security            | OWASP, auth, validation, secrets                                              |
| `references/05-performance-audit.md`      | Dim 5: Performance         | Hotspots, queries, bundle, memory                                             |
| `references/06-uiux-audit.md`             | Dim 6: UI/UX               | Components, design system, WCAG, state                                        |
| `references/07-code-quality-audit.md`     | Dim 7: Code Quality        | Smells, complexity, naming, duplication                                       |
| `references/08-devops-audit.md`           | Dim 8: DevOps              | CI/CD, IaC, deployment, observability                                         |
| `references/09-documentation-audit.md`    | Dim 9: Documentation       | ADRs, API docs, README, inline                                                |
| `references/10-fullstack-audit.md`        | Dim 10: Full-Stack         | API contract, type sharing, coordination                                      |
| `references/11-context-management.md`     | Large codebases            | Sampling RECON, progressive disclosure, summarization                         |
| `references/12-debugging-methodology.md`  | Bug fixing                 | Scientific debugging, RCA, hypothesis trees                                   |
| `references/13-mobile-patterns.md`        | Mobile apps                | iOS/Android/RN/Flutter architecture                                           |
| `references/14-transformation-recipes.md` | Phase 3 (EXECUTE)          | 27 Fowler recipes + improvement recipes                                       |
| `references/15-ai-failure-modes.md`       | Phase 3 (CRITIQUE)         | 14 LLM-specific failure modes                                                 |
| `references/16-multi-model-guide.md`      | Cross-model                | Per-model guidance (Claude/GPT/Qwen/GLM/DeepSeek)                             |
| `references/17-deep-thinking-protocol.md` | No sub-agent API available | Lightweight 5-pass fallback (use Dragon Protocol if sub-agents available)     |
| `references/18-agent-orchestration.md`    | >10 files                  | Sub-agent coordination, 8 audit agents, synthesis protocol                    |
| `references/19-dragon-protocol.md`        | BEFORE EVERY DECISION      | 11-phase reasoning engine: ToT, debate, tournament, reflexion, meta-cognition |

## Quick Reference

```
DRAGON     → 11 phases: TRIAGE→PLAN→EXPLORE→DEBATE→SYNTHESIZE→EXECUTE→VERIFY→CRITIQUE→REFINE→META-CHECK→OUTPUT
RULE 1     → NEVER self-correct without external signal (tests/compiler/other agents)
RULE 2     → Verification earns the output (terminal gate, not optional)
RULE 3     → Scale scaffolding to weakness + difficulty (triage first)
TOURNAMENT → 3 candidates → rubric score → promote best → refine with losers' critiques
REFLEXION  → Verify fails → Failure Note → re-plan → re-execute → max 3 → escalate
CENSUS     → Profile the codebase. Files, lines, languages, framework.
AUDIT      → 10 dimensions (or spawn 8 agents for >10 files). Save to AUDIT_REPORT.md.
PRIORITIZE → Severity × Effort × Risk → P0 (immediate) to P5 (backlog).
EXECUTE    → Named transform → diff → verify → AI-FM → critique → behavior surface → commit.
VERIFY     → Re-audit. Compare metrics. Generate FINAL_REPORT.md + ADRs.
```

**Forget everything else, remember this**:

1. **Dragon Protocol** — 11 phases before every decision. TRIAGE decides depth.
2. **Never self-correct without external signal** — every critique needs a test/compiler/agent.
3. **Verification earns the output** — no output until verification passes.
4. **Sub-agent tournament** — 3 candidates compete, rubric scores, best wins, losers' critiques refine winner.
5. **Reflexion loop** — max 3 attempts with Failure Notes, then escalate.
6. **Meta-cognition** — confidence rating + residual risk. If <4, re-debate.
7. **Audit 10 dimensions** — one per context window, or spawn 8 agents.
8. **Name every transformation** — Fowler recipe or improvement type.
9. **Output diffs, never rewrites** — one transformation per commit.
10. **Persist artifacts** — AUDIT_REPORT.md, BLUEPRINT.md, PROGRESS.md, FINAL_REPORT.md.
