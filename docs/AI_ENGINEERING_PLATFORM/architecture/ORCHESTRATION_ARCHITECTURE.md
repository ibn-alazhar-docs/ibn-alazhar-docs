# Orchestration Architecture

> **Purpose:** Top-level system design for the AI Engineering Platform.
> **Scope:** Component architecture, data flow, interaction patterns.

---

## 1. System Overview

The AI Engineering Platform is a layered, event-driven orchestration system built on the OpenCode SDK. It transforms engineering intent (specs, tasks, bug reports) into shipped code through deterministic pipelines.

### 1.1 Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROL PLANE                               │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ Pipeline    │ │ Governance   │ │ Event      │ │ Memory    │ │
│  │ Engine      │ │ System       │ │ Bus        │ │ Sync      │ │
│  └──────┬──────┘ └──────┬───────┘ └─────┬──────┘ └─────┬─────┘ │
│         │               │               │               │       │
│  ┌──────┴──────┐ ┌──────┴───────┐ ┌─────┴──────┐ ┌─────┴─────┐ │
│  │ Context     │ │ Knowledge    │ │ Artifact   │ │ Replay    │ │
│  │ Orchestrator│ │ Graph        │ │ Intelligence│ │ Engine    │ │
│  └─────────────┘ └──────────────┘ └────────────┘ └───────────┘ │
├─────────┼───────────────┼───────────────┼───────────────┼───────┤
│                     ORCHESTRATION LAYER                           │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ Session     │ │ Tool         │ │ Structured │ │ Recovery  │ │
│  │ Manager     │ │ Router       │ │ Output     │ │ Engine    │ │
│  └──────┬──────┘ └──────┬───────┘ └─────┬──────┘ └─────┬─────┘ │
│         │               │               │               │       │
│  ┌──────┴──────┐ ┌──────┴───────┐ ┌─────┴──────┐ ┌─────┴─────┐ │
│  │ Context     │ │ Compaction   │ │ Observ-    │ │ Alert     │ │
│  │ Assembler   │ │ Pipeline     │ │ ability    │ │ Engine    │ │
│  └─────────────┘ └──────────────┘ └────────────┘ └───────────┘ │
├─────────┼───────────────┼───────────────┼───────────────┼───────┤
│                     EXECUTION LAYER                             │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ OpenCode    │ │ Shell        │ │ File       │ │ TUI       │ │
│  │ SDK Session │ │ Executor     │ │ API        │ │ API       │ │
│  └──────┬──────┘ └──────┬───────┘ └─────┬──────┘ └─────┬─────┘ │
│         │               │               │               │       │
├─────────┼───────────────┼───────────────┼───────────────┼───────┤
│                     INTEGRATION LAYER                           │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ GitHub      │ │ Playwright   │ │ CI/CD      │ │ Notion    │ │
│  │ Automation  │ │ Automation   │ │ Bridge     │ │ Sync      │ │
│  └─────────────┘ └──────────────┘ └────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Layer Responsibilities

| Layer | Components | Responsibility |
|---|---|---|
| **Control Plane** | Pipeline Engine, Governance, Event Bus, Memory Sync | Decision-making, state management, coordination |
| **Orchestration Layer** | Session Manager, Tool Router, Structured Output, Recovery | Session lifecycle, tool dispatch, output validation, failure handling |
| **Execution Layer** | OpenCode SDK, Shell, File API, TUI | Actual code execution, file manipulation, terminal interaction |
| **Integration Layer** | GitHub, Playwright, CI/CD, Notion | External system integration |

---

## 2. Component Architecture

### 2.1 Pipeline Engine

The Pipeline Engine is the central orchestrator. It:
- Reads approved specs from the spec repository.
- Creates pipeline instances with defined stages.
- Transitions pipelines through states via events.
- Enforces stage ordering and gate conditions.
- Emits events for every state transition.

**Key Interfaces:**
```typescript
interface PipelineEngine {
  createPipeline(specId: string, config: PipelineConfig): Pipeline;
  transition(pipelineId: string, event: PipelineEvent): Promise<PipelineState>;
  getState(pipelineId: string): PipelineState;
  replay(pipelineId: string): Promise<PipelineHistory>;
  cancel(pipelineId: string, reason: string): Promise<void>;
}
```

