# Session Lifecycle

> **Purpose:** Define OpenCode session states, transitions, and management within the AI Engineering Platform.
> **Scope:** Session states, events, health monitoring, cleanup, and recovery.

---

## 1. Session State Machine

```
                    ┌─────────────┐
                    │   PENDING   │ ← Session created, not yet started
                    └──────┬──────┘
                           │ start()
                           ▼
                    ┌─────────────┐
              ┌─────│  STARTING   │ ← Context loading, model connection
              │     └──────┬──────┘
              │            │ onReady()
              │            ▼
              │     ┌─────────────┐
              │     │   ACTIVE    │ ← Processing prompts, executing tools
              │     └──────┬──────┘
              │            │
              │     ┌──────┴──────┐
              │     │             │
              │     ▼             ▼
              │ ┌──────┐    ┌──────────┐
              │ │PAUSED│    │ COMPLETING│ ← Wrapping up, collecting output
              │ └──┬───┘    └────┬─────┘
              │    │ resume()    │ onEnd()
              │    ▼             ▼
              │ ┌──────┐    ┌──────────┐
              │ │ACTIVE│    │COMPLETED │ ← Final state
              │ └──────┘    └──────────┘
              │
              │     ┌──────────┐
              └─────│  FAILED  │ ← Final state
                    └──────────┘
```

### 1.1 State Definitions

| State | Description | Transitions |
|---|---|---|
| `PENDING` | Session created but not started. Waiting for resources. | → STARTING |
| `STARTING` | Loading context, connecting to model, initializing tools. | → ACTIVE, → FAILED |
| `ACTIVE` | Processing prompts, executing tool calls, generating responses. | → PAUSED, → COMPLETING, → FAILED |
| `PAUSED` | Session temporarily suspended (awaiting human input, rate limit). | → ACTIVE, → FAILED |
| `COMPLETING` | Wrapping up, collecting final output, cleaning up resources. | → COMPLETED, → FAILED |
| `COMPLETED` | Session finished successfully. Output captured. | Terminal |
| `FAILED` | Session failed. Error recorded. Recovery may be attempted. | Terminal |

### 1.2 State Transition Events

| Transition | Event Emitted | Trigger |
|---|---|---|
| PENDING → STARTING | `SESSION_STARTING` | `session.start()` called |
| STARTING → ACTIVE | `SESSION_STARTED` | Context loaded, model connected |
| STARTING → FAILED | `SESSION_FAILED` | Context load or model connection failed |
| ACTIVE → PAUSED | `SESSION_PAUSED` | Human input requested, rate limit hit |
| PAUSED → ACTIVE | `SESSION_RESUMED` | Input received, rate limit cleared |
| ACTIVE → COMPLETING | `SESSION_COMPLETING` | Task complete, wrapping up |
| ACTIVE → FAILED | `SESSION_FAILED` | Unrecoverable error during execution |
| COMPLETING → COMPLETED | `SESSION_COMPLETED` | Output captured, resources cleaned |
| COMPLETING → FAILED | `SESSION_FAILED` | Error during wrap-up |

---

## 2. Session Creation

### 2.1 Creation Flow

```
Pipeline Engine
  │
  ▼ (requests session for stage)
Session Manager
  │
  ├── 1. Select role configuration
  ├── 2. Load system prompt
  ├── 3. Load project context
  ├── 4. Load spec content
  ├── 5. Load memory state
  ├── 6. Create SDK session
  ├── 7. Set tool permissions
  ├── 8. Set model parameters
  ├── 9. Register event handlers
  └── 10. Return session handle
  │
  ▼
Session (PENDING)
```

### 2.2 Session Handle

```typescript
interface SessionHandle {
  id: string;
  role: RuntimeRole;
  state: SessionState;
  pipelineId: string;
  stage: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: SessionError;
  output?: SessionOutput;
  metrics: SessionMetrics;
}
```

### 2.3 Session Context Assembly

Context is assembled from multiple sources:

```
System Prompt (role-specific)
  +
Project Context (.opencode/ runtime files)
  +
Spec Content (the spec being worked on)
  +
Memory State (.opencode/memory/ key values)
  +
File Context (relevant source files)
  +
Previous Session Output (if continuing from prior stage)
  =
Full Session Context
```

