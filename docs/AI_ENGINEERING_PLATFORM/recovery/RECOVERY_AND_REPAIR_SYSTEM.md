# Recovery and Repair System

> **Purpose:** Define failure handling, repair loops, escalation logic, and rollback procedures.
> **Scope:** Failure classification, repair strategies, escalation paths, rollback mechanisms.

---

## 1. Recovery Engine Overview

The Recovery Engine detects failures, classifies them, executes repair strategies, and escalates when repair limits are exceeded. It is the safety net that prevents pipeline failures from becoming permanent.

```
Failure Detected
  │
  ▼
┌──────────────────────────────────────┐
│          RECOVERY ENGINE              │
│                                       │
│  ┌────────────┐  ┌─────────────────┐ │
│  │ Classify   │  │ Select Repair   │ │
│  │ Failure    │──│ Strategy        │ │
│  └────────────┘  └────────┬────────┘ │
│                           │           │
│                    ┌──────┴──────┐    │
│                    │             │    │
│                    ▼             ▼    │
│              ┌──────────┐ ┌────────┐ │
│              │ Execute  │ │Escalate│ │
│              │ Repair   │ │to Human│ │
│              └────┬─────┘ └────────┘ │
│                   │                   │
│              ┌────┴────┐             │
│              │         │             │
│              ▼         ▼             │
│         Success   Failed (retry)     │
└──────────────────────────────────────┘
```

---

## 2. Failure Classification

### 2.1 Failure Types

| Type | Description | Examples | Repairable |
|---|---|---|---|
| `transient` | Temporary failure, likely to succeed on retry | Model API timeout, network error, rate limit | Yes (retry) |
| `permanent` | Persistent failure, requires code change | Lint error, type error, test failure, build error | Yes (repair session) |
| `systemic` | Platform-level failure, affects all pipelines | Event bus down, memory corruption, model unavailable | No (escalate) |
| `unknown` | Cannot classify, insufficient information | Unexpected error format, corrupted output | Partial (attempt repair) |

### 2.2 Classification Logic

```typescript
function classifyFailure(error: Error): FailureType {
  // Systemic failures
  if (isEventBusDown(error)) return 'systemic';
  if (isMemoryCorrupted(error)) return 'systemic';
  if (isModelUnavailable(error)) return 'systemic';

  // Transient failures
  if (isTimeout(error)) return 'transient';
  if (isRateLimit(error)) return 'transient';
  if (isNetworkError(error)) return 'transient';

  // Permanent failures
  if (isLintError(error)) return 'permanent';
  if (isTypeError(error)) return 'permanent';
  if (isTestFailure(error)) return 'permanent';
  if (isBuildError(error)) return 'permanent';

  // Unknown
  return 'unknown';
}
```

---

## 3. Repair Strategies

### 3.1 Strategy Selection

| Failure Type | Strategy | Max Attempts |
|---|---|---|
| `transient` | Retry with exponential backoff | 3 |
| `permanent` | Repair session (analyze + fix) | 3 |
| `systemic` | Escalate immediately | 0 |
| `unknown` | Attempt repair session | 2 |

### 3.2 Retry Strategy (Transient)

```
Failure (transient)
  │
  ▼
Wait: baseDelay * 2^(attempt-1) + jitter
  │
  ▼
Retry operation
  │
  ├── Success ──► Resume pipeline
  │
  └── Failed ──► Increment attempt
                  │
            ┌─────┴─────┐
            │           │
        attempt < 3   attempt >= 3
            │           │
            ▼           ▼
         Retry       Escalate
```

**Backoff Configuration:**
- Base delay: 10 seconds.
- Multiplier: 2 (exponential).
- Max delay: 60 seconds.
- Jitter: 0-5 seconds (random).

### 3.3 Repair Session Strategy (Permanent)

```
Failure (permanent)
  │
  ▼
Create recovery session
  │
  ▼
Session receives:
  - Failure report (error output, context)
  - Current code state
  - Original spec and plan
  │
  ▼
Recovery session:
  1. Analyzes failure
  2. Identifies root cause
  3. Generates fix
  4. Applies fix
  │
  ▼
Re-verify (run verification again)
  │
  ├── Pass ──► Resume pipeline
  │
  └── Fail ──► Increment attempt
                │
          ┌─────┴─────┐
          │           │
      attempt < 3   attempt >= 3
          │           │
          ▼           ▼
       New repair   Escalate
       session
```

