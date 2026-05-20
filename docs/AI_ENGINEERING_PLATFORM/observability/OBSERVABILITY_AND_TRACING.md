# Observability and Tracing

> **Purpose:** Define the runtime observability system for the AI Engineering Platform.
> **Scope:** Metrics, logs, traces, event journals, replay timelines, artifact indexing, execution analytics.

---

## 1. Observability Architecture

### 1.1 Three Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  METRICS — Quantitative measurements                  │   │
│  │  • Pipeline duration, success rate                   │   │
│  │  • Session token usage, tool call count              │   │
│  │  • Verification pass/fail rates                      │   │
│  │  • Repair attempt success rates                      │   │
│  │  • Storage: Time-series database (Phase 0: JSON)     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LOGS — Structured event records                     │   │
│  │  • Component-level operational logs                  │   │
│  │  • Tool call logs with args/results                  │   │
│  │  • Governance check logs                             │   │
│  │  • Storage: JSONL files                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TRACES — Execution flow tracking                    │   │
│  │  • Pipeline execution traces                         │   │
│  │  • Session execution traces                          │   │
│  │  • Tool call traces                                  │   │
│  │  • Storage: JSON files (Phase 0)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Observability Layers

| Layer | Component | Responsibility |
|---|---|---|
| **Instrumentation** | All components | Emit metrics, logs, traces |
| **Collection** | Observability collector | Aggregate from all components |
| **Storage** | Time-series + files + DB | Persist observability data |
| **Query** | Query API | Retrieve observability data |
| **Visualization** | TUI dashboard + reports | Display observability data |
| **Alerting** | Alert engine | Notify on threshold breaches |

---

## 2. Metrics

### 2.1 Metric Categories

#### Pipeline Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `pipeline_created_total` | Counter | phase, spec_type | Total pipelines created |
| `pipeline_completed_total` | Counter | phase, spec_type | Total pipelines completed |
| `pipeline_failed_total` | Counter | phase, failure_stage | Total pipelines failed |
| `pipeline_duration_seconds` | Histogram | phase, spec_type | Pipeline end-to-end duration |
| `pipeline_stage_duration_seconds` | Histogram | stage, result | Per-stage duration |
| `pipeline_repair_attempts_total` | Counter | stage, result | Total repair attempts |
| `pipeline_repair_success_rate` | Gauge | stage | Repair success rate per stage |

#### Session Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `session_created_total` | Counter | role, stage | Total sessions created |
| `session_completed_total` | Counter | role, stage | Total sessions completed |
| `session_failed_total` | Counter | role, stage, error_type | Total sessions failed |
| `session_duration_seconds` | Histogram | role, stage | Session duration |
| `session_token_usage_total` | Counter | role, type(input/output) | Token usage per session |
| `session_tool_calls_total` | Counter | role, tool_name | Tool calls per session |
| `session_context_tokens` | Gauge | role, tier(hot/warm/cold) | Context token count |
| `session_compaction_total` | Counter | role, strategy | Context compactions |

#### Verification Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `verification_run_total` | Counter | check_type | Total verification runs |
| `verification_passed_total` | Counter | check_type | Passed checks |
| `verification_failed_total` | Counter | check_type | Failed checks |
| `verification_duration_seconds` | Histogram | check_type | Check duration |
| `verification_flaky_total` | Counter | check_type | Flaky test detections |

#### Governance Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `governance_check_total` | Counter | check_type, result | Governance checks |
| `phase_gate_passed_total` | Counter | phase | Phase gates passed |
| `phase_gate_failed_total` | Counter | phase, reason | Phase gates failed |
| `approval_granted_total` | Counter | checkpoint | Approvals granted |
| `approval_denied_total` | Counter | checkpoint | Approvals denied |
| `approval_timeout_total` | Counter | checkpoint | Approval timeouts |

#### Recovery Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `recovery_attempt_total` | Counter | failure_type | Recovery attempts |
| `recovery_success_total` | Counter | failure_type | Successful recoveries |
| `recovery_escalation_total` | Counter | failure_type, level | Escalations to human |
| `recovery_duration_seconds` | Histogram | failure_type | Recovery duration |
| `rollback_total` | Counter | rollback_type | Rollback operations |

#### System Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `event_published_total` | Counter | event_type | Events published |
| `event_delivery_failed_total` | Counter | event_type, subscriber | Event delivery failures |
| `memory_sync_total` | Counter | tier, operation | Memory sync operations |
| `artifact_created_total` | Counter | artifact_type | Artifacts created |
| `context_budget_utilization` | Gauge | session_id, tier | Context budget utilization % |

