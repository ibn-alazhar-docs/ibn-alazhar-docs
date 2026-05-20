# AI Engineering Platform — ابن الأزهر دوكس

> **Purpose:** Production-grade autonomous AI engineering platform architecture built on the OpenCode SDK.
> **Status:** Architecture Design — Phase 0 (MVP Lock)
> **Model Strategy:** Single-model (Qwen3.6 Plus Free via OpenCode Zen)
> **Runtime Kernel:** OpenCode SDK

---

## Overview

The AI Engineering Platform is an autonomous, spec-driven, event-driven engineering execution layer that operates above the OpenCode SDK. It orchestrates the full lifecycle of engineering work: from spec reading through implementation, verification, review, repair, and pull request generation.

This is **not** the Ibn Al-Azhar Docs product. This is the **engineering platform** that builds and maintains Ibn Al-Azhar Docs (and potentially other projects) autonomously.

---

## Core Capabilities

| Capability | Description |
|---|---|
| **Spec-Driven Execution** | Every feature starts as a spec. No code without a spec. |
| **Event-Driven Runtime** | All state transitions are event-emitted and observable. |
| **Pipeline Orchestration** | Deterministic pipeline engine with state machine semantics. |
| **Session Lifecycle** | Managed OpenCode sessions with boot, execute, verify, wrap phases. |
| **Verification Engine** | Multi-layer verification: CI, Playwright, security, RTL, brand. |
| **Recovery & Repair** | Automated repair loops with escalation to human operators. |
| **Governance System** | Phase gates, approval checkpoints, scope enforcement. |
| **GitHub Automation** | Branch generation, commits, PRs, changelogs, releases. |
| **Playwright Automation** | Browser-based visual, RTL, accessibility, responsive checks. |
| **Structured Outputs** | All AI outputs are typed, validated, and replayable. |
| **Context Orchestration** | HOT/WARM/COLD/ARCHIVAL context tiers with budget governance. |
| **Context Compaction** | Summarization, compression, knowledge extraction, replay-safe. |
| **Memory Hierarchy** | SESSION/PIPELINE/PROJECT/HISTORICAL memory with sync. |
| **Knowledge Graph** | Relationship graph connecting specs, pipelines, decisions, failures. |
| **Artifact Intelligence** | Full artifact lifecycle: creation, validation, indexing, analysis. |
| **Session Replay** | Passive/active/interactive replay with divergence detection. |
| **Observability** | Metrics, logs, traces, event journals, execution analytics. |

---

## Architecture Documents

### Core Architecture

| Document | Path | Description |
|---|---|---|
| **Orchestration Architecture** | `architecture/ORCHESTRATION_ARCHITECTURE.md` | Top-level system design, component interactions, data flow. |
| **SDK Execution Model** | `runtime/SDK_EXECUTION_MODEL.md` | How the OpenCode SDK is used as the execution kernel. |
| **Session Lifecycle** | `runtime/SESSION_LIFECYCLE.md` | OpenCode session states, transitions, and management. |
| **Pipeline State Machine** | `pipelines/PIPELINE_STATE_MACHINE.md` | Pipeline states, transitions, and deterministic execution. |
| **Event Bus Architecture** | `events/EVENT_BUS_ARCHITECTURE.md` | Event types, routing, subscriptions, and replay. |
| **Structured Output Schemas** | `schemas/STRUCTURED_OUTPUT_SCHEMAS.md` | JSON schemas for all AI-generated outputs. |

### Verification & Recovery

| Document | Path | Description |
|---|---|---|
| **Verification Engine** | `verification/VERIFICATION_ENGINE_ARCHITECTURE.md` | Multi-layer verification pipeline design. |
| **Recovery & Repair** | `recovery/RECOVERY_AND_REPAIR_SYSTEM.md` | Failure handling, repair loops, escalation logic. |
| **Autonomous Governance** | `governance/AUTONOMOUS_GOVERNANCE.md` | Phase gates, approvals, scope enforcement, safety. |

### Automation

| Document | Path | Description |
|---|---|---|
| **GitHub Automation** | `github/GITHUB_AUTOMATION_ARCHITECTURE.md` | Branch, commit, PR, release automation. |
| **Playwright Automation** | `playwright/PLAYWRIGHT_AUTOMATION.md` | Browser automation for UI verification. |

### Context & Memory

