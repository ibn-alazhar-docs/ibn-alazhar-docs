---
name: error-monitoring
description: "Production error tracking — Sentry, Bugsnag, Rollbar, Datadog APM. Wires the SDK with release tracking (git SHA), uploads source maps for readable stack traces, configures issue grouping and alert routing by severity, and scrubs PII before events leave the process. Triggers in Phase 7 OBSERVABILITY when error tracking is missing or misconfigured, and in Phase 2 AUDIT when Dimension 4 finds PII in error reports or missing source maps."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: infra
---

# Error Monitoring

> Infra sub-skill for the "what just broke in production" loop. Picks the platform (Sentry/Bugsnag/Rollbar/Datadog APM), installs the official SDK, wires release tracking via git SHA so errors are pinned to a deploy, uploads source maps so minified stack traces are readable, configures issue grouping (so 1,000 identical errors become one issue) and alert routing (so a Critical hits PagerDuty, an Info hits Slack), and scrubs PII in `before_send` before any event leaves the process. Coordinates with `ci-cd` (source map upload on release) and `log-aggregation` (structured logs complement error events).

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | Dimension 9 (Observability) finds no error monitoring configured | "We don't know when errors happen in production" = flying blind |
| Phase 2 — AUDIT | Dimension 4 (Security) finds PII (email, phone, address) in error payloads | Error trackers are SaaS — PII leaking there is a compliance violation |
| Phase 2 — AUDIT | Dimension 9 finds minified stack traces (no source maps uploaded) | `at a.b.c (main.abc123.js:1:2345)` is unreadable; debugging is impossible |
| Phase 7 — OBSERVABILITY | Always — this sub-skill is the standard install for production error tracking | This is the executing sub-skill for Phase 7 |
| Phase 6 — EXECUTE | Migrating platforms (Bugsnag → Sentry, Sentry self-hosted → SaaS) | Full replace of SDK + config + source map upload pipeline |
| Phase 9 — ACCEPTANCE | Trigger a test error, verify it appears with correct release tag and readable stack | Error pipeline must be walked end-to-end before relying on it |
| Phase 11 — ROLLOUT | Verify DSN in env, source maps uploaded for current release, alerts routed | Misconfigured monitoring = silent prod failures |

**Do NOT use this sub-skill for:** log aggregation (use `log-aggregation` — Loki/ELK/Datadog Logs — for structured logs), uptime monitoring (use Pingdom/UptimeRobot — different concern), or APM/tracing (use OpenTelemetry / Datadog APM / Jaeger — though Datadog APM overlaps and we cover it here).

## What It Does

1. Picks the platform via the Decision Tree.
2. Installs the official SDK: `@sentry/node` + `@sentry/react` / `sentry-sdk` (Python) / `@bugsnag/js` / `rollbar` / `dd-trace`.
3. Wires environment: `SENTRY_DSN` (or `BUGSNAG_API_KEY`, `ROLLBAR_ACCESS_TOKEN`, `DATADOG_API_KEY`), `SENTRY_AUTH_TOKEN` (for source map upload), `SENTRY_ORG`, `SENTRY_PROJECT`.
4. Configures release tracking:
   - `release` = git SHA (set by CI from `$GITHUB_SHA` or `$CI_COMMIT_SHA`).
   - Every error event is tagged with the release that produced it.
   - Sentry dashboard filters by release → "what's new in v1.2.3" is one click.
5. Configures environment tags: `development`, `staging`, `production`. Errors in dev are filtered or downgraded.
6. Uploads source maps (so minified JS is readable):
   - Build step emits `.map` files alongside `.js`.
   - CI uploads `.map` files to Sentry via `sentry-cli sourcemaps upload` after deploy.
   - `Sentry.init({ release: ..., sourcemaps: { assets: [...] } })` or upload via CLI.
   - **Critical**: strip `sourceMappingURL` from production `.js` if you don't want to expose maps publicly; or use uploaded maps (private, server-side only).
7. Configures issue grouping:
   - Default grouping works for most stacks (same exception type + frame = same issue).
   - Custom grouping for app-specific patterns (e.g. group all "user not found" as one issue regardless of stack).
8. Configures alert routing:
   - **Critical** (new issue in production, error rate spike) → PagerDuty / Opsgenie.
   - **Warning** (regression — issue that was resolved reappears) → Slack #eng-alerts.
   - **Info** (new issue in staging) → Slack #staging.
   - Quiet hours: don't page at 3am for a non-Critical.
