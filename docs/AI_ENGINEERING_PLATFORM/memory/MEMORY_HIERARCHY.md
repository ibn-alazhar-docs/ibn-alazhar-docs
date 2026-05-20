# Memory Hierarchy

> **Purpose:** Define the multi-tier memory system for the AI Engineering Platform.
> **Scope:** Memory tiers, synchronization, conflict resolution, persistence, retrieval.

---

## 1. Memory Architecture

### 1.1 Memory Tiers

The platform maintains a hierarchical memory system that persists project state across sessions, pipelines, and phases:

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY HIERARCHY                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SESSION MEMORY — Volatile                           │   │
│  │  • Active conversation state                         │   │
│  │  • Tool call results                                 │   │
│  │  • Temporary working data                            │   │
│  │  • Lifetime: Session duration                        │   │
│  │  • Storage: In-memory                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PIPELINE MEMORY — Semi-Persistent                   │   │
│  │  • Pipeline state and stage results                  │   │
│  │  • Verification results                              │   │
│  │  • Repair history                                    │   │
│  │  • Lifetime: Pipeline lifecycle + 90 days            │   │
│  │  • Storage: Redis + JSON files                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PROJECT MEMORY — Persistent                         │   │
│  │  • Phase state and gate results                      │   │
│  │  • Active decisions and ADRs                         │   │
│  │  • Extracted knowledge                               │   │
│  │  • Runtime memory (.opencode/memory/)                │   │
│  │  • Lifetime: Project lifetime                        │   │
│  │  • Storage: JSON files + PostgreSQL                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HISTORICAL MEMORY — Archival                        │   │
│  │  • Completed pipeline histories                      │   │
│  │  • Deprecated decisions                              │   │
│  │  • Superseded ADRs                                   │   │
│  │  • Lifetime: Indefinite (archived)                   │   │
│  │  • Storage: PostgreSQL + file system                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Tier Characteristics

| Tier | Persistence | Access Speed | Sync Strategy | Conflict Resolution |
|---|---|---|---|---|
| **SESSION** | None | Instant | None | N/A (single writer) |
| **PIPELINE** | 90 days | < 10ms | Event-driven | Last-write-wins with event ordering |
| **PROJECT** | Indefinite | < 50ms | Periodic + event-driven | Merge with conflict detection |
| **HISTORICAL** | Indefinite | < 500ms | Write-once | N/A (immutable) |

---

## 2. Memory Structure

### 2.1 Project Memory Schema

```typescript
interface ProjectMemory {
  // Phase state
  phase: {
    current: string;           // "phase-1", "phase-2", etc.
    startedAt: string;
    gates: GateResult[];
    completedSpecs: string[];
  };

  // Active decisions
  decisions: {
    id: string;
    title: string;
    rationale: string;
    status: 'active' | 'deprecated' | 'superseded';
    createdAt: string;
    supersededBy?: string;
  }[];

  // Extracted knowledge
  knowledge: {
    type: 'decision' | 'pattern' | 'failure' | 'convention';
    content: string;
    tags: string[];
    confidence: number;
    source: string;
    createdAt: string;
  }[];

  // Runtime state
  runtime: {
    activePipelines: string[];
    lastPipelineCompletedAt: string | null;
    totalPipelinesCompleted: number;
    totalPipelinesFailed: number;
    lastHealthCheck: string;
  };

  // Conventions
  conventions: {
    category: string;
    rule: string;
    examples: string[];
    source: string;
  }[];

  // Metadata
  meta: {
    version: number;
    lastUpdatedAt: string;
    lastUpdatedBy: string;  // pipeline ID or session ID
    checksum: string;
  };
}
```

### 2.2 Pipeline Memory Schema