**Context Assembly Rules:**
- System prompt is always included (highest priority).
- Project context is included in summarized form.
- Spec content is always included in full.
- Memory includes only relevant keys (phase, active specs, decisions).
- File context is limited to files relevant to the current task.
- Previous session output is included when stages are sequential.

---

## 3. Session Execution

### 3.1 Prompt Execution Flow

```
Session Manager
  │
  ▼ (send prompt)
SDK Session
  │
  ▼ (AI processes prompt)
AI Model
  │
  ├──► Tool Call ──► Tool Router ──► Execute ──► Return Result ──► AI Model
  │                                                                │
  ├──► Tool Call ──► ...                                           │
  │                                                                │
  └──► Final Response ──► Structured Output Validator ──► Session Manager
```

### 3.2 Tool Call Handling

When the AI model generates a tool call:

1. **Intercept:** Session intercepts the tool call.
2. **Validate:** Tool Router checks permission for this role.
3. **Execute:** If allowed, tool executes with constraints.
4. **Log:** Tool call and result are logged.
5. **Return:** Result returned to AI model.
6. **Emit:** `TOOL_CALL_COMPLETED` event emitted.

### 3.3 Response Handling

When the AI model generates a final response:

1. **Capture:** Session captures the response.
2. **Parse:** Structured Output Parser extracts typed data.
3. **Validate:** Output validated against schema.
4. **Store:** Valid output stored in session handle.
5. **Emit:** `SESSION_OUTPUT_READY` event emitted.

---

## 4. Session Health Monitoring

### 4.1 Health Checks

| Check | Frequency | Failure Action |
|---|---|---|
| Model connection | Every 30s | Retry connection, pause session |
| Tool execution timeout | Per call | Kill tool, return error to AI |
| Session idle timeout | 5 min | Emit warning, then pause |
| Session total timeout | 30 min | Force complete or fail |
| Memory usage | Every 1 min | Log warning, fail if exceeded |
| Event emission | Continuous | Queue locally, flush on reconnect |

### 4.2 Health Status

```typescript
interface SessionHealth {
  sessionId: string;
  state: SessionState;
  modelConnected: boolean;
  lastActivityAt: Date;
  idleMinutes: number;
  totalMinutes: number;
  toolCallsInFlight: number;
  memoryUsageMB: number;
  errorCount: number;
  isHealthy: boolean;
}
```

### 4.3 Timeout Handling

| Timeout Type | Duration | Action |
|---|---|---|
| Tool call timeout | 60s (default) | Kill tool, return error |
| Idle timeout | 5 min | Warning → Pause at 10 min |
| Session timeout | 30 min | Force complete, capture partial output |
| Pipeline stage timeout | 15 min | Fail stage, trigger recovery |

---

## 5. Session Recovery

### 5.1 Recovery Triggers

| Trigger | Recovery Action |
|---|---|
| Model disconnect | Reconnect, resume from last prompt |
| Tool execution failure | Retry tool (max 3), then fail |
| Session crash | Restart session, replay context |
| Output validation failure | Request regeneration (max 3) |
| Timeout | Capture partial output, fail gracefully |

### 5.2 Recovery Flow

```
Session Failed
  │
  ▼
Recovery Engine
  │
  ├── Classify failure (transient/permanent/systemic)
  │
  ├── Transient? ──► Retry (reconnect, resume)
  │
  ├── Permanent? ──► Create recovery session
  │                    │
  │                    ▼
  │              Recovery session attempts fix
  │                    │
  │              ┌─────┴─────┐
  │              │           │
  │           Success      Failed (after max attempts)
  │              │           │
  │              ▼           ▼
  │        Resume original  Escalate to human
  │
  └── Systemic? ──► Escalate to human immediately
```

### 5.3 Recovery Limits

| Limit | Value | Rationale |
|---|---|---|
| Max retries per tool call | 3 | Prevent infinite retry loops |
| Max output regeneration | 3 | Prevent infinite regeneration |
| Max recovery sessions per pipeline | 3 | Prevent runaway repair |
| Max session restarts | 2 | After 2 restarts, escalate |