### 2.2 Metric Collection

```typescript
interface MetricsCollector {
  // Counter
  increment(name: string, labels?: Record<string, string>, value?: number): void;

  // Histogram
  observe(name: string, value: number, labels?: Record<string, string>): void;

  // Gauge
  set(name: string, value: number, labels?: Record<string, string>): void;

  // Export
  export(format: 'prometheus' | 'json'): string;

  // Reset (for testing)
  reset(): void;
}
```

### 2.3 Metric Export (Phase 0: JSON)

```json
{
  "timestamp": "2026-05-20T10:30:00Z",
  "metrics": {
    "pipeline_created_total": { "value": 42, "labels": { "phase": "phase-1" } },
    "pipeline_duration_seconds": {
      "buckets": { "10": 5, "30": 15, "60": 10, "120": 8, "300": 3, "600": 1 },
      "sum": 1800,
      "count": 42
    },
    "session_token_usage_total": {
      "input": 450000,
      "output": 320000
    }
  }
}
```

---

## 3. Logs

### 3.1 Log Structure

All logs are structured JSON:

```typescript
interface LogEntry {
  timestamp: string;        // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;        // Component name
  pipelineId: string | null;
  sessionId: string | null;
  event: string | null;     // Event type if applicable
  message: string;
  data: Record<string, unknown>;  // Additional context
  traceId: string | null;   // Trace ID for correlation
  spanId: string | null;    // Span ID for correlation
}
```

### 3.2 Log Categories

| Category | Component | Level | Example |
|---|---|---|---|
| Pipeline | Pipeline engine | info | `Pipeline p-abc123 transitioned from PLANNING to BRANCHING` |
| Session | Session manager | info | `Session s-def456 started with role=coder` |
| Tool | Tool router | debug | `Tool call: file-write path=src/auth.ts` |
| Verification | Verification engine | info | `Verification: lint passed in 3.2s` |
| Governance | Governance system | warn | `Phase gate failed: blocking issues: 2` |
| Recovery | Recovery engine | error | `Repair attempt 3 failed, escalating to human` |
| Event | Event bus | debug | `Event PIPELINE_STAGE_COMPLETED published` |
| Memory | Memory sync | info | `Memory sync: PROJECT updated (checksum: abc123)` |

### 3.3 Log Storage

```
.logs/
├── platform/
│   ├── 2026-05-20.jsonl     # Platform-level logs
│   └── ...
├── pipelines/
│   ├── {pipeline-id}.jsonl  # Pipeline-specific logs
│   └── ...
├── sessions/
│   ├── {session-id}.jsonl   # Session-specific logs
│   └── ...
└── errors/
    ├── 2026-05-20.jsonl     # Error-only logs
    └── ...
```

### 3.4 Log Rotation

| Log Type | Rotation | Retention |
|---|---|---|
| Platform logs | Daily | 30 days |
| Pipeline logs | Per pipeline | 90 days |
| Session logs | Per session | 90 days |
| Error logs | Daily | 180 days |

---

## 4. Traces

### 4.1 Trace Model

Traces follow the OpenTelemetry data model:

```typescript
interface Trace {
  traceId: string;           // Unique trace ID (UUID v7)
  name: string;              // Trace name (e.g., "pipeline-execution")
  startTime: string;
  endTime: string | null;
  status: 'ok' | 'error' | 'unknown';
  spans: Span[];
  attributes: Record<string, string>;
}

interface Span {
  spanId: string;            // Unique span ID
  parentSpanId: string | null;
  name: string;              // Span name (e.g., "stage:implement")
  startTime: string;
  endTime: string | null;
  status: 'ok' | 'error' | 'unknown';
  attributes: Record<string, string>;
  events: SpanEvent[];
  links: SpanLink[];         // Links to related spans
}

interface SpanEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, string>;
}

interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, string>;
}
```

### 4.2 Trace Hierarchy