**Pipeline Stages (default):**
1. `spec_read` — Read and validate the spec.
2. `plan` — Generate implementation plan.
3. `branch` — Create Git branch.
4. `implement` — Execute implementation via OpenCode sessions.
5. `verify` — Run verification checks.
6. `review` — Run review agents.
7. `repair` — Fix issues found in verification/review (conditional).
8. `pr` — Generate pull request.
9. `merge` — Merge (requires human approval).

### 2.2 Governance System

The Governance System enforces operational boundaries:
- Phase gate validation (current phase must pass before next).
- Scope enforcement (no work outside approved specs).
- Approval checkpoint routing (human-in-the-loop at defined points).
- Safety boundary enforcement (no destructive operations without approval).
- Role-based permission checks (what each runtime role can do).

**Key Interfaces:**
```typescript
interface GovernanceSystem {
  checkPhaseGate(phase: string): Promise<GateResult>;
  checkScope(specId: string): Promise<ScopeResult>;
  requestApproval(checkpoint: ApprovalCheckpoint): Promise<ApprovalResult>;
  checkSafety(operation: Operation): Promise<SafetyResult>;
  checkRole(role: RuntimeRole, action: Action): Promise<boolean>;
}
```

### 2.3 Event Bus

The Event Bus is the central nervous system. All components communicate through events:
- Events are immutable and append-only.
- Events carry timestamps, correlation IDs, and causation IDs.
- Events are persisted for replay and audit.
- Subscribers react to events asynchronously.

**Event Categories:**
- `SESSION_*` — Session lifecycle events.
- `PIPELINE_*` — Pipeline state transitions.
- `SPEC_*` — Spec lifecycle events.
- `VERIFICATION_*` — Verification results.
- `REVIEW_*` — Review outcomes.
- `REPAIR_*` — Repair loop events.
- `GOVERNANCE_*` — Gate and approval events.
- `GITHUB_*` — GitHub automation events.
- `PLAYWRIGHT_*` — Browser automation events.
- `SYSTEM_*` — Platform-level events (health, errors, metrics).

### 2.4 Session Manager

The Session Manager controls OpenCode SDK sessions:
- Creates sessions with role-specific configurations.
- Monitors session health and progress.
- Handles session timeouts and recovery.
- Routes tool calls within sessions.
- Collects session outputs and artifacts.

**Session Types:**
| Type | Role | Purpose |
|---|---|---|
| `architect` | Architect | Spec analysis, planning, ADR generation |
| `planner` | Planner | Task breakdown, dependency mapping |
| `coder` | Coder | Implementation, refactoring, bug fixes |
| `reviewer` | Reviewer | Code review, spec compliance check |
| `verifier` | Verifier | Test execution, validation |
| `governance` | Governance | Gate checks, scope validation |
| `recovery` | Recovery | Repair loop execution, rollback |
| `documentation` | Documentation | Doc generation, spec updates |

### 2.5 Tool Router

The Tool Router dispatches tool calls to the correct handler:
- Validates tool permissions per role.
- Routes to OpenCode SDK tools, shell, file API, or external integrations.
- Enforces rate limits and concurrency controls.
- Logs all tool invocations for audit.

### 2.6 Structured Output Validator

All AI-generated outputs pass through the Structured Output Validator:
- Validates against predefined JSON schemas.
- Rejects malformed outputs for regeneration.
- Extracts typed data for downstream consumption.
- Maintains output history for replay.

### 2.7 Recovery Engine

The Recovery Engine handles failures:
- Detects failure conditions from events.
- Classifies failures (transient, permanent, systemic).
- Executes repair strategies based on failure type.
- Escalates to human when repair limits are exceeded.
- Records recovery actions for audit.

### 2.8 Memory Sync

Memory Sync maintains persistent project state:
- Reads from `.opencode/memory/` at session start.
- Writes updated state at session end.
- Resolves conflicts between concurrent sessions.
- Validates memory consistency.

---

## 3. Data Flow

### 3.1 Primary Flow: Spec to PR

