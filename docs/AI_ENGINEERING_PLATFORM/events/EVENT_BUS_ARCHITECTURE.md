# Event Bus Architecture

> **Purpose:** Define the event-driven communication layer for the AI Engineering Platform.
> **Scope:** Event types, routing, subscriptions, persistence, replay, and delivery guarantees.

---

## 1. Event Bus Overview

The Event Bus is the central nervous system of the AI Engineering Platform. All components communicate through events, enabling loose coupling, observability, and replayability.

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Pipeline │     │ Session  │     │Governance│
│ Engine   │     │ Manager  │     │ System   │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     ▼                ▼                ▼
┌─────────────────────────────────────────────────┐
│                   EVENT BUS                     │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Router   │  │ Filter   │  │ Serializer   │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │             │               │           │
│  ┌────┴─────────────┴───────────────┴───────┐  │
│  │              Event Store                 │  │
│  │  (persistent, append-only, ordered)      │  │
│  └──────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │ fan-out
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────┐
│Recovery │   │ Memory   │   │Observ-   │
│ Engine  │   │ Sync     │   │ability   │
└─────────┘   └──────────┘   └──────────┘
```

---

## 2. Event Structure

### 2.1 Base Event

```typescript
interface BaseEvent {
  id: string;              // Unique event ID (UUID v7)
  type: EventType;         // Event type string
  version: number;         // Event schema version
  timestamp: string;       // ISO 8601 timestamp
  correlationId: string;   // Pipeline ID (groups related events)
  causationId: string | null; // Parent event ID (cause-effect chain)
  source: string;          // Component that emitted the event
  payload: Record<string, unknown>; // Event-specific data
  metadata: {
    environment: string;   // dev, staging, production
    platformVersion: string;
    modelProvider?: string;
    modelName?: string;
  };
}
```

### 2.2 Event Type Naming Convention

Event types follow the pattern: `{DOMAIN}_{ACTION}`

| Domain | Examples |
|---|---|
| `SESSION` | `SESSION_STARTED`, `SESSION_COMPLETED`, `SESSION_FAILED` |
| `PIPELINE` | `PIPELINE_CREATED`, `PIPELINE_STAGE_COMPLETED`, `PIPELINE_FAILED` |
| `SPEC` | `SPEC_VALIDATED`, `SPEC_REJECTED` |
| `VERIFICATION` | `VERIFICATION_STARTED`, `VERIFICATION_PASSED`, `VERIFICATION_FAILED` |
| `REVIEW` | `REVIEW_STARTED`, `REVIEW_PASSED`, `REVIEW_FAILED` |
| `REPAIR` | `REPAIR_LOOP_STARTED`, `REPAIR_LOOP_COMPLETED`, `REPAIR_EXHAUSTED` |
| `GOVERNANCE` | `GOVERNANCE_PASSED`, `GOVERNANCE_FAILED`, `APPROVAL_GRANTED` |
| `GITHUB` | `BRANCH_CREATED`, `PR_GENERATED`, `PR_MERGED` |
| `PLAYWRIGHT` | `PLAYWRIGHT_TEST_PASSED`, `PLAYWRIGHT_TEST_FAILED` |
| `SYSTEM` | `SYSTEM_HEALTH_CHECK`, `SYSTEM_ERROR`, `SYSTEM_SHUTDOWN` |

---

## 3. Event Categories

### 3.1 Pipeline Events

| Event | Payload | Description |
|---|---|---|
| `PIPELINE_CREATED` | `{specId, phase, priority}` | New pipeline instance created |
| `PIPELINE_VALIDATING` | `{}` | Validation stage started |
| `PIPELINE_READY` | `{plan}` | Validation passed, ready to start |
| `PIPELINE_REJECTED` | `{reason, details}` | Validation failed |
| `PIPELINE_STARTED` | `{}` | Pipeline execution started |
| `PIPELINE_STAGE_STARTED` | `{stage, config}` | Stage execution started |
| `PIPELINE_STAGE_COMPLETED` | `{stage, output, duration}` | Stage completed successfully |
| `PIPELINE_STAGE_FAILED` | `{stage, error, retryCount}` | Stage failed |
| `PIPELINE_REPAIR_STARTED` | `{stage, attempt, failureReason}` | Repair loop started |
| `PIPELINE_REPAIR_COMPLETED` | `{stage, attempt, fixDescription}` | Repair successful |
| `PIPELINE_REPAIR_EXHAUSTED` | `{stage, attempts, failures}` | All repair attempts failed |
| `PIPELINE_COMPLETED` | `{prUrl, prNumber, metrics}` | Pipeline finished successfully |
| `PIPELINE_FAILED` | `{stage, error, recoveryAttempted}` | Pipeline failed unrecoverably |
| `PIPELINE_CANCELLED` | `{reason, cancelledBy}` | Pipeline manually cancelled |
| `PIPELINE_QUEUED` | `{position, estimatedStart}` | Pipeline waiting for slot |

### 3.2 Session Events

| Event | Payload | Description |
|---|---|---|
| `SESSION_CREATED` | `{sessionId, role, pipelineId, stage}` | Session handle created |
| `SESSION_STARTING` | `{sessionId}` | Session starting |
| `SESSION_STARTED` | `{sessionId, model, contextSize}` | Session active |
| `SESSION_PAUSED` | `{sessionId, reason}` | Session paused |
| `SESSION_RESUMED` | `{sessionId}` | Session resumed |
| `SESSION_COMPLETING` | `{sessionId}` | Session wrapping up |
| `SESSION_COMPLETED` | `{sessionId, output, metrics}` | Session finished |
| `SESSION_FAILED` | `{sessionId, error, recoveryAttempted}` | Session failed |
| `SESSION_OUTPUT_READY` | `{sessionId, output, schema}` | Output validated |
| `TOOL_CALL_STARTED` | `{sessionId, tool, args}` | Tool call initiated |
| `TOOL_CALL_COMPLETED` | `{sessionId, tool, result, duration}` | Tool call finished |
| `TOOL_CALL_DENIED` | `{sessionId, tool, reason}` | Tool call denied |

### 3.3 Verification Events

| Event | Payload | Description |
|---|---|---|
| `VERIFICATION_STARTED` | `{checks}` | Verification started |
| `VERIFICATION_PASSED` | `{results}` | All checks passed |
| `VERIFICATION_FAILED` | `{failures}` | One or more checks failed |
| `VERIFICATION_CHECK_PASSED` | `{checkType, duration}` | Individual check passed |
| `VERIFICATION_CHECK_FAILED` | `{checkType, error, details}` | Individual check failed |

### 3.4 Review Events

| Event | Payload | Description |
|---|---|---|
| `REVIEW_STARTED` | `{reviewTypes}` | Review started |
| `REVIEW_PASSED` | `{results}` | All reviews passed |
| `REVIEW_FAILED` | `{failures}` | One or more reviews failed |
| `REVIEW_COMPLETED` | `{reviewType, result, findings}` | Individual review completed |

### 3.5 Governance Events

| Event | Payload | Description |
|---|---|---|
| `GOVERNANCE_PASSED` | `{checks}` | All governance checks passed |
| `GOVERNANCE_FAILED` | `{failures}` | One or more checks failed |
| `APPROVAL_REQUESTED` | `{checkpoint, details}` | Human approval requested |
| `APPROVAL_GRANTED` | `{checkpoint, approvedBy}` | Human approved |
| `APPROVAL_DENIED` | `{checkpoint, deniedBy, reason}` | Human denied |
| `PHASE_GATE_PASSED` | `{phase}` | Phase gate passed |
| `PHASE_GATE_FAILED` | `{phase, blockingIssues}` | Phase gate failed |

### 3.6 GitHub Events

| Event | Payload | Description |
|---|---|---|
| `BRANCH_CREATED` | `{branchName, baseBranch, commitSha}` | Git branch created |
| `BRANCH_FAILED` | `{branchName, error}` | Branch creation failed |
| `COMMIT_CREATED` | `{commitSha, message, files}` | Commit created |
| `PR_GENERATED` | `{prNumber, prUrl, title, body}` | Pull request created |
| `PR_FAILED` | `{error}` | PR creation failed |
| `PR_MERGED` | `{prNumber, mergeCommitSha}` | PR merged |
| `MERGE_FAILED` | `{prNumber, error}` | Merge failed |
| `BRANCH_CLEANED` | `{branchName}` | Branch cleaned up |

### 3.7 Playwright Events

| Event | Payload | Description |
|---|---|---|
| `PLAYWRIGHT_STARTED` | `{testSuite}` | Playwright test suite started |
| `PLAYWRIGHT_PASSED` | `{results}` | All tests passed |
| `PLAYWRIGHT_FAILED` | `{failures}` | One or more tests failed |
| `PLAYWRIGHT_TEST_PASSED` | `{testName, duration}` | Individual test passed |
| `PLAYWRIGHT_TEST_FAILED` | `{testName, error, screenshot}` | Individual test failed |
| `PLAYWRIGHT_SCREENSHOT_CAPTURED` | `{testName, screenshotPath}` | Screenshot captured |

### 3.8 Context Events

| Event | Payload | Description |
|---|---|---|
| `CONTEXT_ASSEMBLED` | `{sessionId, hotTokens, warmTokens, coldTokens, totalTokens}` | Context assembly complete |
| `CONTEXT_BUDGET_WARNING` | `{sessionId, utilization, action}` | Budget utilization > 80% |
| `CONTEXT_BUDGET_CRITICAL` | `{sessionId, utilization, action}` | Budget utilization > 95% |
| `CONTEXT_COMPACTED` | `{sessionId, beforeTokens, afterTokens, strategy}` | Context compaction complete |
| `COMPACTION_TRIGGERED` | `{sessionId, reason, tokenCount, budget}` | Compaction started |
| `KNOWLEDGE_EXTRACTED` | `{sessionId, type, content, confidence}` | Knowledge extracted |

### 3.9 Memory Events

| Event | Payload | Description |
|---|---|---|
| `MEMORY_UPDATED` | `{tier, key, checksum}` | Memory tier updated |
| `MEMORY_SYNC_STARTED` | `{source, target, event}` | Sync operation started |
| `MEMORY_SYNC_COMPLETED` | `{source, target, changes}` | Sync operation completed |
| `MEMORY_CONFLICT_DETECTED` | `{key, expected, actual, resolution}` | Conflict detected |
| `MEMORY_CORRUPTION_DETECTED` | `{tier, key, expectedChecksum, actualChecksum}` | Corruption detected |
| `MEMORY_RESTORED` | `{tier, key, fromCheckpoint}` | Memory restored from checkpoint |
| `CHECKPOINT_CREATED` | `{pipelineId, stage, checkpointId}` | Checkpoint saved |
| `KNOWLEDGE_STORED` | `{type, content, source}` | Knowledge stored in project memory |

### 3.10 Knowledge Graph Events

| Event | Payload | Description |
|---|---|---|
| `GRAPH_NODE_CREATED` | `{nodeId, type, properties}` | New node added |
| `GRAPH_NODE_UPDATED` | `{nodeId, changes}` | Node properties updated |
| `GRAPH_EDGE_CREATED` | `{from, to, type, properties}` | New edge added |
| `GRAPH_EDGE_REMOVED` | `{from, to, type}` | Edge removed |
| `GRAPH_INFERRED_EDGES` | `{edges, rule}` | Inferred edges created |
| `GRAPH_TRAVERSAL` | `{startId, depth, resultCount}` | Traversal completed |
| `GRAPH_QUERY` | `{queryType, resultCount, duration}` | Query completed |

### 3.11 Artifact Events

| Event | Payload | Description |
|---|---|---|
| `ARTIFACT_CREATED` | `{artifactId, type, pipelineId, stage}` | Artifact produced |
| `ARTIFACT_VALIDATED` | `{artifactId, schema, version}` | Schema validation passed |
| `ARTIFACT_INVALID` | `{artifactId, schema, errors}` | Schema validation failed |
| `ARTIFACT_INDEXED` | `{artifactId, indexes}` | Artifact indexed |
| `ARTIFACT_CONSUMED` | `{artifactId, consumer}` | Artifact consumed |
| `ARTIFACT_ARCHIVED` | `{artifactId, archivePath}` | Artifact archived |
| `ARTIFACT_EXPIRED` | `{artifactId, reason}` | Artifact deleted |
| `ARTIFACT_VERSIONED` | `{artifactId, version, reason}` | New version created |

### 3.12 Replay Events

| Event | Payload | Description |
|---|---|---|
| `REPLAY_STARTED` | `{sessionId, mode, replaySessionId}` | Replay initiated |
| `REPLAY_TURN_REPLAYED` | `{sessionId, turnNumber, mode}` | Turn replayed |
| `REPLAY_TOOL_CALL_REPLAYED` | `{sessionId, toolCallId, match}` | Tool call replayed |
| `REPLAY_DIVERGENCE` | `{sessionId, turnNumber, type, expected, actual}` | Divergence detected |
| `REPLAY_COMPLETE` | `{sessionId, mode, divergences, matchPercentage}` | Replay finished |
| `REPLAY_FAILED` | `{sessionId, reason, error}` | Replay failed |
| `REPLAY_BRANCH_CREATED` | `{sessionId, branchSessionId, turnNumber}` | Branch created from replay |

### 3.13 Observability Events

| Event | Payload | Description |
|---|---|---|
| `METRICS_EXPORTED` | `{format, metricCount}` | Metrics exported |
| `LOG_ROTATED` | `{logType, date}` | Log file rotated |
| `TRACE_COMPLETED` | `{traceId, spanCount, duration}` | Trace completed |
| `ALERT_TRIGGERED` | `{alertName, severity, condition}` | Alert triggered |
| `DASHBOARD_UPDATED` | `{metrics, pipelineCount}` | Dashboard refreshed |

---

## 4. Event Routing

### 4.1 Subscription Model

Components subscribe to event types:

```typescript
interface Subscription {
  id: string;
  eventTypes: EventType[];    // Types to subscribe to
  handler: (event: BaseEvent) => Promise<void>;
  filter?: (event: BaseEvent) => boolean; // Optional filter
  maxRetries: number;
  retryDelay: number;
}
```

### 4.2 Built-in Subscriptions

| Subscriber | Subscribes To | Action |
|---|---|---|
| Pipeline Engine | `PIPELINE_*`, `SESSION_COMPLETED`, `SESSION_FAILED` | State transitions |
| Session Manager | `PIPELINE_STAGE_STARTED`, `PIPELINE_STAGE_COMPLETED` | Session lifecycle |
| Governance System | `PIPELINE_*`, `SESSION_*` | Gate checks |
| Recovery Engine | `*_FAILED`, `PIPELINE_REPAIR_*` | Failure detection and repair |
| Memory Sync | `PIPELINE_COMPLETED`, `SESSION_COMPLETED`, `GOVERNANCE_*` | State persistence |
| Observability | All events | Metrics, logs, traces |
| Event Store | All events | Persistence |

### 4.3 Fan-Out Pattern

When an event is published:
1. Event Bus receives the event.
2. Event Bus serializes and stores the event.
3. Event Bus finds all matching subscriptions.
4. Event Bus delivers to each subscriber (parallel).
5. Event Bus tracks delivery status per subscriber.

---

## 5. Event Persistence

### 5.1 Event Store

All events are persisted in an append-only, ordered event store:

```typescript
interface EventStoreEntry {
  sequenceNumber: number;    // Monotonically increasing
  event: BaseEvent;
  storedAt: string;          // ISO 8601
  checksum: string;          // Integrity check
}
```

### 5.2 Storage Backend

| Environment | Backend | Rationale |
|---|---|---|
| Local Development | In-memory + JSON file | Simplicity, no dependencies |
| Production | Redis Streams + PostgreSQL | Performance + durability |

### 5.3 Retention Policy

| Data | Retention | Rationale |
|---|---|---|
| Active pipeline events | Until pipeline completes | Needed for execution |
| Completed pipeline events | 90 days | Audit and replay |
| Failed pipeline events | 180 days | Debugging and analysis |
| System events | 30 days | Operational monitoring |

---

## 6. Event Replay

### 6.1 Replay Use Cases

| Use Case | Description |
|---|---|
| Pipeline Replay | Re-execute a pipeline from event history |
| Debugging | Replay events to understand failure |
| Audit | Reconstruct pipeline execution history |
| Recovery | Restore state from event history |
| Testing | Replay production events in staging |

### 6.2 Replay Mechanism

```
Event Store
  │
  ▼ (query by correlationId)