### 3.4 Repair Session Configuration

```typescript
interface RepairSessionConfig {
  role: 'recovery';
  input: {
    failureReport: string;
    errorOutput: string;
    currentCodeState: string;
    specContent: string;
    planContent: string;
  };
  tools: ['read', 'write', 'edit', 'bash'];
  constraints: {
    maxFilesToModify: 10;
    noNewFiles: boolean;
    noConfigChanges: boolean;
  };
}
```

---

## 4. Escalation Logic

### 4.1 Escalation Triggers

| Trigger | Escalation Level | Action |
|---|---|---|
| Systemic failure | Immediate | Alert human, pause pipeline |
| Repair exhausted (3 attempts) | After repair | Alert human, pause pipeline |
| Unknown failure (2 attempts) | After repair | Alert human, pause pipeline |
| Session restart exhausted (2 restarts) | After recovery | Alert human, pause pipeline |
| Human approval denied | Immediate | Reject pipeline, notify |
| Phase gate failed | Immediate | Block pipeline, list issues |

### 4.2 Escalation Payload

```typescript
interface EscalationPayload {
  pipelineId: string;
  specId: string;
  stage: string;
  failureType: FailureType;
  failureReport: string;
  repairAttempts: number;
  repairReports: RepairReport[];
  recommendation: string;
  timestamp: string;
}
```

### 4.3 Escalation Channels

| Channel | Use Case |
|---|---|
| TUI prompt | Local development, interactive approval |
| GitHub issue | Production, async review |
| Email notification | Critical failures |
| Slack webhook | Team notification |

---

## 5. Rollback Procedures

### 5.1 Rollback Triggers

| Trigger | Rollback Type |
|---|---|
| Merge caused production issue | Full rollback |
| Implementation broke existing tests | Branch rollback |
| Repair session made things worse | Session rollback |

### 5.2 Branch Rollback

```
Branch Rollback
  │
  ▼
1. Identify last good commit on main
  │
  ▼
2. Create rollback branch from last good commit
  │
  ▼
3. Revert problematic changes
  │
  ▼
4. Create rollback PR
  │
  ▼
5. Human approval and merge
```

### 5.3 Session Rollback

```
Session Rollback
  │
  ▼
1. Discard session output
  │
  ▼
2. Restore files to pre-session state
  │
  ▼
3. Create new session with adjusted context
  │
  ▼
4. Retry operation
```

### 5.4 Rollback Plan Schema

Rollback plans follow the `RollbackPlan` structured output schema (see `STRUCTURED_OUTPUT_SCHEMAS.md`).

---

## 6. Recovery State Machine

```
                    ┌─────────────┐
                    │   IDLE      │ ← No active failures
                    └──────┬──────┘
                           │ failure detected
                           ▼
                    ┌─────────────┐
                    │ DETECTING   │ ← Classifying failure
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │TRANSIENT │  │PERMANENT │
              └────┬─────┘  └────┬─────┘
                   │             │
                   ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ RETRYING │  │REPAIRING │
              └────┬─────┘  └────┬─────┘
                   │             │
              ┌────┴────┐   ┌────┴────┐
              │         │   │         │
              ▼         ▼   ▼         ▼
         ┌──────┐ ┌────────┐┌──────┐┌──────────┐
         │RESUME││ESCALATE││RETRY ││ESCALATE  │
         └──────┘└────────┘└──────┘└──────────┘
              │         │   │         │
              ▼         ▼   ▼         ▼
         ┌──────────────────────────────────┐
         │          ESCALATED               │ ← Human intervention required
         └──────────────────────────────────┘
```

---

## 7. Recovery Metrics

| Metric | Type | Description |
|---|---|---|
| `recovery_attempt_total` | Counter | Total recovery attempts |
| `recovery_success_total` | Counter | Successful recoveries |
| `recovery_escalation_total` | Counter | Escalations to human |
| `recovery_duration_seconds` | Histogram | Time to recover |
| `repair_attempt_total` | Counter | Repair session attempts |
| `repair_success_total` | Counter | Successful repairs |
| `retry_total` | Counter | Retry attempts |
| `rollback_total` | Counter | Rollback operations |

