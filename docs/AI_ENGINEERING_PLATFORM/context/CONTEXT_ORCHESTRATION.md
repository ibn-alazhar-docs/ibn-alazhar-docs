# Context Orchestration

> **Purpose:** Define the complete context orchestration system for the AI Engineering Platform.
> **Scope:** Context tiers, retrieval strategies, injection policies, token-budget governance, active-state reconstruction.

---

## 1. Context Problem Statement

The AI Engineering Platform will eventually operate across:
- Large specs (multi-page documents)
- ADRs (architecture decision records)
- Long-running sessions (hundreds of turns)
- Verification logs (thousands of lines)
- Replay logs (full pipeline histories)
- Screenshots (visual artifacts)
- Artifacts (plans, reviews, reports)
- Reviews (security, RTL, brand, spec compliance)
- Repair loops (multiple attempts with full context)
- Multiple engineering phases (Phase 1 through Phase N)

**Context explosion is the primary scalability risk.** Without orchestration, sessions will:
- Exceed token limits
- Lose signal in noise
- Become slow and expensive
- Produce degraded output quality

---

## 2. Context Architecture

### 2.1 Context Tiers

Context is organized into four tiers, each with different access patterns, latency, and cost:

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTEXT TIERS                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HOT — Active Session Context                        │   │
│  │  • Current prompt + last 10 turns                    │   │
│  │  • System prompt (role-specific)                     │   │
│  │  • Active spec content                               │   │
│  │  • Current plan/tasks                                │   │
│  │  • Budget: 8,000 tokens                              │   │
│  │  • Latency: 0ms (in session)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WARM — Recent Pipeline Context                      │   │
│  │  • Previous stage outputs                            │   │
│  │  • Recent verification results                       │   │
│  │  • Active memory state                               │   │
│  │  • Related ADRs and decisions                        │   │
│  │  • Budget: 4,000 tokens (summarized)                 │   │
│  │  • Latency: < 100ms (Redis/cache)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  COLD — Historical Project Context                   │   │
│  │  • Completed pipeline summaries                      │   │
│  │  • Historical decisions and patterns                 │   │
│  │  • Project conventions and standards                 │   │
│  │  • Knowledge graph relationships                     │   │
│  │  • Budget: 2,000 tokens (semantic retrieval)         │   │
│  │  • Latency: < 500ms (semantic search)                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ARCHIVAL — Long-Term Storage                        │   │
│  │  • Full pipeline event histories                     │   │
│  │  • Complete session transcripts                      │   │
│  │  • All artifacts and screenshots                     │   │
│  │  • Not loaded into context — retrieved on demand     │   │
│  │  • Budget: 0 tokens (not in context)                 │   │
│  │  • Latency: < 2s (file/DB retrieval)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Tier Characteristics

| Tier | Storage | Access Pattern | Token Budget | Eviction |
|---|---|---|---|---|
| **HOT** | Session context window | Always present | 8,000 | Session end |
| **WARM** | Redis / in-memory cache | Stage transitions | 4,000 | LRU, 24h TTL |
| **COLD** | Vector DB / semantic index | On-demand retrieval | 2,000 | Semantic relevance |
| **ARCHIVAL** | File system / PostgreSQL | Replay, audit, debug | 0 | 90-day retention |

---

## 3. Context Assembly

### 3.1 Assembly Pipeline

Context is assembled per session through a multi-stage pipeline:

```
Session Request
  │
  ▼
┌─────────────────────────────────────────────────────┐
│              CONTEXT ASSEMBLY PIPELINE               │
│                                                      │
│  Stage 1: HOT Context                                │
│  ├── Load system prompt (role-specific)              │
│  ├── Load active spec content                        │
│  ├── Load current plan/tasks                         │
│  └── Load last N turns (if continuing session)       │
│                                                      │
│  Stage 2: WARM Context                               │
│  ├── Load previous stage outputs                     │
│  ├── Load recent verification results                │
│  ├── Load active memory state                        │
│  └── Load related ADRs (by spec reference)           │
│                                                      │
│  Stage 3: COLD Context                               │
│  ├── Semantic search for related decisions           │
│  ├── Retrieve project conventions                    │
│  ├── Load knowledge graph neighbors                  │
│  └── Summarize to fit token budget                   │
│                                                      │
│  Stage 4: Budget Enforcement                         │
│  ├── Calculate total token count                     │
│  ├── If over budget: trim COLD first, then WARM      │
│  ├── If still over: summarize HOT (preserve system)  │
│  └── Emit CONTEXT_ASSEMBLED event                    │
│                                                      │
│  Stage 5: Injection                                  │
│  ├── Assemble final context string                   │
│  ├── Inject into session                             │
│  └── Emit SESSION_STARTED with context metadata      │
└─────────────────────────────────────────────────────┘
```

