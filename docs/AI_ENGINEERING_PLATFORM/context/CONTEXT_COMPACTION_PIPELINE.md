# Context Compaction Pipeline

> **Purpose:** Define the context compaction system for reducing context size while preserving critical information.
> **Scope:** Compaction strategies, summarization rules, replay-safe compression, knowledge extraction.

---

## 1. Compaction Problem Statement

As sessions progress, context grows through:
- Conversation turns (each turn adds tokens)
- Tool call results (file contents, command output)
- Verification logs (test output, error messages)
- Repair loop history (multiple attempts)
- Review findings (security, RTL, brand, spec)

Without compaction, sessions will:
- Exceed model context limits
- Become slow and expensive
- Lose signal in accumulated noise
- Produce degraded output quality

Compaction must be:
- **Lossy but safe:** Remove noise, preserve signal.
- **Replay-safe:** Compacted context can be used for replay.
- **Deterministic:** Same input → same compacted output.
- **Observable:** Compaction actions are logged and metriced.

---

## 2. Compaction Architecture

### 2.1 Compaction Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│              CONTEXT COMPACTION PIPELINE                     │
│                                                              │
│  Input: Full session context (growing)                       │
│                                                              │
│  Stage 1: Token Count                                        │
│  ├── Estimate current token usage                            │
│  ├── Compare against budget                                  │
│  └── If under budget → skip compaction                       │
│                                                              │
│  Stage 2: Tiered Compaction                                  │
│  ├── Trim COLD context (lowest relevance first)              │
│  ├── Summarize WARM context (stage outputs → summaries)      │
│  ├── Compress conversation history (turns → summary)         │
│  └── Preserve HOT context (system prompt + spec + plan)      │
│                                                              │
│  Stage 3: Knowledge Extraction                               │
│  ├── Extract key decisions from conversation                 │
│  ├── Extract code patterns from tool calls                   │
│  ├── Extract failure patterns from repair loops              │
│  └── Store extracted knowledge in memory                     │
│                                                              │
│  Stage 4: Validation                                         │
│  ├── Verify critical content preserved                       │
│  ├── Verify token budget met                                 │
│  └── Emit CONTEXT_COMPACTED event                            │
│                                                              │
│  Output: Compacted session context                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Compaction Triggers

| Trigger | Threshold | Action |
|---|---|---|
| Token budget > 70% | Warning | Pre-emptive compaction |
| Token budget > 85% | Alert | Aggressive compaction |
| Token budget > 95% | Critical | Emergency compaction |
| Session turn count > 20 | Scheduled | Routine compaction |
| Stage transition | Mandatory | Full compaction before next stage |
| Repair loop start | Mandatory | Compact before repair attempt |

---

## 3. Compaction Strategies

### 3.1 Strategy: Conversation Summarization

**When:** Session turn count exceeds threshold.

**Process:**
1. Group conversation turns into logical segments (by topic/tool).
2. Summarize each segment into 2-3 sentences.
3. Preserve: decisions, code changes, error patterns.
4. Discard: intermediate tool calls, exploratory searches.

**Example:**
```
BEFORE (50 turns, ~8000 tokens):
- Turn 1-5: Searching for auth middleware files
- Turn 6-10: Reading auth middleware code
- Turn 11-15: Analyzing token validation logic
- Turn 16-20: Identifying missing rate limiting
- Turn 21-30: Implementing rate limiter
- Turn 31-40: Testing rate limiter
- Turn 41-50: Fixing edge cases

AFTER (1 summary, ~200 tokens):
"Analyzed auth middleware in src/middleware/auth.ts.
Identified missing rate limiting on token validation endpoint.
Implemented rate limiter using Redis with 100 req/min limit.
All tests pass. Edge cases: token expiry, invalid tokens handled."
```

### 3.2 Strategy: Tool Output Compression

**When:** Tool call results are large (file contents, command output).

**Process:**
1. For file reads: Keep only relevant sections (lines around changes).
2. For command output: Keep only errors and key results.
3. For test output: Keep only failed tests and summary.
4. For lint/typecheck: Keep only error lines, not full output.