```typescript
interface PipelineMemory {
  pipelineId: string;
  specId: string;
  state: PipelineState;
  currentStage: string | null;
  branchName: string | null;
  prNumber: number | null;

  stages: {
    name: string;
    state: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    output: unknown | null;
    startedAt: string | null;
    completedAt: string | null;
    retryCount: number;
  }[];

  sessions: {
    id: string;
    role: string;
    stage: string;
    state: 'completed' | 'failed';
    duration: number;
    tokenUsage: number;
    output: unknown | null;
  }[];

  verification: {
    results: VerificationResult[];
    repairAttempts: number;
    repairHistory: RepairReport[];
  };

  review: {
    results: ReviewResult[];
  };

  meta: {
    createdAt: string;
    updatedAt: string;
    eventCount: number;
    lastEventSequence: number;
  };
}
```

### 2.3 Session Memory Schema

```typescript
interface SessionMemory {
  sessionId: string;
  role: string;
  pipelineId: string;
  stage: string;
  state: SessionState;

  context: {
    systemPrompt: string;
    specContent: string;
    planContent: string | null;
    previousOutput: unknown | null;
    warmContext: unknown | null;
    coldContext: unknown | null;
  };

  conversation: {
    turns: {
      role: 'user' | 'assistant' | 'tool';
      content: string;
      timestamp: string;
    }[];
    maxTurns: number;
    compactedAt: string | null;
  };

  toolCalls: {
    id: string;
    tool: string;
    args: unknown;
    result: unknown;
    duration: number;
    timestamp: string;
  }[];

  metrics: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    toolCallCount: number;
    duration: number;
  };
}
```

---

## 3. Memory Synchronization

### 3.1 Sync Triggers

Memory is synchronized across tiers on these events:

| Event | Source Tier | Target Tier | Sync Type |
|---|---|---|---|
| `SESSION_COMPLETED` | SESSION → PIPELINE | Pipeline memory update | Write |
| `PIPELINE_STAGE_COMPLETED` | PIPELINE → PROJECT | Project memory update | Write |
| `PIPELINE_COMPLETED` | PIPELINE → PROJECT + HISTORICAL | Archive pipeline, update project | Write |
| `KNOWLEDGE_EXTRACTED` | SESSION → PROJECT | Add to project knowledge | Write |
| `DECISION_MADE` | SESSION → PROJECT | Add to project decisions | Write |
| `PHASE_GATE_PASSED` | PROJECT → HISTORICAL | Archive gate result | Write |
| `SESSION_STARTED` | PROJECT + PIPELINE → SESSION | Load context into session | Read |
| `PIPELINE_STARTED` | PROJECT → PIPELINE | Initialize pipeline memory | Read |

### 3.2 Sync Flow

```
Event Emitted
  │
  ▼
Memory Sync Listener
  │
  ├── Identify affected memory tiers
  │
  ├── Extract relevant data from event payload
  │
  ├── Apply changes to target tier
  │
  ├── Resolve conflicts (if any)
  │
  ├── Update checksum
  │
  └── Emit MEMORY_UPDATED event
```

### 3.3 Conflict Resolution

| Conflict Type | Resolution Strategy |
|---|---|
| Concurrent writes to same field | Last-write-wins with event sequence number |
| Conflicting decisions | New decision supersedes old, mark old as superseded |
| Memory corruption detected | Restore from last known good checkpoint |
| Stale read detected | Re-read from source tier |
| Checksum mismatch | Rebuild from event history |

### 3.4 Sync Guarantees

- **Eventual consistency:** PROJECT memory may lag PIPELINE by < 1 second.
- **Ordering:** Events are applied in sequence number order.
- **Idempotency:** Re-applying the same event produces the same result.
- **Durability:** PROJECT memory is persisted to disk after every update.

---

## 4. Memory Persistence

### 4.1 Storage Strategy

| Tier | Storage | Format | Backup |
|---|---|---|---|
| SESSION | In-memory | TypeScript objects | None |
| PIPELINE | Redis + JSON files | JSON | JSON file backup |
| PROJECT | JSON files + PostgreSQL | JSON + relational | Git-tracked JSON |
| HISTORICAL | PostgreSQL + file system | Relational + files | Database backup |

### 4.2 File Structure