### 3.2 Context Assembly Rules

| Rule | Priority | Description |
|---|---|---|
| System prompt is immutable | Highest | Never trimmed or modified |
| Spec content is mandatory | High | Always included in full |
| Plan/tasks are mandatory | High | Required for implementation |
| Previous stage output | Medium | Included if sequential dependency |
| Memory state | Medium | Key values only, not full dump |
| Related ADRs | Low | Only if spec references them |
| Project conventions | Low | Summarized, not full text |
| Historical patterns | Lowest | Only via semantic retrieval |

---

## 4. Retrieval Strategies

### 4.1 HOT Retrieval

**Strategy:** Direct inclusion.

All HOT context is loaded directly into the session context window. No retrieval logic needed — it's always present.

**Content Sources:**
- `.opencode/SYSTEM.md` (system prompt template)
- `specs/{spec-id}.md` (spec content)
- Pipeline stage output (from previous stage)
- Session conversation history (last 10 turns)

### 4.2 WARM Retrieval

**Strategy:** Cache-based with TTL.

WARM context is stored in Redis with a 24-hour TTL. Retrieved by pipeline ID and stage name.

**Cache Keys:**
- `pipeline:{id}:stage:{name}:output` — Stage output
- `pipeline:{id}:verification:results` — Verification results
- `memory:active:state` — Active memory state
- `adr:{number}:summary` — ADR summaries

**Retrieval Logic:**
```typescript
async function loadWarmContext(pipelineId: string, stage: string): Promise<WarmContext> {
  const previousOutput = await cache.get(`pipeline:${pipelineId}:stage:${stage}:output`);
  const verificationResults = await cache.get(`pipeline:${pipelineId}:verification:results`);
  const memoryState = await cache.get('memory:active:state');
  const relatedADRs = await loadRelatedADRs(pipelineId);

  return {
    previousOutput: summarize(previousOutput, 1500),
    verificationResults: summarize(verificationResults, 1000),
    memoryState: extractKeyValues(memoryState, 500),
    relatedADRs: summarizeADRs(relatedADRs, 1000),
  };
}
```

### 4.3 COLD Retrieval

**Strategy:** Semantic search with relevance scoring.

COLD context is stored in a vector database (or file-based semantic index for Phase 0). Retrieved by semantic similarity to the current task.

**Index Content:**
- Completed pipeline summaries (vectorized)
- Historical decisions and patterns (vectorized)
- Project conventions and standards (vectorized)
- Knowledge graph node embeddings (vectorized)

**Retrieval Logic:**
```typescript
async function loadColdContext(task: string, maxTokens: number): Promise<ColdContext> {
  const query = vectorize(task);
  const results = await semanticSearch(query, {
    limit: 10,
    minScore: 0.7,
    categories: ['decisions', 'patterns', 'conventions'],
  });

  const selected = selectByRelevance(results, maxTokens);
  return {
    items: selected.map(r => ({
      source: r.metadata.source,
      summary: r.metadata.summary,
      relevance: r.score,
    })),
    totalTokens: estimateTokens(selected),
  };
}
```

### 4.4 ARCHIVAL Retrieval

**Strategy:** On-demand file/DB retrieval.

ARCHIVAL context is never loaded into the session automatically. Retrieved only when explicitly requested (e.g., during replay, debugging, or audit).

**Access Methods:**
- By pipeline ID: retrieve full event history
- By session ID: retrieve full transcript
- By artifact ID: retrieve specific artifact
- By date range: retrieve all events in range

---

## 5. Context Injection Policies

### 5.1 Injection Format

Context is injected into sessions using a structured format:

```markdown
# System Prompt
{role-specific system prompt}

# Active Spec
{spec content}

# Implementation Plan
{plan content}

# Previous Stage Output
{summarized previous output}

# Project State
{key memory values}

# Related Decisions
{summarized ADRs and patterns}

# Instructions
{task-specific instructions}
```

### 5.2 Injection Policies by Role

| Role | HOT | WARM | COLD | Total Budget |
|---|---|---|---|---|
| `architect` | System + spec + plan | Memory + ADRs | Decisions + patterns | 14,000 |
| `coder` | System + spec + plan + tasks | Previous output | Conventions | 14,000 |
| `reviewer` | System + spec + code diff | Verification results | Patterns | 12,000 |
| `verifier` | System + spec | Code state | N/A | 8,000 |
| `governance` | System + spec + plan | Pipeline state | Policies | 10,000 |
| `recovery` | System + spec + plan + failure | Code state + repair history | Patterns | 14,000 |

### 5.3 Context Refresh

