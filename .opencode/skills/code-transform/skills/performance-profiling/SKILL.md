---
name: performance-profiling
description: "Profile before optimizing — py-spy / cProfile (Python), clinic.js / 0x (Node), Chrome DevTools / Lighthouse (frontend), APM (Datadog / New Relic) for prod. Generates flamegraphs, identifies top-5 hotspots, measures before/after with p50/p95/p99 latency. Triggers in Phase 2 AUDIT when Dimension 5 finds slow endpoints, N+1 queries, or high memory, and in Phase 6 EXECUTE when the user says 'the app is slow' or before/after an optimization."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: quality
---

# Performance Profiling

> Quality sub-skill for the measure→optimize→measure loop. The hard rule: **profile before optimizing**. Picks the right tool by stack (py-spy for Python — sampling, no overhead; clinic.js for Node; Chrome DevTools + Lighthouse for frontend; APM for prod), generates flamegraphs to find the top-5 hotspots, runs a baseline measurement (p50/p95/p99 latency), makes ONE change at a time, and re-measures to verify. Never ship profiling in production (sampling profilers have ~5% overhead; instrumented profilers can be 10x+). Coordinates with `db-design` (EXPLAIN ANALYZE on slow queries), `performance-audit` (Lighthouse CI), and `error-monitoring` (APM overlap).

## When to Use

