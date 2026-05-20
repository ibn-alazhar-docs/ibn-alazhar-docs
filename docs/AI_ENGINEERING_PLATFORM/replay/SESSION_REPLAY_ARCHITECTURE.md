# Session Replay Architecture

> **Purpose:** Define the session replay system for reconstructing and re-executing past sessions.
> **Scope:** Replay semantics, reconstruction, trace capture, interaction replay, replay safety.

---

## 1. Replay Overview

Session replay enables:
- **Debugging:** Understand why a session failed.
- **Audit:** Verify what actions were taken.
- **Testing:** Replay production sessions in staging.
- **Learning:** Analyze successful patterns.
- **Recovery:** Resume from a specific point in a session.

Replay is distinct from pipeline replay:
- **Pipeline replay:** Re-execute an entire pipeline from spec to PR.
- **Session replay:** Re-execute a single session within a pipeline.

---

## 2. Replay Data Model

### 2.1 Replay Manifest

Each replayable session has a manifest:

```typescript
interface ReplayManifest {
  sessionId: string;
  pipelineId: string;
  role: string;
  stage: string;
  state: 'completed' | 'failed';

  // Context
  context: {
    systemPrompt: string;
    specContent: string;
    planContent: string | null;
    warmContext: unknown | null;
    coldContext: unknown | null;
  };

  // Conversation
  turns: ReplayTurn[];

  // Tool calls
  toolCalls: ReplayToolCall[];

  // Output
  output: unknown | null;
  outputSchema: string | null;

  // Metrics
  metrics: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    toolCallCount: number;
    duration: number;
  };

  // Replay metadata
  replay: {
    replayable: boolean;
    compacted: boolean;
    compactionMetadata: CompactionMetadata | null;
    checkpointIds: string[];
    eventSequenceRange: { start: number; end: number };
  };

  // Integrity
  checksum: string;
  createdAt: string;
  archivedAt: string | null;
}

interface ReplayTurn {
  sequenceNumber: number;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
  tokenCount: number;
}

interface ReplayToolCall {
  sequenceNumber: number;
  tool: string;
  args: unknown;
  result: unknown;
  duration: number;
  timestamp: string;
  permitted: boolean;
}
```

### 2.2 Replay Storage

```
.replay/
├── sessions/
│   ├── {session-id}/
│   │   ├── manifest.json          # Replay manifest
│   │   ├── turns.jsonl            # Conversation turns (ordered)
│   │   ├── tool-calls.jsonl       # Tool calls (ordered)
│   │   ├── context-snapshot.json  # Full context at session start
│   │   ├── checkpoints/           # Checkpoint snapshots
│   │   │   ├── turn-10.json
│   │   │   ├── turn-20.json
│   │   │   └── ...
│   │   └── artifacts/             # Artifacts produced
│   │       ├── plan.json
│   │       └── code-change.json
│   └── ...
├── pipelines/
│   ├── {pipeline-id}/
│   │   ├── event-log.jsonl        # Full event log for pipeline
│   │   ├── session-order.json     # Session execution order
│   │   └── state-snapshots/       # State at each stage
│   │       ├── after-plan.json
│   │       ├── after-implement.json
│   │       └── ...
│   └── ...
└── index/
    ├── by-session.jsonl
    ├── by-pipeline.jsonl
    └── by-date.jsonl
```

---

## 3. Replay Semantics

### 3.1 Replay Modes

| Mode | Description | Use Case |
|---|---|---|
| **Passive** | Replay events without re-execution | Debugging, audit |
| **Active** | Re-execute session with same context | Testing, recovery |
| **Interactive** | Step through session with human control | Learning, analysis |
| **Partial** | Replay from specific checkpoint | Recovery, debugging |

### 3.2 Passive Replay

```
Replay Request (passive)
  │
  ▼
1. Load replay manifest
  │
  ▼
2. Load event log for session
  │
  ▼
3. Reconstruct timeline:
  ├── Session start
  ├── Each turn (with timestamp)
  ├── Each tool call (with result)
  └── Session end
  │
  ▼
4. Render replay timeline:
  ├── Visual timeline of turns
  ├── Tool call details
  ├── Context at each point
  └── Output comparison (if available)
  │
  ▼
5. Emit REPLAY_COMPLETE event
```

### 3.3 Active Replay

```
Replay Request (active)
  │
  ▼
1. Load replay manifest
  │
  ▼
2. Create new session with same context:
  ├── Same system prompt
  ├── Same spec content
  ├── Same plan content
  └── Same warm/cold context
  │
  ▼
3. Replay tool calls deterministically:
  ├── For each tool call in original session:
  │     ├── Execute same tool with same args
  │     ├── Compare result with original
  │     └── If mismatch: log divergence
  │
  ▼
4. Compare output with original:
  ├── If match: replay successful
  ├── If mismatch: log divergence analysis
  └── Emit REPLAY_DIVERGENCE if different
  │
  ▼
5. Emit REPLAY_COMPLETE event
```

### 3.4 Interactive Replay

```
Replay Request (interactive)
  │
  ▼
1. Load replay manifest
  │
  ▼
2. Present replay interface:
  ├── Timeline of turns
  ├── Step forward/backward controls
  ├── Context viewer
  └── Tool call inspector
  │
  ▼
3. Human steps through session:
  ├── At each turn: view context, tool calls
  ├── At divergence: analyze difference
  └── At any point: branch into new session
  │
  ▼
4. Optional: branch into new session
  ├── Modify context
  ├── Change tool call result
  └── Continue from branch point
```

---

## 4. Trace Capture

### 4.1 Trace Data