```
Trace: pipeline-execution (traceId: abc123)
  │
  ├── Span: pipeline-lifecycle (spanId: s1)
  │     │
  │     ├── Span: stage:validate (spanId: s2)
  │     ├── Span: stage:plan (spanId: s3)
  │     │     │
  │     │     └── Span: session:architect (spanId: s4)
  │     │           │
  │     │           ├── Span: tool:file-read (spanId: s5)
  │     │           ├── Span: tool:file-write (spanId: s6)
  │     │           └── Span: model:response (spanId: s7)
  │     │
  │     ├── Span: stage:branch (spanId: s8)
  │     ├── Span: stage:implement (spanId: s9)
  │     │     │
  │     │     └── Span: session:coder (spanId: s10)
  │     │
  │     ├── Span: stage:verify (spanId: s11)
  │     │     │
  │     │     ├── Span: check:lint (spanId: s12)
  │     │     ├── Span: check:typecheck (spanId: s13)
  │     │     ├── Span: check:unit-test (spanId: s14)
  │     │     └── Span: check:build (spanId: s15)
  │     │
  │     ├── Span: stage:review (spanId: s16)
  │     ├── Span: stage:pr-create (spanId: s17)
  │     └── Span: stage:await-approval (spanId: s18)
  │
  └── Span: pipeline-cleanup (spanId: s19)
```

### 4.3 Trace Correlation

| Correlation | Field | Links |
|---|---|---|
| Pipeline | `traceId` | All spans in a pipeline share the same traceId |
| Session | `spanId` | Session spans link to pipeline spans |
| Event | `attributes.eventId` | Events link to spans |
| Artifact | `attributes.artifactId` | Artifacts link to spans |
| Tool call | `spanId` | Tool call spans link to session spans |

### 4.4 Trace Storage

```
.traces/
├── pipelines/
│   ├── {trace-id}.json      # Full trace for pipeline
│   └── ...
├── index/
│   ├── by-pipeline.jsonl    # traceId → pipelineId
│   ├── by-session.jsonl     # traceId → sessionId
│   └── by-date.jsonl        # traceId → date
└── metadata.json            # Trace registry metadata
```

---

## 5. Event Journals

### 5.1 Event Journal

The event journal is the authoritative record of all platform events:

```typescript
interface EventJournalEntry {
  sequenceNumber: number;    // Monotonically increasing
  event: BaseEvent;
  storedAt: string;
  checksum: string;
  traceId: string | null;
  spanId: string | null;
}
```

### 5.2 Journal Queries

```typescript
interface EventJournalAPI {
  // By pipeline
  getByPipeline(pipelineId: string): Promise<EventJournalEntry[]>;

  // By time range
  getByTimeRange(start: string, end: string): Promise<EventJournalEntry[]>;

  // By event type
  getByEventType(eventType: string): Promise<EventJournalEntry[]>;

  // By correlation
  getByCorrelationId(correlationId: string): Promise<EventJournalEntry[]>;

  // By sequence range
  getBySequenceRange(start: number, end: number): Promise<EventJournalEntry[]>;
}
```

---

## 6. Replay Timelines

### 6.1 Timeline Construction

Replay timelines reconstruct the execution sequence from event journals:

```
Timeline for Pipeline p-abc123
  │
  ├── 10:00:00  PIPELINE_CREATED
  ├── 10:00:01  PIPELINE_VALIDATING
  ├── 10:00:02  GOVERNANCE_PASSED
  ├── 10:00:03  PIPELINE_READY
  ├── 10:00:04  PIPELINE_STARTED
  ├── 10:00:05  PIPELINE_STAGE_STARTED (stage: plan)
  ├── 10:00:06  SESSION_CREATED (role: architect)
  ├── 10:00:07  SESSION_STARTED
  ├── 10:02:30  SESSION_OUTPUT_READY
  ├── 10:02:31  SESSION_COMPLETED
  ├── 10:02:32  PIPELINE_STAGE_COMPLETED (stage: plan)
  ├── 10:02:33  PIPELINE_STAGE_STARTED (stage: branch)
  ├── 10:02:35  BRANCH_CREATED
  ├── 10:02:36  PIPELINE_STAGE_COMPLETED (stage: branch)
  ├── ...
  └── 10:15:00  PIPELINE_COMPLETED
```

### 6.2 Timeline Visualization

```
Time ──────────────────────────────────────────────────────►
      │     │     │     │     │     │     │     │     │
Plan  ██████│
Branch      ██│
Impl            ████████████████████████│
Verify                                    ████████│
Review                                            ██████│
PR                                                        ██│
Approval                                                          ████████│
Merge                                                                         ██│
      │     │     │     │     │     │     │     │     │
     0:00  2:00  4:00  6:00  8:00 10:00 12:00 14:00 15:00
```

