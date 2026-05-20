# SDK Execution Model

> **Purpose:** Define how the OpenCode SDK serves as the execution kernel for the AI Engineering Platform.
> **Scope:** SDK capabilities, session management, tool execution, orchestration patterns.

---

## 1. SDK Role in the Platform

The OpenCode SDK is the **execution kernel** — the lowest-level component that directly interacts with code, files, shell, and AI models. The AI Engineering Platform builds orchestration, governance, and automation layers above it.

```
AI Engineering Platform
  ├── Pipeline Engine (orchestrates stages)
  ├── Governance System (enforces rules)
  ├── Event Bus (coordinates components)
  └── Session Manager (manages SDK sessions)
        │
        ▼
  OpenCode SDK (execution kernel)
        ├── Sessions (isolated AI execution contexts)
        ├── Tools (file, shell, search, web)
        ├── Structured Outputs (typed AI responses)
        └── TUI API (terminal interface)
```

---

## 2. SDK Capabilities Used

### 2.1 Sessions

Sessions are isolated AI execution contexts with:
- A system prompt defining the role and rules.
- Tool access (file, shell, search, etc.).
- Conversation history (turns within the session).
- Model configuration (temperature, max tokens).

**Platform Usage:**
- Each pipeline stage creates one or more sessions.
- Sessions are role-specific (architect, coder, reviewer, etc.).
- Sessions are monitored for health and timeout.
- Session outputs are captured and validated.

### 2.2 Shell Execution

The SDK can execute shell commands within a session.

**Platform Usage:**
- `git` commands for branch/commit/PR operations.
- `pnpm test`, `pnpm lint`, `pnpm typecheck` for verification.
- `docker compose` commands for local environment checks.
- Playwright commands for browser automation.

**Safety Constraints:**
- Shell commands are validated against an allowlist.
- Destructive commands (`rm -rf`, `git push --force`) require governance approval.
- Shell output is captured and logged.
- Shell execution has a configurable timeout.

### 2.3 File APIs

The SDK can read, write, and edit files.

**Platform Usage:**
- Reading specs, docs, and source code.
- Writing implementation code.
- Editing existing files (search-and-replace).
- Creating new files (tests, docs, ADRs).

**Safety Constraints:**
- File writes are restricted to allowed paths.
- No writes to `.env`, secrets, or config files without approval.
- File operations are logged for audit.
- File changes are validated against structured output schemas.

### 2.4 Structured Outputs

The SDK supports structured output generation with JSON schema validation.

**Platform Usage:**
- All AI-generated outputs (plans, reviews, reports) use structured outputs.
- Schemas are defined in `schemas/STRUCTURED_OUTPUT_SCHEMAS.md`.
- Invalid outputs trigger regeneration.
- Valid outputs are passed to downstream components.

### 2.5 Event Subscriptions

The SDK can emit events for session state changes.

**Platform Usage:**
- Session start/complete/fail events are captured.
- Tool execution events are logged.
- Model response events are validated.

### 2.6 TUI API

The SDK provides a terminal user interface API.

**Platform Usage:**
- Pipeline progress display.
- Session status indicators.
- Real-time event streaming to terminal.
- Interactive approval prompts for human-in-the-loop.

---

## 3. Session Creation Model

### 3.1 Session Configuration per Role

```typescript
interface SessionConfig {
  role: RuntimeRole;
  systemPrompt: string;
  tools: ToolPermission[];
  model: {
    provider: string;
    name: string;
    temperature: number;
    maxTokens: number;
  };
  timeout: number; // minutes
  workingDirectory: string;
  environment: Record<string, string>;
}
```

### 3.2 Role-Specific Configurations

