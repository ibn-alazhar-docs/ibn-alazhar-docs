# SYSTEM.md — Ibn Al-Azhar Docs Runtime Operating System

> **Purpose:** Top-level entry point for the AI engineering runtime.
> **Scope:** `.opencode/` directory only.
> **Audience:** AI agents, human engineers, review tools.

---

## What This Is

This is the runtime layer for **Ibn Al-Azhar Docs — ابن الأزهر دوكس**. It provides:

- **Docs-first development** — specs and docs drive implementation, not the reverse.
- **Spec-driven execution** — every feature starts as a spec, passes gate review, then gets built.
- **Phase-gated implementation** — no code ships without passing the phase gate.
- **Multi-agent orchestration** — specialized agents handle architecture, security, QA, RTL, design, and docs.
- **Model routing** — different tasks route to different models based on capability.
- **Persistent memory** — project state, decisions, brand rules, and constraints survive across sessions.
- **Docker-first workflows** — all local development runs in containers.
- **Arabic-first / RTL-first** — the default language is Arabic, the default direction is RTL.

---

## Directory Structure

```
.opencode/
├── SYSTEM.md                  ← This file. Runtime entry point.
├── PROJECT_RUNTIME.md         ← Project-specific runtime context.
├── RUNTIME_MANIFESTO.md       ← Principles governing this runtime.
├── EXECUTION_ENGINE.md        ← How work gets done.
├── BOOT_SEQUENCE.md           ← Session startup lifecycle.
├── REVIEW_PIPELINE.md         ← Review and approval lifecycle.
├── WORKFLOW.md                ← Workflow definitions (spec, review, release, ADR).
├── PHASE_GATES.md             ← Phase gate enforcement rules.
├── MODEL_ROUTING.md           ← Model selection and routing logic.
├── AI_OPERATING_RULES.md      ← Rules all AI agents must follow.
├── MCP_STACK.md               ← MCP tool definitions and usage.
├── SESSION_RULES.md           ← Session lifecycle and behavior.
├── AGENT_RULES.md             ← Agent orchestration rules.
│
├── agents/                    ← Agent definitions.
│   └── core/                  ← architect, spec-guardian, qa-lead, security-reviewer, rtl-auditor, frontend-polish, docs-sync, docker-auditor
│
├── skills/                    ← Skill definitions.
│   ├── core/                  ← project-awareness, runtime-bootstrap, spec-sync
│   ├── design/                ← impeccable-enforcement
│   ├── docs/                  ← docs-synchronization
│   ├── execution/             ← docs-first-execution, spec-execution
│   ├── review/                ← consistency-audit, phase-gate-review, rtl-audit, security-audit
│   └── runtime/               ← model-routing, session-management
│
├── memory/                    ← Persistent project memory.
│   ├── project/               ← overview, phase-1-focus, current-status
│   ├── decisions/             ← architecture-decisions
│   └── brand/                 ← brand-rules
│
├── runtime/                   ← Runtime mechanics.
│   ├── bootstrap.md           ← Startup lifecycle
│   ├── context-loading.md     ← Context loading order
│   ├── escalation-rules.md    ← Escalation logic
│   ├── model-selection.md     ← Model initialization
│   ├── runtime-health.md      ← Health checks
│   ├── runtime-status.md      ← Active phase detection
│   ├── session-loader.md      ← Session hydration
│   └── tool-permissions.md    ← Tool permission model
│
├── workflows/                 ← Workflow definitions.
│   ├── spec-kit/              ← Spec lifecycle
│   ├── review/                ← Review lifecycle
│   └── release/               ← Release lifecycle
│
├── policies/                  ← Policy definitions.
│   ├── brand-consistency.md
│   ├── docs-first-policy.md
│   ├── no-direct-implementation-before-phase-lock.md
│   ├── no-fake-completion.md
│   ├── no-unverified-claims.md
│   ├── runtime-source-of-truth.md
│   └── security-baseline.md
│
├── templates/                 ← Review and gate templates.
│   ├── phase-gate-template.md
│   ├── review-template.md
│   ├── runtime-session-template.md
│   └── spec-review-template.md
│
├── routing/                   ← Model routing configurations.
│   └── models/
│
├── mcp/                       ← MCP tool configurations.
├── commands/                  ← Custom commands.
├── prompts/                   ← Prompt templates.
├── sessions/                  ← Session logs.
└── reviews/                   ← Review outputs.
```

---

## Source of Truth Hierarchy

When documents conflict, resolve in this order:

1. **`docs/`** — Product specs, PRD, technical design, ADRs.
2. **`specs/`** — Feature specifications.
3. **`.opencode/`** — Runtime layer (this directory).
4. **`archive/legacy-agents/`** — OpenCode project instructions (OPENCODE.md).
5. **Repository structure** — Code and configuration.

The runtime layer (`.opencode/`) does **not** override product docs. It operationalizes them.

---

## Quick Reference

| Need | Go To |
|------|-------|
| Start a session | `BOOT_SEQUENCE.md` |
| Understand project context | `PROJECT_RUNTIME.md` |
| Know what rules apply | `AI_OPERATING_RULES.md` |
| Route a task to a model | `MODEL_ROUTING.md` |
| Check phase gate status | `PHASE_GATES.md` |
| Run a review | `REVIEW_PIPELINE.md` |
| Understand workflow | `WORKFLOW.md` |
| Load an agent | `agents/core/<agent>.md` |
| Activate a skill | `skills/<category>/<skill>.md` |
| Check memory | `memory/<category>/` |
| Check runtime status | `runtime/runtime-status.md` |

---

## Runtime Version

- **Runtime version:** 1.0.0
- **Last updated:** 2026-05-20
- **Compatible with:** Phase 1 (Foundation)
