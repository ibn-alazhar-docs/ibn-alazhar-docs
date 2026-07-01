# Observability Mastery — Build Systems You Can Debug

> **Based on**: OpenTelemetry (CNCF Graduated 2026), Google SRE Book, AWS Builder's Library, Grafana.

## The Three Signals + One

| Signal   | Answers                  | Tools                        |
| -------- | ------------------------ | ---------------------------- |
| Logs     | What happened?           | structlog, pino, zerolog     |
| Metrics  | How is it trending?      | Prometheus, Grafana          |
| Traces   | Where did time go?       | OpenTelemetry, Tempo, Jaeger |
| Profiles | Where did CPU/memory go? | eBPF, Pyroscope (Alpha)      |

Tie together via trace_id/span_id (logs↔traces) and exemplars (metrics→traces).

## Structured Logging

1. Emit JSON, not free text
2. Canonical fields: timestamp, level, service, event, trace_id, span_id, user_id, request_id, duration_ms
3. Propagate trace_id automatically
4. "If you wouldn't page someone for it, it's not ERROR"
5. Sample: 100% ERROR/WARN; 1-10% INFO/DEBUG
6. Redact: log identifiers not values

## Metrics Frameworks

- RED (services): Rate, Errors, Duration
- USE (resources): Utilization, Saturation, Errors
- Four Golden Signals: Latency, Traffic, Errors, Saturation
  Always use percentiles (p50/p95/p99), never averages.

## Distributed Tracing (OpenTelemetry)

- CNCF Graduated May 2026. Adopt OTel + Collector + OTLP.
- W3C Trace Context: traceparent + tracestate headers
- Sampling: head (simple, can't guarantee errors) vs tail (always sample errors, expensive) vs hybrid
- OTel Collector: apps → OTLP → Collector → (batch, sample, redact) → Backends

## Health Checks

| Probe     | Purpose           | On Failure                     |
| --------- | ----------------- | ------------------------------ |
| Liveness  | Process alive     | Restart                        |
| Readiness | Can serve traffic | Remove from endpoints          |
| Startup   | Slow containers   | Disable liveness until success |

Critical: Don't put dependency checks in liveness → cascading failure. Put in readiness.

## SLI / SLO / SLA

- SLI: measurement (good/total)
- SLO: internal target (e.g., 99.9% over 30 days)
- SLA: contractual promise
- Error Budget: 1 - SLO (e.g., 43.2 min/month)
  Set SLO stricter than SLA. When budget exhausted → freeze feature deploys.

## Alerting (Multi-Window Multi-Burn-Rate)

| Severity | Long Window | Short Window | Burn Rate |
| -------- | ----------- | ------------ | --------- |
| Page     | 1 hour      | 5 min        | 14.4×     |
| Page     | 6 hours     | 30 min       | 6×        |
| Ticket   | 3 days      | 6 hours      | 1×        |

Alert on symptoms, not causes. Delete unactionable alerts. Group/correlate during outages.

## On-Call

Cap incident load, standardize handoffs, runbook for every alert, shadow rotations, blameless post-incident reviews.

## Anti-Patterns

1. Logging everything at DEBUG
2. PII in plain text
3. Inconsistent field names
4. Using log messages as metrics
5. Mystery pages (no dashboard/runbook)
6. Cascading alert storms
7. Average latency (hides tail)
8. Dependency checks in liveness
9. Unowned dashboards
10. Alert without runbook
11. SLO never measured
