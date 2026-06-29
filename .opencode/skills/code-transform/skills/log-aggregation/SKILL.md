---
name: log-aggregation
description: "Centralized log aggregation strategy — picks ELK, Loki+Grafana, Datadog, or CloudWatch based on hosting model and budget; defines the structured-logging schema (JSON with timestamp, level, message, trace_id, user_id); enforces PII scrubbing and retention policy. Invoked at Phase 7 (OBSERVABILITY) whenever a service is about to ship without a logging backend."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: devops
---

# Log Aggregation

> Owns the logging backbone: where logs go, what shape they take, how long they live, and what they must never contain. A service that logs to stdout without a backend is a service you can't debug at 3am.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | CENSUS lists a service with no logging backend | Gap — add one before prod |
| Phase 7 — OBSERVABILITY | Always, for every new service | Centralized logging is a Day-1 requirement, not Day-100 |
| Phase 8 — ROLLOUT | After first prod deploy | Verify logs are landing in the backend with trace_id populated |
| Phase 13 — RETROSPECTIVE | After any incident that took >30 min to diagnose | Was log query the bottleneck? Tune retention or schema |

**Do NOT use this sub-skill for:** metrics (use `metrics-dashboard`), distributed tracing (use `tracing-setup`), or audit logs (those go to an append-only store with longer retention — route to `audit-log` sub-skill if it exists). Logs are for diagnosis; metrics are for alerting; traces are for causality.

## What It Does

1. Reads the project's hosting profile (self-hosted, AWS-only, multi-cloud, SaaS-OK) and budget from CENSUS.
2. Routes to a logging backend via the decision tree below.
3. Defines the **structured-logging schema** every service must emit:
   ```json
   {"ts":"2026-06-26T14:32:01.123Z","level":"info","service":"api","msg":"order created","trace_id":"abc123","user_id":"u_42","order_id":"o_99","duration_ms":17}
   ```
4. Defines log levels and when to use each (see table below).
5. Installs PII scrubbing at the edge (Logstash filter, Vector transform, or OpenTelemetry processor) so secrets never reach the backend.
6. Defines retention: 30 days hot, 90 days warm, 1 year cold (S3 Glacier), with lifecycle policy attached.
7. Emits `LOGGING_PLAN.md` with backend choice, schema, scrubbing rules, retention policy, and example queries.

## Integration Contract

```
INPUT:
  - census_path: path to CENSUS.md (required)
  - hosting: self-hosted|aws-only|multi-cloud|saas-ok (default from CENSUS)
  - budget_monthly_usd: int (default 500 — influences Datadog vs Loki)
  - retention_days_hot: int (default 30)
  - retention_days_warm: int (default 90)
  - retention_years_cold: int (default 1)

OUTPUT (JSON to stdout):
  {
    "status": "ok|warn|error",
    "backend": "loki|elk|datadog|cloudwatch|newrelic",
    "shipper": "promtail|filebeat|vector|fluentbit|otel-collector",
    "schema": {"ts":"iso8601","level":"enum","service":"string","msg":"string","trace_id":"string","user_id":"string?"},
    "scrubber": "vector-redact",
    "retention": {"hot_days":30,"warm_days":90,"cold_years":1},
    "plan_path": "LOGGING_PLAN.md"
  }

SIDE EFFECTS:
  - Writes LOGGING_PLAN.md to project root
  - Writes logging/<backend>.yaml — the shipper + backend config
  - Adds a structured-logging helper (logger.{ts,py,go,rb}) to the service's src/
```

## CLI

```bash
# Plan the logging backend for this project
python3 scripts/log_aggregation.py plan \
  --census CENSUS.md \
  --hosting self-hosted \
  --budget-monthly-usd 200

# Verify logs are landing with trace_id populated
python3 scripts/log_aggregation.py verify \
  --backend loki \
  --query '{service="api"} |= "order created"' \
  --require-fields trace_id,user_id

# Scan recent logs for PII leaks (run weekly)
python3 scripts/log_aggregation.py scan-pii \
  --backend loki \
  --window-hours 168 \
  --patterns email,ssn,credit_card,api_key
```