Filtered Events (ordered by sequenceNumber)
  │
  ▼ (replay)
Event Bus (re-publishes events)
  │
  ▼
Subscribers (process events as if new)
```

### 6.3 Replay Guarantees

- Events are replayed in exact order.
- Events are replayed with original payloads.
- Replay does not modify the event store.
- Replay creates a new pipeline instance (does not modify original).
- Replay can start from any event in the sequence.

---

## 7. Delivery Guarantees

### 7.1 At-Least-Once Delivery

The Event Bus guarantees at-least-once delivery:
- Events are persisted before delivery.
- Delivery is retried on failure.
- Duplicate detection prevents double-processing.

### 7.2 Duplicate Detection

Each event has a unique ID. Subscribers maintain a processed-event set:
- If event ID already processed, skip.
- Processed-event set is bounded (last 10,000 events).
- Bounded set uses LRU eviction.

### 7.3 Ordering Guarantee

Events within a pipeline (same correlationId) are delivered in order:
- Events are ordered by sequenceNumber.
- Subscribers process events sequentially per correlationId.
- Events across pipelines may be interleaved.

---

## 8. Event Filtering

### 8.1 Filter Types

| Filter | Description | Example |
|---|---|---|
| Type Filter | Match event types | `SESSION_*` |
| Pipeline Filter | Match pipeline ID | `correlationId = "uuid"` |
| Stage Filter | Match pipeline stage | `payload.stage = "implement"` |
| Role Filter | Match session role | `payload.role = "coder"` |
| Result Filter | Match outcome | `payload.result = "failed"` |

### 8.2 Filter Syntax

```typescript
interface EventFilter {
  types?: EventType[];        // Match event types
  correlationId?: string;     // Match pipeline
  source?: string;            // Match source component
  payloadMatch?: Record<string, unknown>; // Match payload fields
}
```

---

## 9. Event Bus Configuration

```yaml
event_bus:
  backend: redis-streams       # in-memory, redis-streams, nats
  max_event_size_bytes: 1048576 # 1MB max event size
  publish_timeout_ms: 5000     # Timeout for publish
  delivery_timeout_ms: 30000   # Timeout for delivery to subscriber
  max_retries: 3               # Max delivery retries
  retry_delay_ms: 1000         # Delay between retries
  retention_days: 90           # Event retention period
  max_subscribers_per_event: 10 # Max subscribers per event type
  dedup_window_size: 10000     # Duplicate detection window
```

---

## 10. Event Bus Error Handling

| Error | Recovery |
|---|---|
| Publish timeout | Retry (max 3), then queue locally |
| Delivery timeout | Retry delivery, mark subscriber as unhealthy |
| Event store full | Alert, expand storage, oldest events archived |
| Subscriber crash | Retry delivery, alert, mark unhealthy |
| Event schema mismatch | Reject event, log error, alert |
| Duplicate event | Skip (detected by event ID) |

---

## 11. Observability Integration

### 11.1 Event Metrics

| Metric | Type | Labels |
|---|---|---|
| `event_published_total` | Counter | event_type, source |
| `event_delivered_total` | Counter | event_type, subscriber |
| `event_delivery_duration_ms` | Histogram | event_type, subscriber |
| `event_delivery_failed_total` | Counter | event_type, subscriber, error_type |
| `event_store_size_bytes` | Gauge | — |
| `event_store_entries_total` | Gauge | — |
| `active_subscriptions` | Gauge | — |

### 11.2 Event Tracing

Each event carries trace context:
- `traceId`: Root trace ID (pipeline execution).
- `spanId`: Span ID for this event.
- `parentSpanId`: Parent span ID (causation).

This enables full distributed tracing across all components.