Context is refreshed:
- **At session start:** Full assembly from all tiers.
- **After each tool call:** Incremental update (new file contents, tool results).
- **On file system change:** Watch-based update for modified files.
- **On pipeline stage transition:** Reload WARM context for new stage.

---

## 6. Token-Budget Governance

### 6.1 Budget Allocation

| Context Component | Min Tokens | Max Tokens | Priority |
|---|---|---|---|
| System prompt | 1,500 | 2,000 | Critical |
| Spec content | 2,000 | 4,000 | Critical |
| Plan/tasks | 1,000 | 2,000 | High |
| Previous output | 500 | 2,000 | Medium |
| Memory state | 200 | 500 | Medium |
| Related ADRs | 0 | 1,000 | Low |
| Conventions | 0 | 500 | Low |
| Historical patterns | 0 | 500 | Lowest |

### 6.2 Budget Enforcement

```typescript
function enforceBudget(context: AssembledContext, maxTokens: number): AssembledContext {
  const total = estimateTokens(context);
  if (total <= maxTokens) return context;

  const overflow = total - maxTokens;
  let remaining = overflow;

  // Trim lowest priority first
  remaining = trim(context.historicalPatterns, remaining);
  remaining = trim(context.conventions, remaining);
  remaining = trim(context.relatedADRs, remaining);
  remaining = trim(context.memoryState, remaining);
  remaining = trim(context.previousOutput, remaining);

  // If still over budget, summarize spec (preserve critical parts)
  if (remaining > 0) {
    context.specContent = summarizePreservingCritical(context.specContent, remaining);
  }

  return context;
}
```

### 6.3 Budget Monitoring

| Metric | Threshold | Action |
|---|---|---|
| Context utilization > 80% | Warning | Log, monitor |
| Context utilization > 90% | Alert | Aggressive summarization |
| Context utilization > 95% | Critical | Trim to minimum, alert |
| Token budget exceeded | Error | Session fails, escalate |

---

## 7. Active-State Reconstruction

### 7.1 Problem

When a session restarts or a pipeline resumes, the system must reconstruct the active state without replaying the entire event history.

### 7.2 Reconstruction Strategy

```
Session Restart
  │
  ▼
1. Load last checkpoint from memory
  │
  ▼
2. Load events since checkpoint
  │
  ▼
3. Replay events to reconstruct state
  │
  ├── Apply state mutations in order
  ├── Skip already-completed stages
  └── Resume from last incomplete stage
  │
  ▼
4. Rebuild context from all tiers
  │
  ▼
5. Emit SESSION_RESUMED with reconstructed state
```

### 7.3 Checkpoint Strategy

Checkpoints are created at:
- **Stage completion:** Full state snapshot.
- **Every 5 minutes:** Incremental state update.
- **Before human approval:** Full state snapshot.
- **Before merge:** Full state snapshot.

**Checkpoint Content:**
```typescript
interface Checkpoint {
  pipelineId: string;
  stage: string;
  state: PipelineState;
  memorySnapshot: MemoryState;
  artifactReferences: string[];
  eventSequenceNumber: number;
  createdAt: string;
}
```

### 7.4 Reconstruction Guarantees

- **Deterministic:** Same events → same state.
- **Complete:** No state loss between checkpoints.
- **Fast:** Reconstruction < 5 seconds for typical pipelines.
- **Verifiable:** Checksum of reconstructed state matches checkpoint.

---

## 8. Context Events

| Event | Payload | Emitted When |
|---|---|---|
| `CONTEXT_ASSEMBLED` | `{sessionId, hotTokens, warmTokens, coldTokens, totalTokens}` | Context assembly complete |
| `CONTEXT_BUDGET_WARNING` | `{sessionId, utilization, action}` | Budget utilization > 80% |
| `CONTEXT_BUDGET_CRITICAL` | `{sessionId, utilization, action}` | Budget utilization > 95% |
| `CONTEXT_COMPACTED` | `{sessionId, beforeTokens, afterTokens, strategy}` | Context compaction complete |
| `CHECKPOINT_CREATED` | `{pipelineId, stage, sequenceNumber}` | Checkpoint saved |
| `STATE_RECONSTRUCTED` | `{pipelineId, fromCheckpoint, eventCount}` | State reconstruction complete |

---

## 9. Context Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Loading everything into HOT | Token overflow, degraded quality | Strict tier separation |
| No budget enforcement | Sessions crash silently | Mandatory budget checks |
| Stale WARM context | Incorrect decisions | TTL-based eviction |
| Irrelevant COLD retrieval | Noise in context | Semantic relevance threshold |
| No checkpoint strategy | Slow reconstruction | Regular checkpoints |
| Skipping ARCHIVAL | Cannot replay or audit | Mandatory event persistence |
| Context mutation without logging | Untraceable state changes | Log all context changes |