## Decision Tree (autonomous)

```
Q: Hosting model?
  Self-hosted, cost-sensitive (budget < $500/mo)
    → BACKEND = Loki + Grafana + Promtail
        (index-only-labels, not full-text → 10x cheaper than ELK)
  Self-hosted, full-text search needed (compliance, forensics)
    → BACKEND = ELK (Elasticsearch + Logstash + Kibana)
        (expensive — only when you really need Lucene queries)
  Managed SaaS, budget OK (>$1000/mo)
    → BACKEND = Datadog (or New Relic)
        (turnkey, but pricing scales with log volume — sample aggressively)
  AWS-only shop, want zero ops
    → BACKEND = CloudWatch Logs
        (cheap, integrated, weak query language — fine for most teams)
  Multi-cloud, want vendor-neutral
    → BACKEND = Loki or ELK on one cloud, ship from all

Q: Log shipper?
  K8s           → Promtail (Loki) or Fluent Bit (any)
  Docker Compose → Vector or Fluent Bit sidecar
  Lambda        → CloudWatch by default; Lambda Insights for richer
  VMs / bare metal → Filebeat (ELK) or Vector (any)
  All platforms → OpenTelemetry Collector (unified, future-proof)

Q: Sampling?
  DEBUG logs → sample 1% in prod, 100% in dev
  INFO logs  → 100% always
  WARN/ERROR → 100% always (never sample errors)
  FATAL      → 100% + immediate alert

Q: PII detection on ingest?
  Scan for: email, phone, SSN, credit card, API keys, JWTs
  Action: redact at shipper (replace with [REDACTED:email])
  Never: redact at query time — by then it's already in the index

Q: Is trace_id populated on every log line?
  NO → FAIL — instrument the service with OpenTelemetry before shipping
  YES → ok

Q: Retention configured?
  Hot (queryable, fast)   → 30 days
  Warm (queryable, slow)  → 90 days
  Cold (S3 Glacier)       → 1 year (compliance-driven; extend as needed)
```

## Log Levels

