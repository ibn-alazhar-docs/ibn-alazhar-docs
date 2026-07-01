# Agent Orchestration — Sub-Agent Coordination for Maximum Depth

> Read this when the project is large enough that a single pass can't cover everything. Spawn sub-agents for different dimensions, then synthesize their findings. This is how you "flip everything in the project."

## Table of Contents

1. [When to Orchestrate Agents](#when-to-orchestrate-agents)
2. [The Orchestration Pattern](#the-orchestration-pattern)
3. [Agent Roles](#agent-roles)
4. [Synthesis Protocol](#synthesis-protocol)
5. [Parallel vs Sequential](#parallel-vs-sequential)

---

## When to Orchestrate Agents

**Use agent orchestration when**:

- The codebase has >10 files (one agent can't hold it all in context)
- Multiple dimensions need auditing (architecture + security + testing + performance)
- The user said "make everything perfect" (needs comprehensive coverage)
- You have access to a Task tool that can spawn sub-agents

**Don't orchestrate when**:

- The codebase is <5 files (one pass is sufficient)
- Only one dimension needs auditing
- You don't have sub-agent capability (work sequentially instead)

---

## The Orchestration Pattern

```
                    ┌─────────────────────┐
                    │   ORCHESTRATOR      │
                    │   (you, the main    │
                    │    agent)           │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐
    │ ARCHITECTURE   │ │ SECURITY   │ │ PERFORMANCE  │
    │ AGENT          │ │ AGENT      │ │ AGENT        │
    │                │ │            │ │              │
    │ Audits:        │ │ Audits:    │ │ Audits:      │
    │ - Layering     │ │ - OWASP    │ │ - Hotspots   │
    │ - DDD          │ │ - Auth     │ │ - Queries    │
    │ - Dependencies │ │ - Secrets  │ │ - Bundle     │
    └────────┬───────┘ └─────┬──────┘ └──────┬───────┘
             │               │               │
    ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐
    │ TESTING       │ │ DATABASE   │ │ UI/UX        │
    │ AGENT         │ │ AGENT      │ │ AGENT        │
    └────────┬──────┘ └─────┬──────┘ └──────┬───────┘
             │               │               │
             └───────────────┼───────────────┘
                              │
                    ┌─────────▼───────────┐
                    │   SYNTHESIS         │
                    │   (orchestrator     │
                    │    merges findings) │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   BLUEPRINT.md      │
                    │   (prioritized plan)│
                    └─────────────────────┘
```

---

## Agent Roles

Each agent has a specific scope. They don't overlap. They don't edit code — they only audit and report.

### Agent 1: Architecture Auditor

```
Task: Audit the architecture of this codebase.
Scope: services/, repositories/, controllers/, models/, domain/
Check:
  - Layer violations (service importing I/O)
  - Dependency direction (inner layers importing outer)
  - DDD compliance (bounded contexts, aggregates)
  - God classes (>300 lines, >10 methods)
  - Circular dependencies
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

### Agent 2: Security Auditor

```
Task: Audit security of this codebase.
Scope: auth/, controllers/, middleware/, config/, all files with SQL/inputs
Check:
  - OWASP Top 10
  - SQL injection (string concatenation in queries)
  - XSS (unescaped output)
  - Auth/authz (missing checks, IDOR)
  - Secrets in code/logs
  - Input validation at boundaries
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

### Agent 3: Database Auditor

```
Task: Audit database design and queries.
Scope: migrations/, schema files, repositories/, ORM models
Check:
  - Normalization (1NF-BCNF)
  - Missing indexes on foreign keys
  - N+1 query patterns
  - SELECT * usage
  - Migration safety (expand/contract)
  - Connection pooling
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

### Agent 4: Testing Auditor

```
Task: Audit test coverage and quality.
Scope: tests/, test config
Check:
  - Test pyramid health (unit/integration/E2E ratio)
  - Coverage gaps (untested public functions)
  - Test quality (brittle, flaky, overspecified)
  - Missing edge cases (empty, null, boundary)
  - Test independence
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

### Agent 5: Performance Auditor

```
Task: Audit performance.
Scope: hot-path files, queries, frontend bundle, loops
Check:
  - Hotspots (churn × complexity)
  - N+1 queries
  - Missing indexes
  - O(n²) algorithms where O(n) is possible
  - Frontend bundle size
  - Memory leak patterns (unclosed resources, growing caches)
  - Unnecessary re-renders
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

### Agent 6: UI/UX Auditor

```
Task: Audit frontend code organization and accessibility.
Scope: frontend/, components/, styles/, design tokens
Check:
  - Component size (>200 lines = extract)
  - Design system compliance (hardcoded colors/spacing)
  - Accessibility (WCAG: alt text, labels, contrast, keyboard nav)
  - State management (server state vs client state)
  - Prop drilling (>2 levels)
  - Loading/error states
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

### Agent 7: Code Quality Auditor

```
Task: Audit code quality.
Scope: ALL source files (one at a time)
Check:
  - Run scripts/detect_smells.py
  - Run scripts/cognitive_complexity.py (Python)
  - Code smells (30+ catalog)
  - Magic numbers
  - Dead code
  - Naming quality
  - Duplication
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

### Agent 8: DevOps Auditor

```
Task: Audit DevOps infrastructure.
Scope: .github/, Dockerfile, docker-compose, terraform/, Makefile
Check:
  - CI pipeline completeness (lint, test, build, security scan)
  - IaC usage (Terraform/Pulumi vs clickops)
  - Deployment safety (zero-downtime, rollback)
  - Health checks
  - Observability (logging, metrics, tracing)
  - Secrets management
Output: findings list with file:line, severity, suggested fix.
Do NOT edit code. Report only.
```

---

## Synthesis Protocol

After all agents report, the orchestrator synthesizes:

### Step 1: Merge Findings

Collect all findings from all agents into a single list. Deduplicate (the same issue may be found by multiple agents).

### Step 2: Cross-Reference

Look for findings that interact:

- An architecture violation (service doing DB access) + a security issue (SQL injection in that DB access) = compound risk
- A missing test + a complex function = high regression risk
- A performance hotspot + high churn = bug predictor

### Step 3: Prioritize

Apply the priority matrix:

- P0 (Critical + Low effort) = fix immediately
- P1 (Critical + High effort) = next session
- P2 (High + Low effort) = quick win
- P3 (High + High effort) = strategic
- P4-P5 = backlog

### Step 4: Generate BLUEPRINT.md

Write the prioritized plan with:

- Session-by-session breakdown
- Dependencies between transformations
- Verification strategy per transformation
- Risk assessment per transformation

### Step 5: Assign to Execution Agents (optional)

For execution, spawn agents per batch:

- Agent A: fix all P0 security issues
- Agent B: fix all P0 architecture issues
- Agent C: fix all P2 quick wins
  Each execution agent follows the 5-pass protocol + verification loop.

---

## Parallel vs Sequential

### Parallel (preferred for audit)

Spawn all audit agents simultaneously. Each is independent. Collect results when all complete.

**When**: Phase 1 (AUDIT). All dimensions are independent.

### Sequential (required for execution)

Execute transformations one at a time. Each depends on the previous (baseline shifts after each commit).

**When**: Phase 3 (EXECUTE). Transformations must be sequential (one per commit).

### Mixed (for large projects)

- Phase 1 (AUDIT): parallel — spawn 8 agents, collect 8 reports
- Phase 2 (PRIORITIZE): sequential — one orchestrator merges and prioritizes
- Phase 3 (EXECUTE): sequential — one agent at a time, with verification between each

---

## Orchestration Checklist

```
[ ] Codebase census complete (files, lines, languages)
[ ] Decision: orchestrate (>10 files) or single-pass (<10 files)?
[ ] If orchestrate:
    [ ] Spawn audit agents (one per dimension, parallel)
    [ ] Each agent: scope, checklist, output format
    [ ] Collect all agent reports
    [ ] Synthesize: merge, cross-reference, prioritize
    [ ] Generate BLUEPRINT.md
    [ ] Execute: sequential, one transformation per commit
    [ ] Verify after each: compiler, tests, AI-FM, critique
    [ ] Update PROGRESS.md after each session
[ ] If single-pass:
    [ ] Run 5-pass thinking protocol
    [ ] One dimension at a time, one file at a time
    [ ] Verify after each step
```

---

## Summary

- **Orchestrate when**: >10 files, multiple dimensions, "make everything perfect"
- **8 audit agents**: architecture, security, database, testing, performance, UI/UX, code quality, DevOps
- **Each agent**: specific scope, specific checklist, report-only (no code changes)
- **Synthesis**: merge → cross-reference → prioritize → BLUEPRINT.md
- **Parallel for audit** (dimensions are independent), **sequential for execution** (each commit shifts baseline)
- **Execution agents** follow the 5-pass protocol + verification loop from `references/17-deep-thinking-protocol.md`