---

## 7. Execution Analytics

### 7.1 Analytics Types

| Analytics | Purpose | Input | Output |
|---|---|---|---|
| **Pipeline Analytics** | Pipeline performance trends | Pipeline metrics | Duration trends, success rates |
| **Session Analytics** | Session efficiency | Session metrics | Token usage, tool call patterns |
| **Verification Analytics** | Check reliability | Verification metrics | Flaky test detection, pass rates |
| **Repair Analytics** | Repair effectiveness | Repair metrics | Success rates by failure type |
| **Governance Analytics** | Gate effectiveness | Governance metrics | Block rates, approval patterns |

### 7.2 Pipeline Analytics

```typescript
interface PipelineAnalytics {
  period: { start: string; end: string };

  overview: {
    totalPipelines: number;
    completedPipelines: number;
    failedPipelines: number;
    successRate: number;
    avgDuration: number;
    medianDuration: number;
    p95Duration: number;
  };

  byStage: {
    stage: string;
    avgDuration: number;
    failureRate: number;
    repairRate: number;
  }[];

  byPhase: {
    phase: string;
    totalPipelines: number;
    successRate: number;
    avgDuration: number;
  }[];

  trends: {
    date: string;
    pipelines: number;
    successRate: number;
    avgDuration: number;
  }[];
}
```

### 7.3 Dashboard Metrics (TUI)

```
┌─────────────────────────────────────────────────────────────┐
│  AI Engineering Platform — Dashboard                         │
├─────────────────────────────────────────────────────────────┤
│  Active Pipelines: 3    Success Rate: 94%    Avg Duration:  │
│  Sessions Running: 7    Repair Rate: 12%     12m 34s        │
├─────────────────────────────────────────────────────────────┤
│  Pipeline Queue:                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ p-abc123  spec-001  IMPLEMENTING  ████████░░  80%   │   │
│  │ p-def456  spec-002  VERIFYING     ██████████  100%  │   │
│  │ p-ghi789  spec-003  PLANNING      ████░░░░░░  40%   │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Recent Events:                                             │
│  10:15:00  PIPELINE_COMPLETED  p-abc123  spec-001          │
│  10:14:58  VERIFICATION_PASSED  p-def456  spec-002         │
│  10:14:55  SESSION_COMPLETED   s-jkl012  coder             │
├─────────────────────────────────────────────────────────────┤
│  Token Usage Today: 1.2M input / 850K output               │
│  Memory: PROJECT 2.4MB  PIPELINE 1.1MB  ARCHIVAL 45MB     │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Alerting

### 8.1 Alert Rules

| Alert | Condition | Severity | Action |
|---|---|---|---|
| Pipeline failure rate > 20% | 1h window | High | Notify human |
| Session timeout rate > 10% | 1h window | Medium | Log, monitor |
| Repair exhaustion rate > 5% | 1h window | High | Notify human |
| Context budget exceeded | Per session | Critical | Fail session, escalate |
| Event bus unavailable | Immediate | Critical | Queue locally, alert |
| Memory corruption detected | Immediate | Critical | Restore, alert |
| Model API unavailable | 5 min window | High | Retry, escalate |

### 8.2 Alert Channels

| Channel | Use Case |
|---|---|
| TUI notification | Local development |
| Log entry | All alerts (always) |
| GitHub issue | Production alerts |
| Email | Critical alerts |

---

## 9. Observability Events

| Event | Payload | Emitted When |
|---|---|---|
| `METRICS_EXPORTED` | `{format, metricCount}` | Metrics exported |
| `LOG_ROTATED` | `{logType, date}` | Log file rotated |
| `TRACE_COMPLETED` | `{traceId, spanCount, duration}` | Trace completed |
| `ALERT_TRIGGERED` | `{alertName, severity, condition}` | Alert triggered |
| `DASHBOARD_UPDATED` | `{metrics, pipelineCount}` | Dashboard refreshed |

---

## 10. Observability Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| No structured logs | Cannot parse or query | Mandatory JSON log format |
| No trace correlation | Cannot follow execution flow | traceId in all events |
| No metrics | Cannot measure performance | Instrument all components |
| No alerting | Silent failures | Alert rules for critical conditions |
| No log rotation | Disk space exhaustion | Configurable rotation |
| No trace sampling | Storage bloat | Sample long traces |
| No dashboard | No visibility | TUI dashboard |