---

## 6. Session Cleanup

### 6.1 Cleanup Actions

When a session completes or fails:

1. **Capture Output:** Store final output in session handle.
2. **Log Metrics:** Record duration, tool calls, token usage.
3. **Emit Event:** `SESSION_COMPLETED` or `SESSION_FAILED`.
4. **Clean Resources:** Close model connection, release tools.
5. **Update Pipeline:** Notify pipeline engine of session result.
6. **Archive:** Move session to archive storage.

### 6.2 Session Archive

```typescript
interface SessionArchive {
  id: string;
  role: RuntimeRole;
  pipelineId: string;
  stage: string;
  state: 'completed' | 'failed';
  duration: number;
  toolCalls: number;
  tokenUsage: number;
  output: SessionOutput | null;
  error: SessionError | null;
  createdAt: Date;
  archivedAt: Date;
}
```

**Retention:** Session archives are retained for 90 days for audit and replay.

---

## 7. Session Events

### 7.1 Complete Event List

| Event | Payload | Emitted When |
|---|---|---|
| `SESSION_CREATED` | `{sessionId, role, pipelineId, stage}` | Session handle created |
| `SESSION_STARTING` | `{sessionId}` | `start()` called |
| `SESSION_STARTED` | `{sessionId, model, contextSize}` | Context loaded, model connected |
| `SESSION_PAUSED` | `{sessionId, reason}` | Session paused |
| `SESSION_RESUMED` | `{sessionId}` | Session resumed |
| `SESSION_COMPLETING` | `{sessionId}` | Wrapping up |
| `SESSION_COMPLETED` | `{sessionId, output, metrics}` | Session finished successfully |
| `SESSION_FAILED` | `{sessionId, error, recoveryAttempted}` | Session failed |
| `SESSION_OUTPUT_READY` | `{sessionId, output, schema}` | Output validated and ready |
| `TOOL_CALL_STARTED` | `{sessionId, tool, args}` | Tool call initiated |
| `TOOL_CALL_COMPLETED` | `{sessionId, tool, result, duration}` | Tool call finished |
| `TOOL_CALL_DENIED` | `{sessionId, tool, reason}` | Tool call denied by governance |

### 7.2 Event Correlation

All session events include:
- `correlationId`: Pipeline ID (links all events in a pipeline).
- `causationId`: Parent event ID (links cause and effect).
- `sessionId`: Session ID (links events to a session).
- `timestamp`: ISO 8601 timestamp.

---

## 8. Multi-Session Coordination

### 8.1 Session Dependencies

Sessions within a pipeline may have dependencies:

```
Session A (architect: plan)
  └──► Session B (coder: implement)  ── depends on A's output
        ├──► Session C (verifier: test)
        ├──► Session D (verifier: lint)  ── C and D run in parallel
        └──► Session E (verifier: build)
              └──► Session F (reviewer: review)  ── depends on C, D, E
```

### 8.2 Dependency Resolution

The Session Manager tracks dependencies:
- Sessions wait for dependencies to complete.
- Parallel sessions start when all prerequisites are met.
- If a dependency fails, dependent sessions are cancelled.
- Dependency graph is validated before pipeline starts.

### 8.3 Session Communication

Sessions communicate through:
- **Output Passing:** Session A's output is passed to Session B's context.
- **Event Bus:** Sessions emit events that other sessions can subscribe to.
- **Shared State:** Memory is updated between sessions for persistent state.

---

## 9. Session Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Oversized context | Model confusion, token waste | Context summarization, relevance filtering |
| Unbounded tool calls | Runaway sessions, cost explosion | Tool call limits, timeouts |
| No output validation | Garbage downstream | Mandatory structured output validation |
| Ignoring idle sessions | Resource waste | Idle detection, auto-pause |
| No recovery plan | Permanent failures | Defined recovery strategies per failure type |
| Skipping cleanup | Resource leaks | Mandatory cleanup in all terminal states |
| Concurrent writes to same file | Race conditions, corruption | File locking, sequential writes |
