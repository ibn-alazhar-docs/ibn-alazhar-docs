# Pipeline State Machine

> **Purpose:** Define pipeline states, transitions, and deterministic execution semantics.
> **Scope:** Pipeline lifecycle, state machine, stage definitions, transition rules.

---

## 1. Pipeline State Machine

```
                    ┌─────────────┐
                    │   CREATED   │ ← Pipeline instance created from spec
                    └──────┬──────┘
                           │ validate()
                           ▼
                    ┌─────────────┐
              ┌─────│  VALIDATING │ ← Spec validation, governance checks
              │     └──────┬──────┘
              │            │
              │     ┌──────┴──────┐
              │     │             │
              │     ▼             ▼
              │ ┌──────┐    ┌──────────┐
              │ │READY │    │ REJECTED │ ← Terminal: spec or governance failed
              │ └──┬───┘    └──────────┘
              │    │ start()
              │    ▼
              │ ┌─────────────┐
              │ │  PLANNING   │ ← Architect session generates plan
              │ └──────┬──────┘
              │        │
              │   ┌────┴────┐
              │   │         │
              │   ▼         ▼
              │ ┌──────┐ ┌────────┐
              │ │PLAN  │ │ PLAN   │ ← Retry planning (max 2)
              │ │READY │ │FAILED  │
              │ └──┬───┘ └───┬────┘
              │    │         │ retry()
              │    ▼         │
              │ ┌────────────┐│
              │ │  BRANCHING │◄┘
              │ └──────┬─────┘
              │        │
              │   ┌────┴────┐
              │   │         │
              │   ▼         ▼
              │ ┌──────┐ ┌────────┐
              │ │BRANCH│ │ BRANCH │ ← Retry (max 2)
              │ │READY │ │FAILED  │
              │ └──┬───┘ └───┬────┘
              │    │         │ retry()
              │    ▼         │
              │ ┌────────────┐│
              │ │IMPLEMENTING│◄┘
              │ └──────┬─────┘
              │        │
              │   ┌────┴────┐
              │   │         │
              │   ▼         ▼
              │ ┌──────┐ ┌────────┐
              │ │IMPL  │ │ IMPL   │ ← Retry (max 2)
              │ │READY │ │FAILED  │
              │ └──┬───┘ └───┬────┘
              │    │         │ retry()
              │    ▼         │
              │ ┌────────────┐│
              │ │ VERIFYING  │◄┘
              │ └──────┬─────┘
              │        │
              │   ┌────┴────────────┐
              │   │                 │
              │   ▼                 ▼
              │ ┌──────┐      ┌──────────┐
              │ │VERIFY│      │ VERIFY   │
              │ │PASS  │      │ FAIL     │
              │ └──┬───┘      └────┬─────┘
              │    │               │ repair() (max 3)
              │    │          ┌────┴─────┐
              │    │          │ REPAIRING│
              │    │          └────┬─────┘
              │    │               │
              │    │          ┌────┴────┐
              │    │          │         │
              │    │          ▼         ▼
              │    │     ┌──────┐  ┌─────────┐
              │    │     │REPAIR│  │ REPAIR  │ → escalate to human
              │    │     │PASS  │  │ EXHAUST │
              │    │     └──┬───┘  └─────────┘
              │    │        │ retry verifying
              │    │        │
              │    ▼        ▼
              │ ┌─────────────┐
              │ │  REVIEWING  │ ← Review sessions (security, RTL, brand)
              │ └──────┬──────┘
              │        │
              │   ┌────┴────────────┐
              │   │                 │
              │   ▼                 ▼
              │ ┌──────┐      ┌──────────┐
              │ │REVIEW│      │ REVIEW   │
              │ │PASS  │      │ FAIL     │
              │ └──┬───┘      └────┬─────┘
              │    │               │ repair() (max 3)
              │    │          ┌────┴─────┐
              │    │          │ REPAIRING│
              │    │          └────┬─────┘
              │    │               │
              │    │          ┌────┴────┐
              │    │          │         │
              │    │          ▼         ▼
              │    │     ┌──────┐  ┌─────────┐
              │    │     │REPAIR│  │ REPAIR  │ → escalate to human
              │    │     │PASS  │  │ EXHAUST │
              │    │     └──┬───┘  └─────────┘
              │    │        │ retry reviewing
              │    │        │
              │    ▼        ▼
              │ ┌─────────────┐
              │ │  PR_CREATING│ ← Generate PR via GitHub automation
              │ └──────┬──────┘
              │        │
              │   ┌────┴────┐
              │   │         │
              │   ▼         ▼
              │ ┌──────┐ ┌────────┐
              │ │PR    │ │ PR     │ ← Retry (max 2)
              │ │READY │ │FAILED  │
              │ └──┬───┘ └───┬────┘
              │    │         │ retry()
              │    ▼         │
              │ ┌────────────┐│
              │ │AWAITING    │◄┘
              │ │APPROVAL    │ ← Human approval gate
              │ └──────┬─────┘
              │        │
              │   ┌────┴────┐
              │   │         │
              │   ▼         ▼
              │ ┌──────┐ ┌────────┐
              │ │APPRO-│ │REJECTED│ ← Human rejected
              │ │VED   │ └────────┘
              │ └──┬───┘
              │    │ merge()
              │    ▼
              │ ┌─────────────┐
              │ │  MERGING    │ ← Merge PR via GitHub automation
              │ └──────┬──────┘
              │        │
              │   ┌────┴────┐
              │   │         │
              │   ▼         ▼
              │ ┌──────────┐┌─────────┐
              │ │COMPLETED ││ FAILED  │ ← Terminal
              │ └──────────┘└─────────┘
              │
              ▼
         ┌──────────┐
         │ CANCELLED│ ← Terminal: manually cancelled
         └──────────┘
```