| Document | Path | Description |
|---|---|---|
| **Context Orchestration** | `context/CONTEXT_ORCHESTRATION.md` | HOT/WARM/COLD/ARCHIVAL context tiers, retrieval, injection. |
| **Context Compaction** | `context/CONTEXT_COMPACTION_PIPELINE.md` | Summarization, compression, knowledge extraction, replay-safe. |
| **Memory Hierarchy** | `memory/MEMORY_HIERARCHY.md` | SESSION/PIPELINE/PROJECT/HISTORICAL memory with sync. |
| **Knowledge Graph** | `memory/KNOWLEDGE_GRAPH_ARCHITECTURE.md` | Relationship graph for all platform entities. |

### Artifacts & Replay

| Document | Path | Description |
|---|---|---|
| **Artifact Intelligence** | `artifacts/ARTIFACT_INTELLIGENCE_SYSTEM.md` | Artifact lifecycle, indexing, analysis, versioning. |
| **Session Replay** | `replay/SESSION_REPLAY_ARCHITECTURE.md` | Passive/active/interactive replay with divergence detection. |

### Observability

| Document | Path | Description |
|---|---|---|
| **Observability & Tracing** | `observability/OBSERVABILITY_AND_TRACING.md` | Metrics, logs, traces, event journals, analytics. |

---

## Model Strategy

| Aspect | Decision |
|---|---|
| **Primary Model** | Qwen3.6 Plus Free (OpenCode Zen) |
| **Model Count** | Single model, multiple runtime roles |
| **Roles** | architect, planner, coder, reviewer, verifier, governance, recovery, documentation |
| **Rationale** | Simplicity, cost control, deterministic behavior |
| **Future** | Multi-model routing when justified by capability gaps |

The same model operates in different **runtime roles**. Each role has a distinct system prompt, tool permissions, and output schema. Role switching is controlled by the pipeline engine.

---

## Design Principles

1. **Event-driven** — Everything is an event. State is derived from event history.
2. **Deterministic** — Same inputs produce same outputs. No hidden randomness.
3. **Observable** — Every action is logged, metriced, and traceable.
4. **Recoverable** — Every failure has a defined recovery path.
5. **Phase-aware** — The system knows which phase it is in and enforces boundaries.
6. **Governance-first** — No action bypasses governance checks.
7. **Spec-driven** — No implementation without an approved spec.
8. **Safety-bounded** — Autonomous actions have defined operational boundaries.
9. **Replayable** — Any pipeline can be replayed from event history.
10. **Scalable** — Components are independently scalable.
11. **Context-aware** — Context is orchestrated across tiers with budget governance.
12. **Memory-synchronized** — Memory is synchronized across tiers with conflict resolution.
13. **Knowledge-connected** — All entities are connected through a knowledge graph.
14. **Artifact-managed** — All outputs are validated, indexed, and analyzed.

---

## Relationship to Existing Runtime

The existing `.opencode/` directory provides the **project-level runtime** for Ibn Al-Azhar Docs. The AI Engineering Platform is the **system-level orchestration layer** that operates above it.

```
┌─────────────────────────────────────────────────┐
│           AI Engineering Platform               │
│  (Orchestration, Pipelines, Events, Governance) │
│  (Context, Memory, Knowledge, Artifacts)        │
│  (Replay, Observability, Analytics)             │
├─────────────────────────────────────────────────┤
│              OpenCode SDK                       │
│  (Sessions, Tools, Shell, File APIs, TUI)       │
├─────────────────────────────────────────────────┤
│         .opencode/ Project Runtime              │
│  (Specs, Agents, Memory, Policies, Workflows)   │
├─────────────────────────────────────────────────┤
│           Ibn Al-Azhar Docs Repo                │
│  (Code, Tests, Docs, Docker, CI/CD)             │
└─────────────────────────────────────────────────┘
```

The AI Engineering Platform:
- Reads specs from `.opencode/` and `specs/`.
- Uses OpenCode SDK sessions for execution.
- Enforces policies defined in `.opencode/policies/`.
- Activates agents defined in `.opencode/agents/`.
- Updates memory in `.opencode/memory/`.
- Generates PRs and automates GitHub workflows.
- Manages context across HOT/WARM/COLD/ARCHIVAL tiers.
- Maintains knowledge graph of all platform entities.
- Provides full session replay capabilities.
- Exposes comprehensive observability.

---

## Version History

| Version | Date | Description |
|---|---|---|
| 1.0.0 | 2026-05-20 | Initial architecture design |
| 2.0.0 | 2026-05-20 | Full MVP lock: context, memory, knowledge graph, artifacts, replay, observability |
