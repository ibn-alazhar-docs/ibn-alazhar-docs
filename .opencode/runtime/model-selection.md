# Runtime: Model Selection

> **File:** `runtime/model-selection.md`
> **Purpose:** Define model initialization and selection logic for the runtime.

---

## Model Initialization

At session start, the runtime selects a model based on the expected primary task type.

### Selection Process

1. **Classify task type:** Coding, Reasoning, Review, Utility.
2. **Look up routing table:** `MODEL_ROUTING.md`.
3. **Check primary model availability.**
4. **If unavailable, apply fallback chain.**
5. **Verify model is responsive.**
6. **Log selected model in session record.**

### Task Classification

| Indicator                                | Task Type |
| ---------------------------------------- | --------- |
| "implement", "create", "fix", "refactor" | Coding    |
| "design", "plan", "analyze", "assess"    | Reasoning |
| "review", "audit", "check"               | Review    |
| "summarize", "format", "organize"        | Utility   |

### Default Model Selection

| Task Type | Primary Model              | Fallback 1                 | Fallback 2                 |
| --------- | -------------------------- | -------------------------- | -------------------------- |
| Coding    | qwen3-coder:free           | deepseek-v4-flash:free     | nemotron-3-super-120b:free |
| Reasoning | nemotron-3-super-120b:free | qwen3-coder:free           | deepseek-v4-flash:free     |
| Review    | qwen3-coder:free           | nemotron-3-super-120b:free | deepseek-v4-flash:free     |
| Utility   | deepseek-v4-flash:free     | qwen3-coder:free           | nemotron-3-super-120b:free |

---

## Model Availability Check

Before using a model:

1. Send a test prompt.
2. Verify response is received within timeout.
3. Verify response is coherent.
4. If any check fails, try next model in fallback chain.

### Timeout Values

| Model                      | Timeout    |
| -------------------------- | ---------- |
| qwen3-coder:free           | 30 seconds |
| nemotron-3-super-120b:free | 60 seconds |
| deepseek-v4-flash:free     | 15 seconds |

---

## Model Switching

Mid-session model switching is allowed when:

- Task type changes (e.g., from coding to review).
- Current model becomes unresponsive.
- User requests a different model.

### Switching Process

1. Save current context.
2. Select new model per routing table.
3. Verify new model is responsive.
4. Log model switch in session record.
5. Continue with new model.

---

## Model Performance Tracking

Track per session:

- Model used.
- Task type.
- Success/failure.
- Response quality (subjective).
- Fallback used (yes/no).

Use tracking data to update routing table if patterns emerge.

---

## Model Constraints

| Constraint      | Rule                                                              |
| --------------- | ----------------------------------------------------------------- |
| Cost            | Use free models only unless explicitly approved                   |
| Context         | Stay within model context limits                                  |
| Security        | Security-sensitive tasks require human review regardless of model |
| Reproducibility | Log model used for reproducibility                                |