---

## 2. State Definitions

| State | Description | Duration | Exit Conditions |
|---|---|---|---|
| `CREATED` | Pipeline instance created. | Instant | → VALIDATING |
| `VALIDATING` | Spec and governance validation. | < 1 min | → READY, → REJECTED |
| `READY` | Pipeline ready to start. Waiting for trigger. | Variable | → PLANNING |
| `PLANNING` | Architect session generates implementation plan. | < 5 min | → BRANCHING, → FAILED |
| `BRANCHING` | Git branch created from main. | < 1 min | → IMPLEMENTING, → FAILED |
| `IMPLEMENTING` | Coder session implements the spec. | < 30 min | → VERIFYING, → FAILED |
| `VERIFYING` | Verification engine runs all checks. | < 10 min | → REVIEWING, → REPAIRING |
| `REPAIRING` | Recovery engine attempts to fix issues. | < 15 min | → VERIFYING (retry), → REPAIR_EXHAUSTED |
| `REVIEWING` | Review sessions analyze implementation. | < 10 min | → PR_CREATING, → REPAIRING |
| `PR_CREATING` | GitHub automation creates PR. | < 2 min | → AWAITING_APPROVAL, → FAILED |
| `AWAITING_APPROVAL` | Waiting for human approval. | Variable | → MERGING, → REJECTED |
| `MERGING` | GitHub automation merges PR. | < 1 min | → COMPLETED, → FAILED |
| `COMPLETED` | Pipeline finished successfully. | Terminal | — |
| `FAILED` | Pipeline failed (unrecoverable). | Terminal | — |
| `REJECTED` | Pipeline rejected (governance or human). | Terminal | — |
| `CANCELLED` | Pipeline manually cancelled. | Terminal | — |
| `REPAIR_EXHAUSTED` | Repair attempts exhausted. | Terminal | — |

---

## 3. Stage Definitions

### 3.1 Stage: Validate

**Purpose:** Verify spec is valid and governance checks pass.
**Session:** Governance role.
**Input:** Spec ID.
**Output:** Validation result.
**Events:** `SPEC_VALIDATED`, `GOVERNANCE_PASSED`, `GOVERNANCE_FAILED`.