```
[Spec Repository]
       │
       ▼ (SPEC_READY event)
┌──────────────────┐
│  Pipeline Engine │ ── creates pipeline instance
└────────┬─────────┘
         │
         ▼ (PIPELINE_CREATED event)
┌──────────────────┐
│   Governance     │ ── checks phase gate, scope
└────────┬─────────┘
         │ (if pass)
         ▼ (GOVERNANCE_PASSED event)
┌──────────────────┐
│ Session Manager  │ ── creates architect session
└────────┬─────────┘
         │
         ▼ (SESSION_STARTED event)
┌──────────────────┐
│  OpenCode SDK    │ ── reads spec, generates plan
└────────┬─────────┘
         │
         ▼ (PLAN_GENERATED event)
┌──────────────────┐
│ Session Manager  │ ── creates coder session
└────────┬─────────┘
         │
         ▼ (SESSION_STARTED event)
┌──────────────────┐
│  OpenCode SDK    │ ── implements code
└────────┬─────────┘
         │
         ▼ (IMPLEMENTATION_COMPLETE event)
┌──────────────────┐
│  Verification    │ ── runs CI, Playwright, security, RTL, brand
│    Engine        │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  PASS      FAIL
    │         │
    │         ▼ (VERIFICATION_FAILED event)
    │   ┌──────────────────┐
    │   │  Recovery Engine │ ── repair loop (max 3 attempts)
    │   └────────┬─────────┘
    │            │
    │     ┌──────┴──────┐
    │     │             │
    │     ▼             ▼
    │   REPAIR       ESCALATE
    │   PASS         TO HUMAN
    │     │             │
    │     ▼             ▼
    │   (continues)  (pipeline paused)
    │
    ▼ (VERIFICATION_PASSED event)
┌──────────────────┐
│  GitHub Auto     │ ── creates branch, commits, generates PR
└────────┬─────────┘
         │
         ▼ (PR_CREATED event)
┌──────────────────┐
│   Governance     │ ── requests human approval for merge
└────────┬─────────┘
         │
         ▼ (HUMAN_APPROVED event)
┌──────────────────┐
│  GitHub Auto     │ ── merges PR, cleans up branch
└────────┬─────────┘
         │
         ▼ (PIPELINE_COMPLETED event)
[Pipeline Complete]
```

### 3.2 Event Propagation

```
Event Source ──► Event Bus ──► Subscribers
                    │
                    ├──► Pipeline Engine (state transitions)
                    ├──► Governance System (gate checks)
                    ├──► Recovery Engine (failure detection)
                    ├──► Memory Sync (state persistence)
                    ├──► Observability (metrics, logs, traces)
                    └──► Event Store (persistence for replay)
```

---

## 4. Component Interaction Patterns

### 4.1 Request-Response (Synchronous)

Used for governance checks and approval requests:
```
Caller ──► Governance.checkPhaseGate() ──► GateResult
```

### 4.2 Event-Driven (Asynchronous)

Used for pipeline progression and verification:
```
Pipeline Engine ──emit──► PIPELINE_STAGE_COMPLETE
                                    │
                          Event Bus fans out to:
                                    ├──► Session Manager (start next stage)
                                    ├──► Memory Sync (update state)
                                    └──► Observability (record metric)
```

### 4.3 Polling (Health Checks)

Used for session monitoring and external system status:
```
Session Manager ──poll every 5s──► OpenCode SDK session status
                                        │
                                   if changed:
                                        ▼
                              emit SESSION_STATUS_CHANGED
```

### 4.4 Callback (External Integrations)

Used for GitHub webhooks and CI/CD status:
```
GitHub Webhook ──► Integration Layer ──► Event Bus ──► Subscribers
```

---

## 5. Scalability Model

### 5.1 Horizontal Scaling

| Component | Scaling Strategy |
|---|---|
| Pipeline Engine | Multiple instances, partitioned by pipeline ID hash |
| Session Manager | Multiple instances, each manages a pool of sessions |
| Event Bus | Redis Streams or NATS for distributed event routing |
| Verification Engine | Parallel verification stages, independent workers |
| Tool Router | Stateless, scales with load balancer |

### 5.2 Concurrency Model

- Multiple pipelines can run concurrently.
- Each pipeline has its own session pool.
- Sessions within a pipeline run sequentially (deterministic ordering).
- Verification stages within a pipeline run in parallel where possible.
- Governance checks are synchronous (blocking).

### 5.3 Resource Limits

| Resource | Limit | Rationale |
|---|---|---|
| Concurrent Pipelines | Configurable (default: 5) | Model API rate limits |
| Sessions per Pipeline | 3 max | Sequential stage execution |
| Repair Attempts per Pipeline | 3 max | Prevent infinite loops |
| Session Timeout | 30 min default | Prevent runaway sessions |
| Event Store Retention | 90 days | Audit and replay requirements |

---

## 6. Failure Domains

