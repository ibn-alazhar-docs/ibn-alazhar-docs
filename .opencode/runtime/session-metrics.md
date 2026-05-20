# Runtime: Session Metrics

> **File:** `runtime/session-metrics.md`
> **Purpose:** Define session performance metrics, tracking format, and analysis procedures.
> **Scope:** All runtime sessions.

---

## Why Track Session Metrics

Session metrics enable:
- **Model routing optimization** — Identify which models perform best for which tasks.
- **Session planning** — Estimate effort for similar future tasks.
- **Quality improvement** — Track review pass rates and finding patterns.
- **Runtime health** — Detect degradation trends over time.
- **Agent performance** — Identify which agents produce the most valuable findings.

---

## Metrics Categories

### 1. Session Efficiency

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Session duration | Total time from boot to wrap | Start timestamp → end timestamp |
| Boot time | Time from session start to "Session Ready" | Step 1 start → Step 8 complete |
| Task count | Number of tasks completed in the session | Count from session record |
| Task success rate | Percentage of tasks completed successfully | Completed / Total × 100 |
| Fallback count | Number of times fallback model was used | Count model switches in session record |
| Escalation count | Number of escalations triggered | Count escalation events in session record |

### 2. Model Performance

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Model used | Which model handled the session | From session record |
| Model switches | Number of mid-session model changes | Count model switches |
| Output quality | Subjective quality rating (1-5) | Post-session assessment |
| Hallucination count | Number of incorrect outputs detected | Count flagged outputs |
| Context utilization | Estimated percentage of context window used | Subjective estimate (Low/Medium/High) |

### 3. Review Quality

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Reviews run | Number of review types executed | Count from session record |
| Review pass rate | Percentage of reviews that passed | Passed / Total × 100 |
| Findings count | Total findings across all reviews | Sum of findings |
| Required findings | Findings that blocked merge | Count required findings |
| Advisory findings | Findings that did not block merge | Count advisory findings |
| Review time | Time spent on reviews | Review start → review complete |

### 4. Agent Performance

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Agents activated | Number of agents used in the session | Count from session record |
| Agent findings | Number of findings per agent | Count per agent |
| Agent accuracy | Percentage of findings confirmed by human | Confirmed / Total × 100 |
| Agent false positives | Findings that were incorrect | Count false positives |
| Agent missed issues | Issues the agent should have found but didn't | Count missed issues |

### 5. Code Quality (Implementation Sessions)

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Files changed | Number of files modified | Count from git diff |
| Lines added | Lines of code added | `git diff --stat` |
| Lines removed | Lines of code removed | `git diff --stat` |
| Tests added | Number of new tests | Count test files/functions |
| Tests passing | Percentage of tests passing | Passed / Total × 100 |
| CI pass rate | Percentage of CI checks passing | Passed / Total × 100 |

### 6. Runtime Health

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Health check result | Overall health check status | PASS / WARN / FAIL |
| Health check categories | Per-category status | 6 categories from `runtime-health.md` |
| Degraded mode | Whether session ran in degraded mode | Yes / No |
| Recovery events | Number of failure recoveries | Count from session record |

---

## Session Metrics Record Format

Each session record includes a metrics section:

```markdown
## Session Metrics

### Efficiency
- Duration: [start → end]
- Boot time: [step 1 start → step 8 complete]
- Tasks completed: [count]
- Task success rate: [percentage]
- Fallbacks used: [count]
- Escalations triggered: [count]

### Model
- Primary model: [model name]
- Model switches: [count]
- Output quality: [1-5]
- Hallucinations detected: [count]
- Context utilization: [Low/Medium/High]

### Reviews
- Reviews run: [count]
- Review pass rate: [percentage]
- Total findings: [count]
- Required findings: [count]
- Advisory findings: [count]

### Agents
- Agents activated: [count]
- Agent findings: [per-agent count]
- Agent accuracy: [percentage]

### Code (if applicable)
- Files changed: [count]
- Lines added: [count]
- Lines removed: [count]
- Tests added: [count]
- Tests passing: [percentage]

### Runtime Health
- Health check: [PASS/WARN/FAIL]
- Degraded mode: [Yes/No]
- Recovery events: [count]
```

---

## Metrics Analysis

### Per-Session Analysis

After each session, the orchestrating agent reviews the metrics:
1. Compare against previous sessions.
2. Identify trends (improving, stable, degrading).
3. Flag anomalies (unusual duration, high fallback count, low pass rate).
4. Document observations in session record.

### Aggregate Analysis

After every 10 sessions:
1. Compile metrics from all sessions.
2. Calculate averages and trends.
3. Identify patterns:
   - Which model has the highest success rate per task type?
   - Which agent produces the most accurate findings?
   - Which review type has the highest failure rate?
   - Are sessions getting faster or slower?
4. Update `MODEL_ROUTING.md` if model performance patterns emerge.
5. Update agent definitions if accuracy patterns emerge.
6. Update review checklists if failure patterns emerge.

### Model Routing Updates

If metrics show a model consistently underperforms for a task type:

1. Document the pattern in session record.
2. After 3+ sessions showing the same pattern: update `MODEL_ROUTING.md`.
3. Move the task type to a different model in the routing table.
4. Document the routing change in `docs/19_DECISION_LOG.md`.

---

## Metric Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Task success rate | > 90% | 70-90% | < 70% |
| Review pass rate | > 85% | 70-85% | < 70% |
| Output quality | 4-5 | 3 | 1-2 |
| Hallucination count | 0 | 1-2 | > 2 |
| Fallback count | 0 | 1 | > 1 |
| Escalation count | 0-1 | 2-3 | > 3 |
| Boot time | < 2 min | 2-5 min | > 5 min |
| Agent accuracy | > 80% | 60-80% | < 60% |

---

## Metrics Limitations

1. **Subjective metrics** (output quality, context utilization) are estimates, not measurements.
2. **Small sample size** — Early sessions will not have enough data for meaningful analysis.
3. **Task variance** — Different tasks have different complexity, making direct comparison difficult.
4. **Model variance** — Different models have different strengths, making cross-model comparison unfair without task-type normalization.

---

## Metrics Collection Schedule

| Trigger | Action |
|---------|--------|
| Session end | Record metrics in session record |
| Every 10 sessions | Aggregate analysis, update routing if needed |
| Phase gate | Include metrics summary in gate report |
| Health check | Include current metrics trend in health report |

---

**Last Updated:** 2026-05-20
**Next Review:** After 10 sessions or Phase 1 gate review