| Role | System Prompt Source | Tools | Temperature |
|---|---|---|---|
| `architect` | `prompts/architect.md` | read, glob, grep, bash, write (docs), edit (docs) | 0.1 |
| `planner` | `prompts/planner.md` | read, glob, grep, write (plans) | 0.1 |
| `coder` | `prompts/coder.md` | read, write (source), edit (source), bash (limited) | 0.1 |
| `reviewer` | `prompts/reviewer.md` | read, glob, grep, bash (test) | 0.0 |
| `verifier` | `prompts/verifier.md` | read, bash (test, lint, typecheck) | 0.0 |
| `governance` | `prompts/governance.md` | read, glob, grep | 0.0 |
| `recovery` | `prompts/recovery.md` | read, write (source), edit (source), bash (limited), git revert | 0.1 |
| `documentation` | `prompts/documentation.md` | read, write (docs), edit (docs) | 0.1 |

### 3.3 Session Lifecycle via SDK

```
createSession(config)
  │
  ▼
session.start()
  │
  ▼
session.sendPrompt(prompt)
  │
  ▼
session.onToolCall(handler)  ── handles tool calls from AI
  │
  ▼
session.onResponse(handler)  ── validates structured output
  │
  ▼
session.onComplete(handler)  ── captures final output
  │
  ▼
session.onError(handler)     ── handles failures
  │
  ▼
session.end()
```

---

## 4. Tool Execution Model

### 4.1 Tool Call Flow

```
AI Model
  │
  ▼ (generates tool call)
Session Manager
  │
  ▼ (validates tool permission)
Tool Router
  │
  ├──► SDK File API ── read/write/edit files
  ├──► SDK Shell API ── execute commands
  ├──► SDK Search API ── grep/glob
  ├──► SDK Web API ── fetch/search
  └──► External APIs ── GitHub, Playwright
  │
  ▼ (returns result)
Session Manager
  │
  ▼ (logs result)
Event Bus ──emit──► TOOL_CALL_COMPLETED
```

### 4.2 Tool Permission Enforcement

```typescript
interface ToolPermission {
  tool: string;
  allowed: boolean;
  constraints?: {
    paths?: string[];       // allowed file paths
    commands?: string[];    // allowed shell commands
    maxOutputBytes?: number;
    timeoutMs?: number;
  };
}
```

**Permission Check:**
1. Session receives tool call from AI model.
2. Tool Router checks permission for the session's role.
3. If allowed, tool executes with constraints.
4. If denied, tool returns error to AI model.
5. All tool calls are logged.

### 4.3 Tool Call Allowlist

| Tool Category | Allowed Commands/Operations |
|---|---|
| **Shell** | `git`, `pnpm`, `docker compose`, `playwright`, `node`, `npx`, `ls`, `cat`, `diff` |
| **Shell (Restricted)** | `rm`, `mv`, `chmod`, `kill` — require governance approval |
| **Shell (Blocked)** | `sudo`, `curl` to unknown hosts, `wget`, `nc`, `ssh` — always blocked |
| **File** | Read any `.ts`, `.tsx`, `.js`, `.md`, `.json`, `.yaml`, `.prisma` |
| **File (Restricted)** | Write/edit `.ts`, `.tsx`, `.js` — only in source directories |
| **File (Blocked)** | `.env`, `.env.*`, `credentials.*`, `*.key`, `*.pem` |

---

## 5. Structured Output Integration

### 5.1 Output Schema Binding

Each session role binds to specific output schemas:

| Role | Output Schema |
|---|---|
| `architect` | `ImplementationPlan`, `ADRDraft` |
| `coder` | `CodeChange`, `FileOperation` |
| `reviewer` | `ReviewResult`, `Finding` |
| `verifier` | `VerificationResult`, `TestReport` |
| `governance` | `GateResult`, `ScopeResult` |
| `recovery` | `RepairReport`, `RollbackPlan` |

### 5.2 Validation Flow

```
AI Model Response
  │
  ▼
Structured Output Parser
  │
  ├── Valid ──► Pass to downstream component
  │
  └── Invalid ──► Regeneration Request
                    │
                    ▼
              AI Model (with error context)
                    │
                    ▼
              Retry (max 3 attempts)
                    │
              ┌─────┴─────┐
              │           │
           Valid        Invalid (after 3)
              │           │
              ▼           ▼
           Pass        Session Failed
```