Every session captures trace data for replay:

```typescript
interface SessionTrace {
  sessionId: string;
  pipelineId: string;

  // Timeline
  timeline: TraceEvent[];

  // Context snapshots
  contextSnapshots: {
    turnNumber: number;
    context: {
      hotTokens: number;
      warmTokens: number;
      coldTokens: number;
      totalTokens: number;
    };
  }[];

  // Tool call traces
  toolCallTraces: {
    toolCallId: string;
    tool: string;
    args: unknown;
    result: unknown;
    duration: number;
    permitted: boolean;
    error: string | null;
  }[];

  // Model interaction traces
  modelTraces: {
    turnNumber: number;
    prompt: string;
    response: string;
    tokenUsage: { input: number; output: number };
    duration: number;
    error: string | null;
  }[];

  // State changes
  stateChanges: {
    turnNumber: number;
    state: SessionState;
    reason: string;
  }[];
}

interface TraceEvent {
  sequenceNumber: number;
  type: string;
  timestamp: string;
  payload: unknown;
}
```

### 4.2 Trace Capture Points

| Point | Captured | Frequency |
|---|---|---|
| Session start | Full context, manifest | Once |
| Each turn | Prompt, response, tokens | Per turn |
| Each tool call | Args, result, duration, permission | Per call |
| State change | Old state, new state, reason | Per change |
| Context compaction | Before/after tokens, strategy | Per compaction |
| Session end | Final output, metrics, checksum | Once |

---

## 5. Replay Safety

### 5.1 Safety Constraints

| Constraint | Description | Enforcement |
|---|---|---|
| No destructive operations | Replay cannot delete files or branches | Tool permission override |
| No external side effects | Replay cannot push to remote or merge | Tool permission override |
| Isolated execution | Replay runs in isolated environment | Separate working directory |
| Time-bounded | Replay has maximum duration | Timeout enforcement |
| Resource-bounded | Replay has token and tool call limits | Budget enforcement |

### 5.2 Replay Permission Override

During active replay, tool permissions are overridden:

```typescript
const replayPermissionOverrides: ToolPermissionOverride[] = [
  { tool: 'git-push', action: 'block', reason: 'Replay cannot push to remote' },
  { tool: 'git-merge', action: 'block', reason: 'Replay cannot merge' },
  { tool: 'rm', action: 'block', reason: 'Replay cannot delete files' },
  { tool: 'file-write', action: 'isolate', reason: 'Replay writes to isolated directory' },
];
```

### 5.3 Divergence Detection

```typescript
interface DivergenceReport {
  sessionId: string;
  replaySessionId: string;
  divergences: {
    turnNumber: number;
    type: 'tool-result' | 'model-response' | 'state-change';
    expected: unknown;
    actual: unknown;
    severity: 'minor' | 'major' | 'critical';
  }[];
  summary: {
    totalDivergences: number;
    minorDivergences: number;
    majorDivergences: number;
    criticalDivergences: number;
    matchPercentage: number;
  };
}

function detectDivergence(original: SessionTrace, replay: SessionTrace): DivergenceReport {
  const divergences: DivergenceReport['divergences'] = [];

  for (let i = 0; i < original.toolCallTraces.length; i++) {
    const orig = original.toolCallTraces[i];
    const repr = replay.toolCallTraces[i];

    if (!repr) {
      divergences.push({
        turnNumber: i,
        type: 'tool-result',
        expected: orig.result,
        actual: null,
        severity: 'critical',
      });
      continue;
    }

    if (JSON.stringify(orig.result) !== JSON.stringify(repr.result)) {
      divergences.push({
        turnNumber: i,
        type: 'tool-result',
        expected: orig.result,
        actual: repr.result,
        severity: classifyDivergence(orig.result, repr.result),
      });
    }
  }

  return {
    sessionId: original.sessionId,
    replaySessionId: replay.sessionId,
    divergences,
    summary: {
      totalDivergences: divergences.length,
      minorDivergences: divergences.filter(d => d.severity === 'minor').length,
      majorDivergences: divergences.filter(d => d.severity === 'major').length,
      criticalDivergences: divergences.filter(d => d.severity === 'critical').length,
      matchPercentage: ((original.toolCallTraces.length - divergences.length) / original.toolCallTraces.length) * 100,
    },
  };
}
```

---

## 6. Replay Events

| Event | Payload | Emitted When |
|---|---|---|
| `REPLAY_STARTED` | `{sessionId, mode, replaySessionId}` | Replay initiated |
| `REPLAY_TURN_REPLAYED` | `{sessionId, turnNumber, mode}` | Turn replayed |
| `REPLAY_TOOL_CALL_REPLAYED` | `{sessionId, toolCallId, match}` | Tool call replayed |
| `REPLAY_DIVERGENCE` | `{sessionId, turnNumber, type, expected, actual}` | Divergence detected |
| `REPLAY_COMPLETE` | `{sessionId, mode, divergences, matchPercentage}` | Replay finished |
| `REPLAY_FAILED` | `{sessionId, reason, error}` | Replay failed |
| `REPLAY_BRANCH_CREATED` | `{sessionId, branchSessionId, turnNumber}` | Branch created from replay |

---

## 7. Replay Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| No trace capture | Cannot replay | Mandatory trace capture |
| Incomplete context | Replay produces different results | Full context snapshot |
| No divergence detection | Silent differences | Mandatory divergence check |
| Destructive replay | Data loss | Permission overrides |
| No isolation | Replay affects production | Isolated execution environment |
| No timeout | Runaway replay | Time-bounded replay |
| No checksums | Undetected corruption | SHA-256 on manifest |