### 3.2 Stage: Plan

**Purpose:** Generate implementation plan from spec.
**Session:** Architect role.
**Input:** Spec content.
**Output:** `ImplementationPlan` (structured).
**Events:** `PLAN_GENERATED`, `PLAN_FAILED`.

### 3.3 Stage: Branch

**Purpose:** Create Git branch for implementation.
**Session:** Shell execution (git commands).
**Input:** Plan (branch name from plan).
**Output:** Branch name, commit SHA.
**Events:** `BRANCH_CREATED`, `BRANCH_FAILED`.

### 3.4 Stage: Implement

**Purpose:** Execute implementation per plan.
**Session:** Coder role.
**Input:** Implementation plan, spec.
**Output:** Code changes, file operations.
**Events:** `IMPLEMENTATION_STARTED`, `IMPLEMENTATION_COMPLETE`, `IMPLEMENTATION_FAILED`.

### 3.5 Stage: Verify

**Purpose:** Run all verification checks.
**Sessions:** Verifier role (parallel).
**Input:** Code changes.
**Output:** `VerificationResult` per check type.
**Events:** `VERIFICATION_STARTED`, `VERIFICATION_PASSED`, `VERIFICATION_FAILED`.

**Verification Checks (parallel):**
- Lint check.
- Type check.
- Unit tests.
- Build check.
- Playwright checks (visual, RTL, accessibility, responsive).
- Security scan.

### 3.6 Stage: Repair

**Purpose:** Fix issues found in verification or review.
**Session:** Recovery role.
**Input:** Failure report, code changes.
**Output:** Repaired code changes.
**Events:** `REPAIR_LOOP_STARTED`, `REPAIR_LOOP_COMPLETED`, `REPAIR_LOOP_FAILED`.

### 3.7 Stage: Review

**Purpose:** Run review agents on implementation.
**Sessions:** Reviewer role (parallel).
**Input:** Code changes.
**Output:** `ReviewResult` per review type.
**Events:** `REVIEW_STARTED`, `REVIEW_PASSED`, `REVIEW_FAILED`.

**Review Types (parallel):**
- Security review.
- RTL audit.
- Brand audit.
- Spec compliance check.

### 3.8 Stage: PR Create

**Purpose:** Generate pull request on GitHub.
**Session:** GitHub automation.
**Input:** Code changes, review results.
**Output:** PR URL, PR number.
**Events:** `PR_GENERATED`, `PR_FAILED`.

### 3.9 Stage: Await Approval

**Purpose:** Wait for human approval to merge.
**Session:** Governance role (monitoring).
**Input:** PR URL.
**Output:** Approval decision.
**Events:** `APPROVAL_REQUESTED`, `APPROVAL_GRANTED`, `APPROVAL_DENIED`.

### 3.10 Stage: Merge

**Purpose:** Merge PR into main branch.
**Session:** GitHub automation.
**Input:** PR number.
**Output:** Merge commit SHA.
**Events:** `PR_MERGED`, `MERGE_FAILED`.

---

## 4. Transition Rules

### 4.1 Mandatory Transitions

| From | To | Condition |
|---|---|---|
| CREATED | VALIDATING | Always |
| VALIDATING | READY | Spec valid AND governance passes |
| VALIDATING | REJECTED | Spec invalid OR governance fails |
| READY | PLANNING | `start()` called |
| PLANNING | BRANCHING | Plan generated successfully |
| PLANNING | FAILED | Plan generation failed (after retries) |
| BRANCHING | IMPLEMENTING | Branch created successfully |
| BRANCHING | FAILED | Branch creation failed (after retries) |
| IMPLEMENTING | VERIFYING | Implementation complete |
| IMPLEMENTING | FAILED | Implementation failed (after retries) |
| VERIFYING | REVIEWING | All checks pass |
| VERIFYING | REPAIRING | Any check fails |
| REPAIRING | VERIFYING | Repair successful, re-verify |
| REPAIRING | REPAIR_EXHAUSTED | Max repair attempts reached |
| REVIEWING | PR_CREATING | All reviews pass |
| REVIEWING | REPAIRING | Any review fails |
| PR_CREATING | AWAITING_APPROVAL | PR created successfully |
| PR_CREATING | FAILED | PR creation failed (after retries) |
| AWAITING_APPROVAL | MERGING | Human approves |
| AWAITING_APPROVAL | REJECTED | Human rejects |
| MERGING | COMPLETED | Merge successful |
| MERGING | FAILED | Merge failed |