**Compression Rules:**
```typescript
interface CompressionRule {
  toolType: string;
  maxOutputTokens: number;
  preservePattern: RegExp;  // What to keep
  discardPattern: RegExp;   // What to discard
}

const rules: CompressionRule[] = [
  {
    toolType: 'file-read',
    maxOutputTokens: 2000,
    preservePattern: /function|class|interface|export/,
    discardPattern: /^\s*\/\/.*$|^\s*\/\*.*\*\/$/,  // Comments
  },
  {
    toolType: 'test-run',
    maxOutputTokens: 1000,
    preservePattern: /FAIL|Error|✗/,
    discardPattern: /PASS|✓|skipped/,
  },
  {
    toolType: 'lint',
    maxOutputTokens: 500,
    preservePattern: /error|warning/,
    discardPattern: /all files passed/,
  },
];
```

### 3.3 Strategy: WARM Context Summarization

**When:** Previous stage outputs are too large.

**Process:**
1. Extract key decisions from the stage output.
2. Extract file changes (paths, operation types).
3. Extract verification results (pass/fail per check).
4. Summarize into structured format.

**Summarized Format:**
```json
{
  "stage": "implement",
  "decisions": [
    "Used Redis for rate limiting instead of in-memory",
    "Added rate limit header to all API responses"
  ],
  "filesChanged": [
    { "path": "src/middleware/auth.ts", "operation": "modify", "linesChanged": 45 },
    { "path": "src/middleware/rate-limit.ts", "operation": "create", "linesChanged": 80 }
  ],
  "verificationResults": {
    "lint": "passed",
    "typecheck": "passed",
    "tests": "passed (42/42)",
    "build": "passed"
  },
  "summary": "Implemented rate limiting for auth middleware using Redis."
}
```

### 3.4 Strategy: COLD Context Pruning

**When:** COLD context exceeds token budget.

**Process:**
1. Score each COLD item by relevance to current task.
2. Remove items below relevance threshold (0.7).
3. If still over budget, reduce threshold incrementally.
4. Preserve at least 1 item from each category (decisions, patterns, conventions).

**Relevance Scoring:**
```typescript
function scoreRelevance(item: ColdItem, task: string): number {
  let score = 0;

  // Semantic similarity
  score += semanticSimilarity(item.vector, vectorize(task)) * 0.5;

  // Recency (newer items more relevant)
  score += recencyScore(item.createdAt) * 0.2;

  // Frequency (frequently referenced items more relevant)
  score += frequencyScore(item.referenceCount) * 0.15;

  // Category match (same category as task more relevant)
  score += categoryMatch(item.category, taskCategory(task)) * 0.15;

  return score;
}
```

---

## 4. Knowledge Extraction

### 4.1 Extraction Types

| Type | Source | Extracted To |
|---|---|---|
| Decisions | Conversation turns | Memory: decisions |
| Code patterns | Tool calls (file writes) | Memory: patterns |
| Failure patterns | Repair loops | Memory: failures |
| Conventions | Review findings | Memory: conventions |
| Spec interpretations | Architect session | Memory: interpretations |

### 4.2 Extraction Process

```
Compaction Triggered
  │
  ▼
1. Scan conversation for decision markers
  │
  ├── Keywords: "decided", "chose", "opted", "will use"
  ├── Patterns: "X because Y"
  └── Extract: decision text, rationale, context
  │
  ▼
2. Scan tool calls for code patterns
  │
  ├── Patterns: Repeated file structures
  ├── Conventions: Naming, organization
  └── Extract: pattern description, examples
  │
  ▼
3. Scan repair loops for failure patterns
  │
  ├── Patterns: Recurring error types
  ├── Fixes: Successful repair strategies
  └── Extract: failure type, fix strategy, success rate
  │
  ▼
4. Store extracted knowledge in memory
  │
  ├── Update memory:decisions
  ├── Update memory:patterns
  ├── Update memory:failures
  └── Emit KNOWLEDGE_EXTRACTED event
```