| Level | When to use | Action |
|-------|-------------|--------|
| DEBUG | Verbose internals, only useful to a developer | Default OFF in prod; sample 1% when on |
| INFO  | Normal lifecycle events (request served, job done) | Default ON; 100% retained |
| WARN  | Something unexpected but recoverable (retry succeeded, fallback used) | ON; alert if rate >2x baseline |
| ERROR | Operation failed but service still up (request 500'd, job failed) | ON; page on-call if rate >threshold |
| FATAL | Service cannot continue (out of memory, lost DB connection) | ON; immediate page; expect restart |

Rule: **Never log at ERROR for things that aren't errors.** A user typing a wrong password is INFO ("auth failed: invalid credentials"), not ERROR. Logging normal control flow at ERROR trains on-calls to ignore pages.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Loki: `too many outstanding requests` | Querier overloaded by high-cardinality labels | Drop high-cardinality labels (user_id, request_id) — move them into log body, not labels |
| ELK: cluster red, unassigned shards | Disk full or node lost | Add disk; `POST /_cluster/reroute`; reduce retention if disk chronically tight |
| Datadog: log volume 5x budget | Service logging inside a hot loop | Sample DEBUG; move INFO to DEBUG for hot paths; use `dd.trace_id` correlation instead of re-logging |
| CloudWatch: `Rate exceeded` | PutLogEvents throttled | Batch logs (10K events / 1MB per call); use subscription fanout via Kinesis |
| Promtail can't parse JSON | Service switched from JSON to plain text | Fix the service — structured logging is a contract; add a CI check that fails on non-JSON stdout |
| Logs missing trace_id | Service not instrumented with OTel | Add OTel SDK + autoinstrumentation; trace_id flows automatically once instrumented |
| PII found in logs (scan-pii alert) | Logger called with raw user input | Add scrubber rule; fix call site; rotate any exposed credentials; file incident |
| Cold restore from Glacier takes 12h | Restoring for incident diagnosis | Use expedited retrieval (1–5 min, higher cost) for incident-driven restores |

## Self-Healing Loop

Every backend plan, verify run, and PII scan writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:
- Backend, shipper, log volume per service, query latency, PII hits.

`meta-auditor` reads this in Phase 13. Patterns it acts on:
- Same PII pattern (e.g., email in `msg` field) appearing across projects → `self-patch-generator` adds a scrubber rule to the default shipper config.
- Log volume per service growing >2x month-over-month without traffic growth → flag hot-loop logging; suggest sampling.
- Query latency exceeding 10s consistently on Loki → flag high-cardinality label abuse; suggest moving to log body.

## Quality Gates

- [ ] Every service emits structured JSON logs (CI check fails on non-JSON stdout in prod mode).
- [ ] Every log line has `ts` (ISO-8601 UTC), `level`, `service`, `msg`, `trace_id`.
- [ ] `trace_id` is populated from OpenTelemetry context, not a custom field.
- [ ] No secret ever appears in logs: scan-pii passes for the last 7 days.
- [ ] Retention lifecycle is configured (30 hot / 90 warm / 365 cold) and enforced by the backend.
- [ ] Dashboard exists for: log volume by service, error rate by service, top 10 error messages.
- [ ] Alert exists for: error rate >2x baseline over 5 min, FATAL count >0 over 1 min.
- [ ] `LOGGING_PLAN.md` exists in repo root with backend, schema, scrubbing, retention.

## Tools

- **Loki + Grafana + Promtail** — cost-effective self-hosted stack; index-only-labels.
- **Elasticsearch + Logstash + Kibana (ELK)** — full-text search, expensive, compliance-friendly.
- **Datadog / New Relic** — managed SaaS, turnkey, expensive at scale.
- **AWS CloudWatch Logs** — cheap, AWS-integrated, weak query language; pair with CloudWatch Logs Insights.
- **Vector** (Datadog, vendor-neutral) — high-performance shipper; replaces Logstash/Fluent Bit/Beats.
- **Fluent Bit** — lightweight shipper, common in K8s DaemonSets.
- **OpenTelemetry Collector** — vendor-neutral shipper; future-proof; handles logs, metrics, traces.
- **jq / logcli / lsql** — ad-hoc log querying; ship in the on-call runbook.
- **gitleaks / trufflehog** — scan logs for leaked secrets (defense in depth beyond scrubbing).

## Hard Rules

1. **Never log secrets.** Passwords, tokens, API keys, JWTs, session cookies, credit card numbers, SSNs — none of these belong in logs. Scrub at the shipper, not at query time.
2. **Always log in structured JSON.** Plain-text logs are unparseable, unindexable, and unalertable. A CI check fails the build if any service emits non-JSON stdout in prod mode.
3. **Always include `trace_id`.** Every log line must carry the trace ID from OpenTelemetry context. Without it, logs are islands; with it, they're a story.
4. **Never log at ERROR for normal control flow.** Wrong-password, not-found, validation-failed are INFO. ERROR means the service failed and a human should look. Crying wolf trains on-calls to mute alerts.
5. **Retention is policy, not afterthought.** Hot 30 days, warm 90 days, cold 1 year (extend for compliance). Configure the lifecycle on day one; do not discover you needed logs from 6 months ago only after they're gone.
6. **PII scrubbing happens at ingest.** Once PII is in the index, it's in the index — redacting at query time is theater. Scrub at the shipper before logs reach the backend.
7. **Logs are for diagnosis, not alerting.** Alert on metrics (counts, rates, latencies), investigate using logs. Log-based alerts are slow, expensive, and noisy — use sparingly.
8. **Every deploy emits a deploy marker.** The on-call must be able to see "deploy at 14:32" overlaid on the error-rate graph. Without deploy markers, correlation is guesswork.