| Failure Domain | Impact | Mitigation |
|---|---|---|
| Model API unavailable | All sessions blocked | Retry with backoff, escalate after 3 failures |
| Event Bus unavailable | No state transitions | Local event queue, flush on reconnect |
| Git repository unavailable | Cannot branch/commit/PR | Retry, alert human |
| File system unavailable | Cannot read/write code | Session fails, recovery attempts |
| Playwright unavailable | UI verification skipped | Mark as skipped, alert human |
| Memory corruption | Inconsistent project state | Restore from last known good snapshot |

---

## 7. Observability Architecture

### 7.1 Metrics

| Metric | Type | Labels |
|---|---|---|
| `pipeline_created_total` | Counter | phase, spec_type |
| `pipeline_duration_seconds` | Histogram | phase, status |
| `session_duration_seconds` | Histogram | role, status |
| `tool_call_total` | Counter | tool_name, role, status |
| `verification_result_total` | Counter | type, result |
| `repair_attempt_total` | Counter | failure_type, result |
| `governance_check_total` | Counter | check_type, result |
| `event_published_total` | Counter | event_type |

### 7.2 Logging

All components emit structured JSON logs:
```json
{
  "timestamp": "2026-05-20T10:30:00Z",
  "level": "info",
  "component": "pipeline_engine",
  "pipeline_id": "uuid",
  "event": "PIPELINE_STAGE_COMPLETE",
  "stage": "implement",
  "duration_ms": 45000,
  "correlation_id": "uuid"
}
```

### 7.3 Tracing

Each pipeline execution generates a trace:
- Root span: Pipeline execution.
- Child spans: Each stage.
- Grandchild spans: Individual tool calls, sessions, verifications.
- Correlation ID links all spans within a pipeline.

---

## 8. Security Architecture

### 8.1 Threat Model

| Threat | Mitigation |
|---|---|
| Unauthorized pipeline execution | Governance checks, role validation |
| Spec tampering | Spec hash verification, Git history |
| Code injection via AI output | Structured output validation, sandboxed execution |
| Secret exposure | No secrets in AI context, environment variable isolation |
| Replay attacks | Event deduplication, idempotent operations |
| Privilege escalation | Role-based tool permissions, governance enforcement |

### 8.2 Permission Model

Each runtime role has defined tool permissions:

| Role | Read | Write | Shell | Git | Review | Approve |
|---|---|---|---|---|---|---|
| architect | Yes | Docs only | Read only | Read only | Yes | No |
| coder | Yes | Source only | Limited | Branch only | No | No |
| reviewer | Yes | No | No | Read only | Yes | No |
| verifier | Yes | No | Test only | Read only | No | No |
| governance | Yes | No | No | Read only | No | Yes (gates only) |
| recovery | Yes | Source only | Limited | Branch, revert | No | No |

---

## 9. Configuration

### 9.1 Platform Configuration

```yaml
platform:
  model:
    provider: opencode-zen
    model: qwen3.6-plus-free
    max_tokens: 8192
    temperature: 0.1

  pipeline:
    max_concurrent: 5
    session_timeout_minutes: 30
    max_repair_attempts: 3
    stage_timeout_minutes: 15

  governance:
    phase_gate_required: true
    human_approval_required: true
    approval_checkpoints:
      - before_implement
      - before_merge

  event_bus:
    backend: redis-streams
    retention_days: 90
    max_subscribers_per_event: 10

  observability:
    metrics_enabled: true
    tracing_enabled: true
    log_level: info
```

---

## 10. Deployment Topology

### 10.1 Local Development

```
┌──────────────────────────────────────┐
│         Developer Machine            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │    AI Engineering Platform     │  │
│  │  (Node.js process)             │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────┼───────────────────┐  │
│  │  OpenCode SDK (local binary)  │  │
│  └────────────┼───────────────────┘  │
│               │                      │
│  ┌────────────┼───────────────────┐  │
│  │  Project Repository (local)   │  │
│  └───────────────────────────────┘  │
└──────────────────────────────────────┘
```

### 10.2 Production (Future)

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                    │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Pipeline │ │ Session  │ │ Verify   │ │ GitHub    │  │
│  │ Engine   │ │ Manager  │ │ Engine   │ │ Auto      │  │
│  │ (2 pods) │ │ (3 pods) │ │ (2 pods) │ │ (1 pod)   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │            │            │               │        │
│  ┌────┴────────────┴────────────┴───────────────┴─────┐  │
│  │                  Event Bus (Redis)                  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Event Store (PostgreSQL)               │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```