### 4.3 Extracted Knowledge Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ExtractedKnowledge",
  "type": "object",
  "required": ["type", "content", "source", "confidence"],
  "properties": {
    "type": {
      "enum": ["decision", "pattern", "failure", "convention", "interpretation"]
    },
    "content": { "type": "string" },
    "source": {
      "type": "object",
      "properties": {
        "sessionId": { "type": "string" },
        "pipelineId": { "type": "string" },
        "stage": { "type": "string" },
        "turnRange": { "type": "object", "properties": { "start": { "type": "integer" }, "end": { "type": "integer" } } }
      }
    },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "tags": { "type": "array", "items": { "type": "string" } },
    "extractedAt": { "type": "string" }
  }
}
```

---

## 5. Replay-Safe Compression

### 5.1 Problem

Compacted context must support pipeline replay. If compaction loses critical information, replay will produce different results.

### 5.2 Replay-Safe Strategy

```
Original Context
  │
  ▼
1. Create compacted version (for active session)
  │
  ▼
2. Store compaction metadata alongside compacted context:
  ├── What was removed (file paths, turn ranges)
  ├── Summarization strategy used
  ├── Knowledge extracted
  └── Token counts (before/after)
  │
  ▼
3. For replay:
  ├── Load original context from ARCHIVAL
  ├── Apply same compaction strategy
  ├── Verify compacted output matches
  └── If mismatch: use original context
```

### 5.3 Compaction Metadata

```typescript
interface CompactionMetadata {
  sessionId: string;
  pipelineId: string;
  stage: string;
  originalTokens: number;
  compactedTokens: number;
  strategy: string;
  removed: {
    turns: number[];
    toolCalls: string[];
    fileReads: string[];
  };
  extracted: ExtractedKnowledge[];
  compactedAt: string;
  checksum: string;  // For verification during replay
}
```

### 5.4 Replay Verification

```typescript
async function verifyReplayCompaction(
  originalContext: string,
  compactedContext: string,
  metadata: CompactionMetadata
): boolean {
  // Re-apply compaction to original
  const reCompacted = await applyCompaction(originalContext, metadata.strategy);

  // Compare with stored compacted version
  const match = reCompacted === compactedContext;

  if (!match) {
    // Log discrepancy, use original for replay
    emitEvent('REPLAY_COMPACTION_MISMATCH', { metadata });
    return false;
  }

  return true;
}
```

---

## 6. Compaction Events

| Event | Payload | Emitted When |
|---|---|---|
| `COMPACTION_TRIGGERED` | `{sessionId, reason, tokenCount, budget}` | Compaction started |
| `CONTEXT_COMPACTED` | `{sessionId, beforeTokens, afterTokens, strategy, removed}` | Compaction complete |
| `KNOWLEDGE_EXTRACTED` | `{sessionId, type, content, confidence}` | Knowledge extracted |
| `COMPACTION_FAILED` | `{sessionId, reason, error}` | Compaction failed |
| `REPLAY_COMPACTION_MISMATCH` | `{metadata, expected, actual}` | Replay verification failed |

---

## 7. Compaction Configuration

```yaml
compaction:
  triggers:
    token_utilization_warning: 70
    token_utilization_alert: 85
    token_utilization_critical: 95
    max_turns_before_compaction: 20

  strategies:
    conversation_summarization:
      max_segment_tokens: 500
      preserve_decisions: true
      preserve_code_changes: true
      preserve_errors: true

    tool_output_compression:
      file_read_max_tokens: 2000
      test_output_max_tokens: 1000
      lint_output_max_tokens: 500

    warm_context_summarization:
      max_output_tokens: 1500
      preserve_file_changes: true
      preserve_verification_results: true

    cold_context_pruning:
      min_relevance_score: 0.7
      min_items_per_category: 1

  knowledge_extraction:
    enabled: true
    types:
      - decision
      - pattern
      - failure
      - convention
      - interpretation
    min_confidence: 0.6

  replay_safety:
    store_metadata: true
    verify_on_replay: true
    fallback_to_original: true
```

---

## 8. Compaction Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Over-summarization | Loss of critical details | Preserve decisions and code changes |
| No knowledge extraction | Lost learning opportunities | Mandatory extraction during compaction |
| Compacting too early | Unnecessary work | Token budget triggers |
| Compacting too late | Session crashes | Pre-emptive compaction at 70% |
| No replay metadata | Cannot verify replay | Store compaction metadata |
| Discarding error output | Cannot debug failures | Always preserve errors |
| Asymmetric compaction | Different output on replay | Deterministic compaction strategy |
