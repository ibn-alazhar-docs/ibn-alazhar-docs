# MODEL_ROUTING.md — Model Selection and Routing Logic

> **Purpose:** Define which model handles which task type.
> **Scope:** Coding, reasoning, review, fallback, escalation, utility routing.

---

## Preferred Models

| Model | Provider | Cost | Strength |
|-------|----------|------|----------|
| `openrouter/qwen/qwen3-coder:free` | OpenRouter | Free | Coding, code generation, refactoring |
| `openrouter/nvidia/nemotron-3-super-120b-a12b:free` | OpenRouter | Free | Reasoning, analysis, architecture |
| `openrouter/deepseek/deepseek-v4-flash:free` | OpenRouter | Free | Fast utility, summarization, classification |

---

## Routing Table

### Coding Routing

| Task Type | Primary Model | Fallback |
|-----------|--------------|----------|
| Component creation | qwen3-coder:free | deepseek-v4-flash:free |
| API route implementation | qwen3-coder:free | deepseek-v4-flash:free |
| Database schema changes | qwen3-coder:free | nemotron-3-super-120b:free |
| Test writing | qwen3-coder:free | deepseek-v4-flash:free |
| Refactoring | qwen3-coder:free | nemotron-3-super-120b:free |
| Docker configuration | qwen3-coder:free | deepseek-v4-flash:free |
| CSS/RTL fixes | qwen3-coder:free | deepseek-v4-flash:free |

### Reasoning Routing

| Task Type | Primary Model | Fallback |
|-----------|--------------|----------|
| Architecture design | nemotron-3-super-120b:free | qwen3-coder:free |
| Spec analysis | nemotron-3-super-120b:free | deepseek-v4-flash:free |
| Risk assessment | nemotron-3-super-120b:free | deepseek-v4-flash:free |
| Trade-off analysis | nemotron-3-super-120b:free | qwen3-coder:free |
| ADR drafting | nemotron-3-super-120b:free | qwen3-coder:free |
| Phase planning | nemotron-3-super-120b:free | deepseek-v4-flash:free |

### Review Routing

| Task Type | Primary Model | Fallback |
|-----------|--------------|----------|
| Code review | qwen3-coder:free | nemotron-3-super-120b:free |
| Security review | nemotron-3-super-120b:free | qwen3-coder:free |
| Spec review | nemotron-3-super-120b:free | qwen3-coder:free |
| RTL audit | qwen3-coder:free | nemotron-3-super-120b:free |
| Brand audit | qwen3-coder:free | nemotron-3-super-120b:free |
| Docs consistency | deepseek-v4-flash:free | qwen3-coder:free |

### Fallback Routing

| Primary Unavailable | Fallback Chain |
|---------------------|----------------|
| qwen3-coder:free | deepseek-v4-flash:free → nemotron-3-super-120b:free |
| nemotron-3-super-120b:free | qwen3-coder:free → deepseek-v4-flash:free |
| deepseek-v4-flash:free | qwen3-coder:free → nemotron-3-super-120b:free |

### Escalation Routing

| Situation | Escalation |
|-----------|------------|
| All free models unavailable | Flag to human, pause non-urgent work |
| Model produces incorrect output | Retry with different model, flag if persistent |
| Model context limit exceeded | Split task, use fallback with smaller context |
| Security-sensitive task | Prefer nemotron-3-super-120b:free, human review mandatory |
| Architecture-critical decision | nemotron-3-super-120b:free + human approval required |

### Utility Routing

| Task Type | Primary Model | Fallback |
|-----------|--------------|----------|
| Summarization | deepseek-v4-flash:free | nemotron-3-super-120b:free |
| Classification | deepseek-v4-flash:free | qwen3-coder:free |
| Formatting | deepseek-v4-flash:free | qwen3-coder:free |
| Translation (ar↔en) | deepseek-v4-flash:free | qwen3-coder:free |
| File organization | deepseek-v4-flash:free | qwen3-coder:free |
| Status updates | deepseek-v4-flash:free | qwen3-coder:free |

---

## Model Selection Rules

1. **Default to free models.** No paid models unless explicitly approved.
2. **Match task to strength.** Coding → coder model. Reasoning → reasoning model.
3. **Use fallback chain.** If primary is unavailable, try fallbacks in order.
4. **Escalate on persistent failure.** If all models fail, flag to human.
5. **Record model used.** Every session logs which model was used for which task.
6. **Security tasks get extra review.** Security-related outputs are always reviewed by a second model or human.

---

## Model Initialization

At session start (see `BOOT_SEQUENCE.md`):

1. Read `MODEL_ROUTING.md` for routing table.
2. Read `runtime/model-selection.md` for current model availability.
3. Select primary model based on session task type.
4. Verify model is responsive.
5. If not, apply fallback routing.
6. Log selected model in session record.

---

## Routing Configuration

Routing configurations are stored in `routing/models/`:

| File | Purpose |
|------|---------|
| `coding.md` | Coding task routing details |
| `reasoning.md` | Reasoning task routing details |
| `review.md` | Review task routing details |
| `fallback.md` | Fallback routing details |
| `escalation.md` | Escalation routing details |

---

## Model Performance Tracking

Track model performance per task type:
- Success rate
- Average response quality
- Context utilization
- Fallback frequency

Update routing table if a model consistently underperforms for a task type.