```
.opencode/memory/
├── project.json              # Project memory (git-tracked)
├── pipelines/
│   ├── {pipeline-id}.json    # Pipeline memory
│   └── ...
├── decisions/
│   ├── {decision-id}.json    # Individual decisions
│   └── ...
├── knowledge/
│   ├── decisions.jsonl       # Extracted decision knowledge
│   ├── patterns.jsonl        # Extracted pattern knowledge
│   ├── failures.jsonl        # Extracted failure knowledge
│   └── conventions.jsonl     # Extracted convention knowledge
├── checkpoints/
│   ├── {pipeline-id}-{stage}.json  # Stage checkpoints
│   └── ...
└── .checksum                 # Memory integrity checksum
```

### 4.3 Persistence Rules

| Rule | Description |
|---|---|
| PROJECT memory is git-tracked | Changes are committed with pipeline completion |
| PIPELINE memory is ephemeral | Deleted after 90-day retention |
| HISTORICAL memory is immutable | Never modified after archival |
| Checksums are mandatory | Every persistence write includes checksum |
| Backups are automatic | JSON file backup on every write |

---

## 5. Memory Retrieval

### 5.1 Retrieval API

```typescript
interface MemoryAPI {
  // Project memory
  getProjectMemory(): Promise<ProjectMemory>;
  updateProjectMemory(updates: Partial<ProjectMemory>): Promise<void>;
  getDecisions(filters?: DecisionFilters): Promise<Decision[]>;
  getKnowledge(filters?: KnowledgeFilters): Promise<ExtractedKnowledge[]>;
  getConventions(category?: string): Promise<Convention[]>;

  // Pipeline memory
  getPipelineMemory(pipelineId: string): Promise<PipelineMemory>;
  updatePipelineMemory(pipelineId: string, updates: Partial<PipelineMemory>): Promise<void>;
  getPipelineMemoriesBySpec(specId: string): Promise<PipelineMemory[]>;

  // Session memory
  getSessionMemory(sessionId: string): Promise<SessionMemory>;
  updateSessionMemory(sessionId: string, updates: Partial<SessionMemory>): Promise<void>;

  // Checkpoints
  createCheckpoint(pipelineId: string, stage: string, state: unknown): Promise<string>;
  loadCheckpoint(checkpointId: string): Promise<unknown>;
  getCheckpoints(pipelineId: string): Promise<Checkpoint[]>;
}
```

### 5.2 Retrieval Strategies

| Strategy | Use Case | Performance |
|---|---|---|
| Direct lookup | Known pipeline/session ID | O(1) |
| Filtered query | Decisions by status, knowledge by type | O(n) with index |
| Semantic search | Related knowledge for context assembly | O(log n) with vector index |
| Full scan | Audit, replay, debugging | O(n) |

---

## 6. Memory Events

| Event | Payload | Emitted When |
|---|---|---|
| `MEMORY_UPDATED` | `{tier, key, checksum}` | Memory tier updated |
| `MEMORY_SYNC_STARTED` | `{source, target, event}` | Sync operation started |
| `MEMORY_SYNC_COMPLETED` | `{source, target, changes}` | Sync operation completed |
| `MEMORY_CONFLICT_DETECTED` | `{key, expected, actual, resolution}` | Conflict detected |
| `MEMORY_CORRUPTION_DETECTED` | `{tier, key, expectedChecksum, actualChecksum}` | Corruption detected |
| `MEMORY_RESTORED` | `{tier, key, fromCheckpoint}` | Memory restored from checkpoint |
| `CHECKPOINT_CREATED` | `{pipelineId, stage, checkpointId}` | Checkpoint saved |
| `KNOWLEDGE_STORED` | `{type, content, source}` | Knowledge stored in project memory |

---

## 7. Memory Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| No memory sync | Stale state across sessions | Event-driven sync on every update |
| Overwriting without merge | Lost data | Merge with conflict detection |
| No checksums | Undetected corruption | Mandatory checksums on every write |
| Storing everything in memory | Memory bloat | Tiered storage with retention policies |
| No retrieval API | Ad-hoc memory access | Structured MemoryAPI |
| Git-tracking large files | Repo bloat | Only git-track project.json, not pipeline files |
| No conflict resolution | Silent data loss | Last-write-wins with event ordering |