| Phase                | Trigger                                                                                                                        | Why                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Phase 2 — AUDIT      | Dimension 5 (Performance) finds: slow endpoints (>500ms p95), N+1 queries, high memory (>512MB RSS), high CPU (>70% sustained) | Measure the problem before fixing it                                      |
| Phase 6 — EXECUTE    | User says "the app is slow", "page takes too long", "API is laggy"                                                             | Don't guess — profile to find the actual bottleneck                       |
| Phase 6 — EXECUTE    | Before/after an optimization                                                                                                   | Verify the change actually improved things (and didn't regress elsewhere) |
| Phase 6 — EXECUTE    | Adding a new feature that's performance-sensitive (real-time, search, large data)                                              | Establish a baseline before the feature, profile after                    |
| Phase 9 — ACCEPTANCE | Verify p95 latency meets the SLO after all changes                                                                             | Performance regression = release blocker if it crosses the SLO            |
| Phase 11 — ROLLOUT   | APM dashboards confirm prod performance matches test env                                                                       | Prod is the only true test; APM catches regressions test env can't        |

**Do NOT use this sub-skill for:** load testing (use `k6` / `locust` / `Artillery` — different concern: simulate traffic, not profile code), capacity planning (use load testing + APM trends), or frontend bundle size analysis (use `webpack-bundle-analyzer` / `source-map-explorer` — that's a build-time concern, not runtime profiling).

## What It Does

1. Picks the profiling tool via the Decision Tree.
2. Establishes a baseline: measure p50/p95/p99 latency, throughput, error rate, CPU%, memory, GC pauses BEFORE any change. Without a baseline, you can't prove the optimization worked.
3. Runs the profiler against a representative workload:
   - **Python backend**: `py-spy record -- python app.py` (sampling, no overhead, flamegraph output). `cProfile` for deterministic function-level profiling (some overhead).
   - **Node backend**: `clinic.js flame -- node app.js` (sampling flamegraph). `0x` for production-friendly flamegraphs.
   - **Frontend**: Chrome DevTools Performance tab (record interaction). Lighthouse for full audit (LCP, FID, CLS, TTFB).
   - **Production**: APM (Datadog / New Relic / NewRelic / Sentry Performance) — sampled traces, no manual profiling needed.
4. Generates a flamegraph (SVG) showing where CPU time is spent:
   - X-axis: time (or samples); wider = more time.
   - Y-axis: call stack depth; bottom = entry point, top = current.
   - Each function is a rectangle; width = % of CPU.
5. Identifies the **top-5 hotspots** — the functions consuming the most CPU. Per the 80/20 rule, fixing these typically resolves 80% of the problem.
6. For each hotspot, diagnoses the cause:
   - **N+1 query**: flamegraph shows DB driver called many times in a loop → use `EXPLAIN ANALYZE`, add a join or batch fetch.
   - **Hot loop**: a tight Python loop doing per-element work → vectorize with NumPy, or rewrite in C/Rust via pyo3.
   - **GC pressure**: many small allocations → pool objects, use generators, switch to slots.
   - **JSON parse**: large JSON parsed repeatedly → cache the parsed form, use orjson/ujson.
   - **Lock contention**: many threads waiting on a lock → reduce critical section, use lock-free structures.
7. Makes ONE optimization at a time. Re-measures after each. Never batch 5 changes — you can't tell which one helped (or which one regressed).
8. Verifies the improvement: p95 latency reduced by ≥ X%, throughput increased, no new regressions in other endpoints.
9. Documents the before/after in `PERFORMANCE_REPORT.md`: profile graph, hotspot list, change made, before/after metrics.
10. Removes all profiling instrumentation before deploy (py-spy has no instrumentation but cProfile's `enable()` must be removed; clinic.js's `--profile` flag must be unset).

## Integration Contract

```
INPUT:
  - target: backend|frontend|database|api_endpoint (required)
  - stack: python|node|go|rust|browser (required for backend/frontend)
  - workload: representative test scenario (required — e.g. "100 RPS of /api/users for 60s")
  - baseline_metrics: optional pre-existing baseline (if absent, measure first)
  - slo: { p95_ms: 200, p99_ms: 500, error_rate: 0.01 } (required — what we're targeting)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "profiler": "py-spy",
    "flamegraph_path": "/tmp/ct-<uuid>/flamegraph.svg",
    "baseline": {
      "p50_ms": 120, "p95_ms": 480, "p99_ms": 1200,
      "throughput_rps": 100, "error_rate": 0.005,
      "cpu_pct": 65, "memory_mb": 380
    },
    "hotspots": [
      {"function": "serialize_user", "file": "src/users/serializers.py", "line": 42, "self_pct": 28, "cumulative_pct": 35},
      {"function": "fetch_permissions", "file": "src/auth/permissions.py", "line": 18, "self_pct": 18, "cumulative_pct": 22, "suspected": "N+1 query"},
      ...
    ],
    "top_5_hotspots_total_pct": 78,
    "recommendations": [
      {"hotspot": "fetch_permissions", "fix": "Replace loop with batched SELECT; add select_related", "expected_impact_pct": 20}
    ],
    "after_optimization": null,  // filled in after the change
    "report_path": "PERFORMANCE_REPORT.md"
  }

SIDE EFFECTS:
  - Writes flamegraph SVG to /tmp/ct-<uuid>/
  - Writes PERFORMANCE_REPORT.md to project root
  - Does NOT modify source code (optimization is done by other sub-skills)
  - Does NOT ship profiling to production
```

## CLI

```bash
# Establish baseline: load test + measure
python3 scripts/perf_agent.py baseline \
  --target https://staging.example.com \
  --workload "100 RPS of GET /api/users for 60s" \
  --slo '{"p95_ms": 200, "p99_ms": 500, "error_rate": 0.01}'

# Profile Python backend (sampling, no overhead)
py-spy record --output /tmp/flamegraph.svg --duration 60 -- python -m uvicorn app:main --port 8000

# Profile Python backend (deterministic, function-level)
python3 scripts/perf_agent.py profile-python \
  --entry "uvicorn app:main" \
  --profiler cprofile \
  --duration 60 \
  --output /tmp/profile.prof
snakeviz /tmp/profile.prof  # interactive viewer

# Profile Node backend
clinic.js flame --on-port 'autocannon http://localhost:3000/api/users -c 100 -d 60' -- node dist/server.js

# Profile frontend (Chrome DevTools)
python3 scripts/perf_agent.py profile-frontend \
  --url https://staging.example.com/dashboard \
  --interaction "click load-users-button" \
  --trace-output /tmp/trace.json

# Run Lighthouse audit
lighthouse https://staging.example.com --output html --output-path /tmp/lighthouse.html --preset=desktop

# Profile slow query (DB)
psql $DATABASE_URL -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'test@example.com';"

# Compare before/after
python3 scripts/perf_agent.py compare \
  --before /tmp/baseline.json \
  --after /tmp/after-optimization.json \
  --output PERFORMANCE_REPORT.md

# Audit: grep for cProfile left in prod, missing baseline, optimization without measurement
python3 scripts/perf_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: What are we profiling?
  Python backend → py-spy (sampling, ~5% overhead, flamegraph; `py-spy record -- python app.py`); or cProfile (deterministic, function-level, view with `snakeviz`)
  Node backend → clinic.js (flamegraph/doctor/bubbleprof; `clinic.js flame --on-port 'autocannon ...' -- node server.js`); or 0x (production-friendly); or v8-profiler (deep internals)
  Go backend → pprof (built-in; `go tool pprof http://localhost:6060/debug/pprof/profile`; flamegraph via `go tool pprof -flame`)
  Rust backend → cargo flamegraph (uses perf/dtrace; `cargo flamegraph --bin app`)
  Frontend (browser) → Chrome DevTools Performance tab (runtime JS); Lighthouse (full audit: LCP/FID/CLS/TTFB); webpack-bundle-analyzer (build-time bundle size)
  Database → EXPLAIN ANALYZE with BUFFERS (Postgres); `.explain("executionStats")` (MongoDB)
  Production → APM (Datadog / New Relic / Sentry Performance / Honeycomb); sampled traces, always-on, no manual profiling

Q2: Sampling or deterministic?
  Sampling (py-spy, clinic.js, perf) → Default. ~5% overhead. Works in prod briefly. Good for hotspots.
  Deterministic (cProfile, v8-profiler) → When you need exact function-level data. 10-100% overhead. Dev/staging only.
  Instrumented (custom timing around functions) → Only for specific suspected functions; avoid globally.

Q3: What metric matters?
  Latency → p50, p95, p99. p99 = "1 in 100 requests" — the worst users' experience. Never optimize p50 at p99's expense.
  Throughput → RPS/QPS under load (k6 / locust / autocannon).
  CPU → % utilization. High CPU + high latency = compute-bound.
  Memory → RSS/heap. Growing RSS over time = memory leak.
  GC pauses → Time spent in GC. Frequent long pauses = allocation pressure.

Q4: Hotspot worth optimizing?
  Self-time > 10% of total → Yes. Top-5 hotspots typically = 80% of CPU.
  Self-time 5-10% → Maybe; only if fix is cheap and safe.
  Self-time < 5% → No. 80/20 rule says you'll spend 80% of effort for < 5% gain.
  Allocation-heavy but fast CPU → Look at GC pressure, not CPU. May need object pooling or generator rewrite.

Q5: Production profiling?
  Always-on → APM with sampled traces (Datadog/New Relic/Sentry Performance); ~5% overhead, sampled 1-10% of requests, safe for prod.
  One-off (dev/staging) → py-spy / clinic.js / cProfile / pprof; run briefly against representative load. NEVER ship cProfile or v8-profiler to prod (10-100% overhead).
```

## Failure Modes & Recovery

| Symptom                                      | Cause                                                  | Recovery                                                                                    |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Flamegraph shows mostly idle / IO wait       | Profiling idle process, or workload not representative | Increase load (k6/autocannon); ensure profiling runs during peak load                       |
| `py-spy: Permission denied`                  | Not running as root, can't ptrace                      | Run as root (`sudo py-spy ...`); or use `--nonblocking` (may miss some samples)             |
| cProfile shows 100% in `builtin.method`      | Python overhead — cProfile itself is slow              | Use py-spy (sampling) for accurate picture; cProfile over-counts builtins                   |
| Profile in prod causes latency spike         | cProfile or v8-profiler left enabled                   | Remove instrumentation immediately; switch to sampled APM (5% overhead)                     |
| Before/after shows no improvement            | Wrong hotspot fixed, or measurement noise              | Re-profile to confirm hotspot; ensure workload is identical; run 3x to reduce noise         |
| p95 improved but p99 regressed               | Optimization helped the common case, hurt the tail     | Always measure p50 AND p95 AND p99; never optimize only the median                          |
| Clinic.js crashes on Node startup            | Incompatible Node version                              | Use Node 18+ LTS; or use `0x` as alternative                                                |
| Lighthouse score wildly different run-to-run | Browser variance, network noise                        | Run Lighthouse 3x and report median; use `--preset=desktop` for desktop emulation           |
| EXPLAIN ANALYZE shows seq scan               | Missing index, or planner chose wrong                  | Add index (check `pg_stat_statements` for hot queries); ANALYZE table to update stats       |
| Profile shows hot lock contention            | Many threads waiting on same lock                      | Reduce critical section; use `asyncio.Lock` (Python) / lock-free structures; shard the lock |

## Self-Healing Loop

Every performance incident (regression, missed SLO, optimization that didn't help) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: api_endpoint_optimization
  failure_class: optimization_without_baseline
  trigger: PR claimed "30% faster" but no before/after metrics attached
  recovery: reverted PR; required baseline measurement before retry; added CI check for performance claims
  rule_added: performance-profiling sub-skill now requires baseline.json attached to any "performance improvement" PR
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that blocks performance-claim PRs without baseline+after metrics.

For SLO regressions specifically: if p95 latency in prod exceeds the SLO after a deploy, Phase 11 halts — performance regression crossing the SLO is a release blocker.

## Quality Gates (enforced before declaring "optimization done")

- [ ] Baseline measured BEFORE optimization (p50/p95/p99 latency, throughput, CPU%, memory)
- [ ] Profiler run against representative workload (not idle, not artificial)
- [ ] Flamegraph generated and top-5 hotspots identified (with self-time %)
- [ ] Each hotspot has a suspected cause (N+1, hot loop, GC pressure, lock contention, etc.)
- [ ] ONE optimization made at a time (not batched)
- [ ] After-metrics measured with identical workload as baseline
- [ ] p95 latency improved by ≥ target (typically ≥ 20% to be worth the change)
- [ ] No regression in p50, p99, throughput, error rate, memory
- [ ] No profiling instrumentation left in source (grep for `cProfile.enable`, `--prof`, `clinic.js`)
- [ ] APM confirms prod performance matches test env (within 20%)
- [ ] PERFORMANCE_REPORT.md written with before/after metrics, profile graph, change description
- [ ] Tests cover: optimization doesn't break correctness; SLO met under load

If any gate fails: status = `error`, do not proceed to Phase 9. Optimization without measurement = guesswork; regression = release blocker.

## Tools

- **py-spy** (Python) — sampling profiler, no overhead, flamegraph output. Default for Python.
- **cProfile** (Python built-in) — deterministic, function-level. Pair with `snakeviz` or `gprof2dot`.
- **memory_profiler** (Python) — line-by-line memory for leak hunting.
- **clinic.js** (Node) — flamegraph, doctor, bubbleprof. Default for Node.
- **0x** (Node) — production-friendly flamegraphs (lighter than clinic.js).
- **v8-profiler** (Node) — low-level v8 internals.
- **pprof** (Go built-in) — `go tool pprof`. Pair with `net/http/pprof` for live profiling.
- **cargo flamegraph** (Rust) — uses perf (Linux) or dtrace (macOS).
- **Chrome DevTools Performance tab** — frontend runtime profiling.
- **Lighthouse** — frontend audit (LCP, FID, CLS, TTFB). Pair with `--preset=desktop`.
- **webpack-bundle-analyzer** / **source-map-explorer** — bundle size analysis (build-time).
- **k6** / **locust** / **autocannon** — load testing for baseline measurement.
- **Datadog APM** / **New Relic** / **Sentry Performance** / **Honeycomb** — production APM with sampled traces.
- **pg_stat_statements** (Postgres) — query performance stats. **EXPLAIN ANALYZE** with BUFFERS — query plan inspection.

## Permissions

- Filesystem: write to `/tmp/ct-*/` for profile output; `PERFORMANCE_REPORT.md` to project root
- Network: outbound to target (local or staging URL); outbound to APM ingest endpoint (Datadog, etc.)
- Processes: may spawn `py-spy`, `clinic.js`, `lighthouse`, `autocannon`, `k6`, `locust`; must reap them on completion
- Processes: may attach to running process via ptrace (py-spy); requires `CAP_SYS_PTRACE` or root
- DB: may run `EXPLAIN ANALYZE` (read-only); may enable `pg_stat_statements` (superuser required)
- Production: NEVER enable cProfile / v8-profiler / clinic.js in prod; APM only

## Hard Rules

1. **Never optimize without profiling first.** "The app is slow" has 100 possible causes. Profile to find the actual hotspot. Guessing wastes time and often makes things worse (premature optimization).
2. **Never optimize hotspots under 5% impact.** The 80/20 rule: top-5 hotspots are 80% of CPU. Below 5%, the gain isn't worth the risk of regression. Move on.
3. **Always measure before AND after.** Without a baseline, you can't prove the optimization worked. Without an after-measurement, you can't detect regressions. Use identical workload for both.
4. **Never ship profiling instrumentation in production.** cProfile and v8-profiler have 10-100% overhead. Sampling profilers (py-spy, clinic.js) have ~5% but should still be off in prod. Production uses APM with sampled traces.
5. **Always measure p50 AND p95 AND p99.** Optimizing only the median (p50) hides tail regressions. The worst users (p99) are the ones who notice slowness most. Report all three.
6. **Always make ONE optimization at a time.** Batching 5 changes means you can't tell which one helped (or which one regressed). One change → measure → repeat.
7. **Always use a representative workload.** Profiling an idle process produces a meaningless flamegraph. Use realistic load (k6/autocannon) at production-like RPS. Document the workload so others can reproduce.
8. **Always check for N+1 queries first.** N+1 is the most common cause of slow endpoints. Flamegraph shows DB driver called many times in a loop. Fix: `select_related` / `JOIN` / batch fetch. Often a 50%+ improvement with one line.
9. **Always pair EXPLAIN ANALYZE with BUFFERS (Postgres).** CPU time alone misses I/O. `EXPLAIN (ANALYZE, BUFFERS)` shows shared hits vs reads — tells you if the index is working or if you're hitting disk.
10. **Always document the before/after in PERFORMANCE_REPORT.md.** Profile graph, hotspot list, change made, metrics. Without documentation, the next developer will re-do your work. Without metrics, the optimization is unverified.