9. Implements PII scrubbing in `before_send`:
   - Strip email, phone, SSN, credit card, JWT tokens, passwords from event context.
   - Strip request body if it contains form fields.
   - Strip cookies, authorization headers.
   - Use Sentry's built-in `data-scrubbing` rules + custom `before_send` for app-specific fields.
10. Filters noise: 404s on static assets, expected errors (e.g. user-aborted requests), health-check failures.
11. Emits an `error_reporter` for other modules: `capture_exception(err, context)`, `capture_message(msg, level)`, `add_breadcrumb(category, message, data)`.

## Integration Contract

```
INPUT:
  - platform_hint: sentry|bugsnag|rollbar|datadog (optional — decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - environment: development|staging|production (required)
  - release_version: string (required — git SHA from CI)
  - frontend: bool (default true — needs source maps)
  - backend: bool (default true)
  - pagerduty_integration_key: string (optional — for Critical alerts)
  - slack_webhook: string (optional — for Warning alerts)
  - sample_rate_performance: float (default 0.1 — 10% of requests traced)
  - pii_scrub_fields: list of field names (default: email, phone, ssn, password, token, authorization)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "platform": "sentry",
    "files_created": [
      "src/observability/sentry.{ts,py}",
      "src/observability/before_send.{ts,py}",
      "src/observability/release.{ts,py}"
    ],
    "env_required": [
      "SENTRY_DSN",
      "SENTRY_AUTH_TOKEN",
      "SENTRY_ORG",
      "SENTRY_PROJECT"
    ],
    "ci_steps_added": [
      "Upload source maps after deploy: sentry-cli sourcemaps upload --release $SHA"
    ],
    "alert_routing": {
      "critical": "PagerDuty",
      "warning": "Slack #eng-alerts",
      "info": "Slack #staging"
    },
    "pii_scrub_fields": ["email", "phone", "ssn", "password", "token", "authorization"],
    "release_tag": "git_sha",
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes observability module under src/observability/
  - Adds sentry-cli to CI pipeline (source map upload step)
  - Adds required env vars to .env.example
  - Adds Sentry init at app entry point (server.ts, main.py, etc.)
  - Registers global error handlers (Express error middleware, FastAPI exception handler)
```

## CLI

```bash
# Autonomous: pick platform, scaffold SDK init + before_send + release tracking
python3 scripts/error_monitoring_agent.py setup \
  --framework fastapi \
  --platform sentry \
  --environment production \
  --release-version $GITHUB_SHA \
  --frontend \
  --backend \
  --pagerduty-integration-key $PD_KEY \
  --slack-webhook $SLACK_URL

# Upload source maps after deploy (CI step)
sentry-cli sourcemaps upload \
  --org my-org \
  --project my-project \
  --release $GITHUB_SHA \
  --url-prefix "~/static/js/" \
  dist/static/js/

# Create a release in Sentry (CI step)
sentry-cli releases new $GITHUB_SHA
sentry-cli releases set-commits $GITHUB_SHA --auto
sentry-cli releases finalize $GITHUB_SHA

# Trigger a test error to verify the pipeline
python3 scripts/error_monitoring_agent.py test-error \
  --platform sentry \
  --message "Test error from rollout verification"

# Audit: grep for PII in error context, missing source maps, missing release tag
python3 scripts/error_monitoring_agent.py audit --path src/

# Verify PII scrubbing (send fake PII, confirm it's redacted in dashboard)
python3 scripts/error_monitoring_agent.py verify-scrubbing \
  --test-pii '{"email":"test@example.com","ssn":"123-45-6789"}'
```

## Decision Tree (autonomous)