---

## 8. Recovery Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Infinite repair loops | Wastes resources, never resolves | Max 3 attempts, then escalate |
| No failure classification | Wrong repair strategy | Mandatory classification |
| Repair without context | Cannot fix root cause | Include failure report, code state |
| Escalating too early | Unnecessary human intervention | Retry transient failures first |
| Escalating too late | Wasted time on unfixable issues | Immediate escalation for systemic |
| No rollback plan | Cannot undo damage | Always generate rollback plan |
| Silent failures | No visibility | All failures emit events |

---

## 9. Deadlock Handling

### 9.1 Deadlock Types

| Type | Description | Detection | Resolution |
|---|---|---|---|
| Pipeline deadlock | Pipeline stuck in state with no progress | Timeout on stage duration | Force transition to FAILED, escalate |
| Session deadlock | Session not responding to prompts | Idle timeout + no tool calls | Kill session, restart |
| Event bus deadlock | Events not being delivered | Delivery timeout | Flush local queue, reconnect |
| Memory deadlock | Memory sync blocked by conflict | Conflict detection timeout | Force resolve with last-write-wins |
| Resource deadlock | All pipeline slots occupied, new pipeline waiting | Queue depth > threshold | Prioritize queue, cancel lowest priority |

### 9.2 Deadlock Detection

```typescript
interface DeadlockDetector {
  // Check for pipeline deadlocks
  checkPipelineDeadlocks(): DeadlockReport[];

  // Check for session deadlocks
  checkSessionDeadlocks(): DeadlockReport[];

  // Check for resource deadlocks
  checkResourceDeadlocks(): DeadlockReport[];
}

interface DeadlockReport {
  type: 'pipeline' | 'session' | 'event-bus' | 'memory' | 'resource';
  entityId: string;
  detectedAt: string;
  duration: number;
  resolution: 'force-fail' | 'restart' | 'flush' | 'force-resolve' | 'cancel';
}
```

### 9.3 Deadlock Resolution

| Resolution | When | Action |
|---|---|---|
| Force fail | Pipeline stuck > stage timeout | Transition to FAILED, emit event |
| Restart | Session unresponsive > idle timeout | Kill and restart session |
| Flush | Event bus disconnected > 30s | Flush local queue, reconnect |
| Force resolve | Memory conflict > 10s | Last-write-wins with event ordering |
| Cancel | Resource deadlock > 5 min | Cancel lowest priority pipeline |

---

## 10. Degraded Modes

### 10.1 Degraded Mode Types

| Mode | Trigger | Behavior | Recovery |
|---|---|---|---|
| **No Model** | Model API unavailable | Queue all sessions, retry with backoff | Resume when model available |
| **No Event Bus** | Event bus disconnected | Queue events locally, process sequentially | Flush on reconnect |
| **No Memory** | Memory corruption detected | Use last known good checkpoint | Rebuild from event history |
| **No Playwright** | Playwright unavailable | Skip UI verification, mark as skipped | Retry on next pipeline |
| **No GitHub** | GitHub API unavailable | Queue Git operations, retry | Flush on reconnect |
| **Low Resources** | Disk space < 10% | Skip archival, compress artifacts | Free space, resume archival |

### 10.2 Degraded Mode Transitions

```
Normal Operation
  │
  ▼ (failure detected)
Degraded Mode
  │
  ├── Operate with reduced capabilities
  ├── Emit DEGRADED_MODE event
  ├── Alert human if critical
  │
  ▼ (failure resolved)
Recovery
  │
  ├── Flush queued operations
  ├── Rebuild state from history
  ├── Verify consistency
  │
  ▼
Normal Operation
```

### 10.3 Degraded Mode Events

| Event | Payload | Emitted When |
|---|---|---|
| `DEGRADED_MODE_ENTERED` | `{mode, reason, impact}` | Entered degraded mode |
| `DEGRADED_MODE_EXITED` | `{mode, duration, recovered}` | Exited degraded mode |
| `DEGRADED_MODE_OPERATION` | `{mode, operation, result}` | Operation in degraded mode |