### 5.3 Schema Enforcement

All schemas are defined as JSON Schema objects and validated using a JSON Schema validator. The platform maintains a schema registry:

```typescript
interface SchemaRegistry {
  getSchema(schemaName: string): JSONSchema;
  validate(schemaName: string, data: unknown): ValidationResult;
  register(schemaName: string, schema: JSONSchema): void;
}
```

---

## 6. Session Orchestration Patterns

### 6.1 Sequential Pattern

Stages execute in order, each waiting for the previous to complete:

```
Session A (architect) ──complete──► Session B (coder) ──complete──► Session C (reviewer)
```

**Used for:** Pipeline stages that depend on previous stage output.

### 6.2 Parallel Pattern

Multiple sessions run concurrently:

```
Session A (verifier: lint) ──┐
Session B (verifier: test) ──┼──► Aggregate Results
Session C (verifier: build) ─┘
```

**Used for:** Verification stages that are independent.

### 6.3 Fan-Out/Fan-In Pattern

One session produces output consumed by multiple sessions:

```
               ┌──► Session B (security review)
Session A ────┼──► Session C (RTL audit)
(architect)   └──► Session D (brand audit)
```

**Used for:** Review stages that analyze the same code from different angles.

### 6.4 Retry Pattern

Session fails, recovery session attempts fix:

```
Session A (coder) ──fail──► Session B (recovery) ──success──► Session A (coder, retry)
```

**Used for:** Repair loops within the recovery engine.

---

## 7. Session Context Management

### 7.1 Context Loading

Each session loads context from:
1. **System Prompt** — Role-specific instructions.
2. **Project Context** — `.opencode/` runtime files.
3. **Spec Content** — The spec being implemented.
4. **Memory** — `.opencode/memory/` state.
5. **Relevant Files** — Source files related to the task.

### 7.2 Context Size Management

| Context Source | Max Size | Strategy |
|---|---|---|
| System Prompt | 2000 tokens | Fixed, role-specific |
| Project Context | 4000 tokens | Summarized from runtime files |
| Spec Content | Full spec | Always included |
| Memory | 2000 tokens | Key state only |
| File Context | 8000 tokens | Relevant files only, summarized if large |

### 7.3 Context Refresh

Context is refreshed:
- At session start (full load).
- After each tool call (incremental update).
- When file system changes detected (watch-based).

---

## 8. Error Handling

### 8.1 SDK-Level Errors

| Error | Recovery |
|---|---|
| Model API timeout | Retry with exponential backoff (max 3) |
| Model API rate limit | Wait for rate limit reset, retry |
| Session crash | Restart session, resume from last checkpoint |
| Tool execution failure | Log error, attempt alternative tool, escalate if critical |
| Structured output parse failure | Request regeneration with error context |

### 8.2 Platform-Level Errors

| Error | Recovery |
|---|---|
| Pipeline stuck (no progress for 5 min) | Force timeout, emit PIPELINE_STUCK, escalate |
| Event bus disconnect | Queue events locally, reconnect, flush |
| Governance check timeout | Fail open (block pipeline), alert human |
| Memory corruption | Restore from snapshot, alert human |

---

## 9. Performance Considerations

### 9.1 Session Warm-Up

Sessions have initialization overhead (context loading, model connection). The platform:
- Pre-warms sessions for expected roles.
- Reuses sessions within a pipeline when possible.
- Maintains a session pool for common roles.

### 9.2 Tool Call Optimization

- Batch file reads when possible.
- Cache file contents within a session.
- Use glob/grep for targeted searches instead of reading entire directories.
- Parallelize independent tool calls.

### 9.3 Model API Optimization

- Use low temperature (0.0-0.1) for deterministic outputs.
- Set appropriate max_tokens for each role.
- Use structured outputs to reduce parsing overhead.
- Cache model responses for identical prompts (when safe).