```
Q1: Open-source or SaaS?
  Open-source / on-prem (regulated industry, air-gapped, data residency)
    → Sentry self-hosted (free, full features, but you operate it)
      Needs: Postgres, Redis, ClickHouse, Kafka — non-trivial ops
      Recommended only if team has dedicated SRE
  SaaS (default for most teams)
    → continue
  All-in-one (APM + logs + errors + traces in one tool)
    → Datadog APM (best DX if already using Datadog for infra)
      Trade-off: vendor lock-in, expensive at scale

Q2: Which SaaS platform?
  Most popular, best ecosystem, generous free tier
    → Sentry (5k errors/month free, then paid)
      Best for: web + mobile + backend, all languages
  Simpler, slightly cheaper
    → Bugsnag (good free tier, simpler UI)
      Best for: smaller teams who want less config
  Strong release tracking, good for staged rollouts
    → Rollbar (good for native mobile, strong deploy tracking)
      Best for: mobile-heavy apps
  Already paying for Datadog for metrics/logs
    → Datadog APM (consolidate vendors)
      Best for: consolidation, single dashboard for everything

Q3: Source maps strategy?
  Frontend with minified JS (Webpack, Vite, esbuild)
    → Upload maps to Sentry on every release
      Use `sentry-cli sourcemaps upload` in CI after deploy
      Maps are private (server-side only) — never expose via sourceMappingURL in prod
      Strip sourceMappingURL comment from prod .js (or use hidden maps)
  Backend (Python, Node not minified, etc.)
    → No source maps needed (Python: include source files; Node: ship unminified in prod)
  Frontend without minification (dev only)
    → Skip — errors are already readable

Q4: Performance monitoring?
  Yes (sample traces to find slow endpoints)
    → Enable traces_sample_rate (default 0.1 = 10% of transactions)
      Higher rate = more data = higher cost
      Tune: 1.0 in dev, 0.1 in prod
  No (errors only)
    → Disable traces_sample_rate (or set to 0)
      Cheaper, but you lose slow-endpoint detection

Q5: Alert routing?
  Critical (new prod issue, error rate spike)
    → PagerDuty / Opsgenie (wake someone up)
  Warning (regression — resolved issue reappeared)
    → Slack #eng-alerts (async, review in standup)
  Info (new staging issue)
    → Slack #staging (review when convenient)
  Quiet hours
    → Configure per-platform (Sentry: per-project quiet hours)
      Don't page at 3am for non-Critical

Q6: PII scrubbing?
  Always — error trackers are SaaS and PII there is a compliance violation
    → Built-in scrubbing: enable Sentry's "Data Scrubbing" with default rules
    → Custom before_send: strip app-specific PII (user_id, account_number, etc.)
    → Test: send fake PII, verify it's redacted in the dashboard
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Stack trace shows `at a.b.c (main.abc123.js:1:2345)` | Source maps not uploaded, or uploaded with wrong `--url-prefix` | Re-upload maps with correct URL prefix matching the served path; verify in Sentry "Source Maps" tab |
| Sentry events show no release tag | `release` not set in `Sentry.init`, or CI didn't run `sentry-cli releases new` | Set `release: process.env.GIT_SHA` in init; ensure CI sets `SENTRY_AUTH_TOKEN` env var |
| PII visible in Sentry dashboard | `before_send` not scrubbing, or scrub rules missing field | Add field to scrub rules; test with `verify-scrubbing` command; treat as compliance incident |
| 10k events/min flooding Sentry | New issue with high blast radius, or noisy error not filtered | Add filter in `before_send` for known noise; set rate limits in Sentry; investigate root cause immediately |
| Alert not firing | Threshold set too high, or routing rule missing | Check Sentry "Alerts" settings; verify PagerDuty integration test passes; verify Slack webhook URL |
| PagerDuty alert at 3am for a 404 | Noise filter missing for static-asset 404s | Add `before_send` filter: return null for 404s on `*.js`, `*.css`, `*.png` |
| Performance traces slowing the app | `traces_sample_rate` too high (e.g. 1.0 in prod) | Reduce to 0.1 (10%); verify overhead < 5% CPU |
| Sentry SDK initialization blocks startup | `Sentry.init` doing heavy work synchronously | Use `Sentry.init` async / lazy; defer non-critical config |
| Events from dev environment polluting prod dashboard | `environment` not tagged, or dev using prod DSN | Set `environment: process.env.NODE_ENV`; use separate DSN per env |
| Source maps exposed publicly | `sourceMappingURL` comment left in prod `.js` | Strip comment in build step; use "hidden" source maps (uploaded, not referenced) |

## Self-Healing Loop

Every monitoring incident (PII leak, missing source maps, alert didn't fire, regression missed) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: prod_error_pipeline
  failure_class: pii_leak
  trigger: Sentry event contained user email in request body context
  recovery: before_send scrubbing rules missed `req.body.email` — added field to scrub list, ran verify-scrubbing
  rule_added: error-monitoring sub-skill now includes default scrub list with `req.body.*` recursive redaction
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the recursive redaction.

For PII leaks specifically: if any Sentry event is found to contain PII (audited via `verify-scrubbing`), Phase 11 halts — PII in a SaaS error tracker is a compliance violation (GDPR, CCPA) and a release blocker.

## Quality Gates (enforced before declaring "error monitoring ready")

- [ ] SDK initialized with `release` = git SHA from CI
- [ ] `environment` tag set (development/staging/production) per env
- [ ] Source maps uploaded for current release (frontend)
- [ ] `before_send` scrubs PII (email, phone, SSN, password, token, authorization, request body)
- [ ] PII scrubbing verified with `verify-scrubbing` command (no PII in test event)
- [ ] Alert routing configured: Critical → PagerDuty, Warning → Slack, Info → Slack
- [ ] Quiet hours configured (no non-Critical pages at 3am)
- [ ] Noise filters: 404s on static assets, expected errors, health-check failures
- [ ] Global error handlers registered (Express error middleware, FastAPI exception handler)
- [ ] Performance monitoring enabled with `traces_sample_rate` (0.1 in prod, 1.0 in dev)
- [ ] DSN / API key from env var, never committed
- [ ] Separate DSN per environment (dev DSN not used in prod)
- [ ] Tests cover: error captured with release tag, PII scrubbed, noise filtered, source map uploaded, alert fires on Critical

If any gate fails: status = `error`, do not proceed to Phase 9. Missing error monitoring = flying blind in production; PII in events = compliance violation.

## Tools

- **Sentry** (`@sentry/node`, `@sentry/react`, `sentry-sdk`) — industry default. Generous free tier, best ecosystem.
- **Sentry self-hosted** (Docker compose, single-tenant) — for regulated industries. Non-trivial ops (Postgres + Redis + ClickHouse + Kafka).
- **Bugsnag** (`@bugsnag/js`, `bugsnag`) — simpler, slightly cheaper. Good for smaller teams.
- **Rollbar** (`rollbar` npm / `rollbar` pip) — strong release tracking, good for mobile.
- **Datadog APM** (`dd-trace`) — all-in-one (errors + traces + logs + metrics). Best if already using Datadog.
- **sentry-cli** — CLI for source map upload, release management. Critical for CI integration.
- **@sentry/webpack-plugin** / **@sentry/vite-plugin** — build-time source map upload. Alternative to sentry-cli.
- **PagerDuty** / **Opsgenie** — alert routing for Critical.
- **Slack incoming webhooks** — alert routing for Warning/Info.

## Permissions

- Filesystem: write to `src/observability/`, `.env.example`, CI config (`.github/workflows/`, `.gitlab-ci.yml`)
- Network: outbound HTTPS to platform (`sentry.io`, `api.bugsnag.com`, `api.rollbar.com`, `api.datadoghq.com`)
- Network: outbound to PagerDuty (`events.pagerduty.com`) and Slack (`hooks.slack.com`)
- Secrets: read DSN / auth token from env only; never log; never commit
- Processes: may invoke `sentry-cli` in CI for source map upload; may invoke `npm install` / `pip install` for official SDKs only
- CI: adds steps for `sentry-cli releases new`, `sentry-cli sourcemaps upload`, `sentry-cli releases finalize`

## Hard Rules

1. **Never send PII to the error tracker.** Email, phone, SSN, credit card, JWT tokens, passwords — scrub in `before_send` before any event leaves the process. Error trackers are SaaS; PII there is a GDPR/CCPA violation. Test scrubbing with `verify-scrubbing` before every release.
2. **Always upload source maps on every release.** Minified stack traces are unreadable. `sentry-cli sourcemaps upload` in CI after deploy, with correct `--url-prefix` matching the served path. Without maps, debugging prod errors is impossible.
3. **Always tag events with the release (git SHA).** `release: process.env.GIT_SHA` in `Sentry.init`. Without release tags, you can't answer "what's new in v1.2.3" — the most common question after a deploy.
4. **Always alert on regressions.** A resolved issue reappearing is a Critical — it means a fix was reverted or didn't fully land. Configure regression alerts to PagerDuty, not just Slack.
5. **Always configure alert routing by severity.** Critical → PagerDuty (wake someone); Warning → Slack (review in standup); Info → staging channel. Don't page at 3am for a 404 on a static asset.
6. **Never use the production DSN in development.** Separate DSN per environment. Dev errors in the prod dashboard obscure real issues; prod errors in dev dashboard mean you miss them.
7. **Always filter known noise.** Static-asset 404s, health-check failures, expected errors (user-aborted requests) — filter in `before_send` (return null). Without filtering, you pay for noise and miss real signal.
8. **Always register global error handlers.** Express error middleware, FastAPI exception handler, browser `window.onerror`. Uncaught errors should reach the tracker automatically — not just errors you remember to wrap in `try/catch`.
9. **Never set `traces_sample_rate` to 1.0 in production.** Performance tracing has overhead (5-15% CPU). 0.1 (10%) is the production default; 1.0 is for dev/staging only. Higher rate = more data = higher cost = slower app.
10. **Always verify the error pipeline before relying on it.** Trigger a test error (`test-error` command) on every release. If it doesn't appear in the dashboard with the correct release tag and readable stack, the pipeline is broken — fix before declaring "production-ready".