### 4.2 Retry Limits

| Stage | Max Retries | Retry Delay |
|---|---|---|
| Planning | 2 | 10s |
| Branching | 2 | 5s |
| Implementing | 2 | 30s |
| PR Creating | 2 | 10s |
| Merging | 2 | 5s |
| Repair Loop | 3 | 60s |

### 4.3 Timeout Limits

| Stage | Timeout | Action on Timeout |
|---|---|---|
| Validating | 1 min | Fail pipeline |
| Planning | 5 min | Retry, then fail |
| Branching | 1 min | Retry, then fail |
| Implementing | 30 min | Retry, then fail |
| Verifying | 10 min | Fail pipeline |
| Repairing | 15 min | Exhaust, escalate |
| Reviewing | 10 min | Fail pipeline |
| PR Creating | 2 min | Retry, then fail |
| Awaiting Approval | 24 hours | Auto-reject, notify |
| Merging | 1 min | Retry, then fail |

---

## 5. Pipeline Data Model

```typescript
interface Pipeline {
  id: string;
  specId: string;
  state: PipelineState;
  currentStage: StageName | null;
  branchName: string | null;
  prNumber: number | null;
  prUrl: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  stages: StageResult[];
  events: PipelineEvent[];
  metrics: PipelineMetrics;
  error: PipelineError | null;
}

interface StageResult {
  stage: StageName;
  state: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number | null;
  error: string | null;
  output: unknown | null;
  retryCount: number;
}

interface PipelineMetrics {
  totalDuration: number;
  stageDurations: Record<StageName, number>;
  sessionCount: number;
  toolCallCount: number;
  tokenUsage: number;
  repairAttempts: number;
}
```

---

## 6. Pipeline Execution Guarantees

### 6.1 Determinism

- Same spec + same plan → same implementation (within model variance).
- Stage ordering is fixed and cannot be reordered.
- Retry behavior is deterministic (fixed delays, fixed max attempts).
- Event ordering is guaranteed within a pipeline.

### 6.2 Idempotency

- Pipeline creation is idempotent (same spec → same pipeline or error).
- Branch creation is idempotent (branch exists → reuse).
- PR creation is idempotent (PR exists → return existing).
- Verification is idempotent (same code → same result).

### 6.3 Replayability

- All events are persisted.
- Pipeline can be replayed from any stage.
- Replay uses the same spec and plan.
- Replay produces a new pipeline instance.

### 6.4 Cancellation

- Pipeline can be cancelled at any non-terminal state.
- Cancellation stops all active sessions.
- Cancellation cleans up resources (branches, temp files).
- Cancellation emits `PIPELINE_CANCELLED` event.
- Cancellation is irreversible.

---

## 7. Pipeline Events

| Event | Payload | Emitted When |
|---|---|---|
| `PIPELINE_CREATED` | `{pipelineId, specId}` | Pipeline instance created |
| `PIPELINE_VALIDATING` | `{pipelineId}` | Validation started |
| `PIPELINE_READY` | `{pipelineId}` | Validation passed |
| `PIPELINE_REJECTED` | `{pipelineId, reason}` | Validation failed |
| `PIPELINE_STARTED` | `{pipelineId}` | `start()` called |
| `PIPELINE_STAGE_STARTED` | `{pipelineId, stage}` | Stage started |
| `PIPELINE_STAGE_COMPLETED` | `{pipelineId, stage, output}` | Stage passed |
| `PIPELINE_STAGE_FAILED` | `{pipelineId, stage, error}` | Stage failed |
| `PIPELINE_REPAIR_STARTED` | `{pipelineId, stage, attempt}` | Repair loop started |
| `PIPELINE_REPAIR_COMPLETED` | `{pipelineId, stage, attempt}` | Repair successful |
| `PIPELINE_REPAIR_EXHAUSTED` | `{pipelineId, stage, attempts}` | Max repairs reached |
| `PIPELINE_COMPLETED` | `{pipelineId, prUrl, metrics}` | Pipeline finished |
| `PIPELINE_FAILED` | `{pipelineId, stage, error}` | Pipeline failed |
| `PIPELINE_CANCELLED` | `{pipelineId, reason}` | Pipeline cancelled |

---

## 8. Pipeline Concurrency

### 8.1 Concurrent Pipeline Limits

| Limit | Default | Configurable |
|---|---|---|
| Max concurrent pipelines | 5 | Yes |
| Max pipelines per spec | 1 | No |
| Max pipelines per phase | 3 | Yes |

### 8.2 Concurrency Control

- Pipelines are queued when the limit is reached.
- Queue ordering: priority (governance > bug fix > feature).
- Queued pipelines emit `PIPELINE_QUEUED` event.
- When a slot opens, the highest-priority pipeline starts.

### 8.3 Resource Isolation

- Each pipeline has its own branch.
- Each pipeline has its own session pool.
- Pipelines do not share file system state.
- Pipelines share the event bus and memory.

---

## 9. Pipeline Context Integration

### 9.1 Context Assembly per Stage

Each pipeline stage assembles context from the memory hierarchy:

| Stage | HOT Context | WARM Context | COLD Context |
|---|---|---|---|
| Validate | System + spec | Pipeline state | Policies |
| Plan | System + spec | Memory state | Related ADRs |
| Branch | System + plan | Branch config | N/A |
| Implement | System + spec + plan + tasks | Previous output | Conventions |
| Verify | System + spec | Code state | N/A |
| Review | System + spec + code diff | Verification results | Patterns |
| Repair | System + spec + plan + failure | Code state + repair history | Patterns |
| PR Create | System + plan + review results | PR config | N/A |
| Await Approval | System + PR summary | Pipeline state | N/A |
| Merge | System + PR summary | Merge config | N/A |

### 9.2 Context Budget per Stage

| Stage | Token Budget | Compaction Trigger |
|---|---|---|
| Validate | 10,000 | N/A |
| Plan | 14,000 | 70% utilization |
| Branch | 8,000 | N/A |
| Implement | 14,000 | 70% utilization |
| Verify | 8,000 | N/A |
| Review | 12,000 | 70% utilization |
| Repair | 14,000 | 70% utilization |
| PR Create | 10,000 | N/A |
| Await Approval | 8,000 | N/A |
| Merge | 8,000 | N/A |

---

## 10. Pipeline Knowledge Graph Integration

### 10.1 Graph Node Creation

Each pipeline creates the following graph nodes:

- `Pipeline` node (on creation)
- `Session` nodes (on session start)
- `Artifact` nodes (on artifact creation)
- `Verification` node (on verification start)
- `Review` nodes (on review start)
- `Failure` nodes (on failure detection)
- `Branch` node (on branch creation)
- `PullRequest` node (on PR creation)

### 10.2 Graph Edge Creation

Edges are created as the pipeline progresses:

- `IMPLEMENTED_BY`: Spec → Pipeline
- `GENERATED`: Pipeline → Session
- `PRODUCED`: Session → Artifact
- `TRIGGERED`: Pipeline → Verification/Review
- `FOUND`: Verification/Review → Failure
- `RESOLVED_BY`: Failure → Session (recovery)
- `CREATED`: Pipeline → Branch/PR
