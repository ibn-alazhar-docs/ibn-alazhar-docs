---
name: webhook-setup
description: "Implement inbound (receiving) and outbound (sending) webhooks with HMAC-SHA256 signature verification, replay protection, idempotent handlers, retry queue with exponential backoff + jitter, and a dead letter queue for permanent failures. Triggers in Phase 6 EXECUTE when integrating with Stripe, GitHub, Slack, or any event-driven system, and in Phase 7 OBSERVABILITY for delivery telemetry."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# Webhook Setup

> Owns the full webhook lifecycle: signing, verification, queueing, retry, and dead-letter routing. Other sub-skills (api-contract, message-queue, audit-trail) integrate with this one — they call it, not the underlying framework hooks directly.

## When to Use

| Phase                   | Trigger                                                                                                      | Why                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Phase 6 — EXECUTE       | User requests Stripe/GitHub/Slack integration; spec mentions "webhook", "event notification", "callback URL" | Need verified, retried, idempotent event plumbing       |
| Phase 6 — EXECUTE       | Audit finds `app.post('/webhook')` handler with no signature check                                           | Security hole — must add verification                   |
| Phase 7 — OBSERVABILITY | Webhook delivery success rate < 99% in metrics                                                               | Need retry + dead letter telemetry                      |
| Phase 8 — TESTING       | Webhook handler exists but no integration tests                                                              | Must simulate provider payloads + retries               |
| Phase 11 — ROLLOUT      | First production webhook endpoint                                                                            | Smoke-test signature flow against provider's test event |

**Do NOT use this sub-skill for:** pub/sub inside a single process (use in-memory event emitter), long-polling APIs (those are not webhooks), or server-sent events to browsers (use `realtime-setup`). Webhooks are HTTP callbacks between servers — if either endpoint is a browser, this is the wrong sub-skill.

## What It Does

1. **Generates a signing secret** — 32-byte random hex, stored in env var (`WEBHOOK_SIGNING_SECRET`), never committed.
2. **For inbound webhooks (receiving):**
   - Verifies HMAC-SHA256 of `"{timestamp}.{raw_body}"` against `X-Webhook-Signature` header using constant-time comparison.
   - Rejects requests where `X-Webhook-Timestamp` is older than 5 minutes (replay protection) or more than 5 minutes in the future (clock skew guard).
   - Returns `200 OK` within 5 seconds — handler enqueues the payload for async processing and does NOT block on DB writes or external calls.
   - Deduplicates via `X-Webhook-Id` (or computed hash of body) — same event delivered twice processes exactly once.
3. **For outbound webhooks (sending):**
   - Signs each payload with `HMAC-SHA256(secret, "{timestamp}.{body}")` and sets `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Id` headers.
   - Persists every outbound event to a `webhook_deliveries` table with status `pending`, `delivered`, `failed`, `dead_lettered`.
   - Retries on non-2xx response or network error with schedule: 1m, 5m, 30m, 2h, 6h, 24h (6 attempts over ~24h, each with ±20% jitter).
   - After max retries exhausted: moves to dead letter queue, emits `webhook.dead_letter` alert, keeps payload for 30 days for manual replay.
4. **Exposes admin endpoints:** `POST /admin/webhooks/:id/replay` (re-deliver a dead-lettered event), `GET /admin/webhooks/:id` (delivery status + history).
5. **Emits metrics:** `webhook.received`, `webhook.delivered`, `webhook.failed`, `webhook.dead_lettered`, `webhook.signature_mismatch` — all tagged by `provider` and `event_type`.

## Integration Contract

```
INPUT:
  - direction: inbound|outbound (required)
  - provider: stripe|github|slack|custom (required, selects payload schema + signature header name)
  - endpoint_path: string (inbound only, default "/webhooks/:provider")
  - target_url: string (outbound only, the recipient's URL)
  - signing_secret_env: string (default "WEBHOOK_SIGNING_SECRET")
  - queue: redis|postgres|sqs (default postgres)
  - retry_schedule: comma-separated delays in seconds (default "60,300,1800,7200,21600,86400")
  - max_attempts: int (default 6)
  - replay_window_seconds: int (default 300 — reject timestamps older than 5 min)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "direction": "inbound|outbound",
    "provider": "stripe",
    "files_created": [
      "src/webhooks/stripe.ts",
      "src/webhooks/verify.ts",
      "src/webhooks/retry.ts",
      "src/webhooks/dead_letter.ts",
      "migrations/0007_webhook_deliveries.sql"
    ],
    "env_vars_required": ["WEBHOOK_SIGNING_SECRET", "WEBHOOK_REPLAY_WINDOW_SECONDS"],
    "test_files": ["test/webhooks/stripe.test.ts", "test/webhooks/retry.test.ts"],
    "metrics_emitted": ["webhook.received", "webhook.delivered", "webhook.failed", "webhook.dead_lettered"],
    "admin_endpoints": ["/admin/webhooks/:id", "/admin/webhooks/:id/replay"]
  }

SIDE EFFECTS:
  - Creates migration for `webhook_deliveries` table
  - Generates a 32-byte signing secret and writes to `.env.example` (never to `.env`)
  - Adds webhook routes to the app's router
  - Registers a background worker (or cron) that drains the retry queue
```

## CLI

```bash
# Scaffold an inbound Stripe webhook endpoint
python3 scripts/webhook_agent.py add --direction inbound --provider stripe \
  --endpoint /webhooks/stripe --queue postgres

# Scaffold an outbound webhook sender (for a custom integration)
python3 scripts/webhook_agent.py add --direction outbound --provider custom \
  --target-url https://partner.example.com/events \
  --retry-schedule 60,300,1800,7200,21600,86400

# Generate a fresh signing secret (rotate without restarting the app)
python3 scripts/webhook_agent.py rotate-secret --provider stripe

# Replay a dead-lettered event (manual recovery)
python3 scripts/webhook_agent.py replay --id evt_01HFG... --provider stripe

# Drain the retry queue now (don't wait for next scheduled tick)
python3 scripts/webhook_agent.py drain-queue --provider stripe

# Show delivery stats for the last 24h
python3 scripts/webhook_agent.py stats --provider stripe --since 24h
```

## Decision Tree (autonomous)

```
Q: Is the webhook inbound (we receive) or outbound (we send)?
  INBOUND → Q: Does the provider publish a signature scheme?
              YES (Stripe/GitHub/Slack) → use provider's exact scheme
                (Stripe: HMAC-SHA256 over "{timestamp}.{body}" in "Stripe-Signature" header,
                          timestamp prefix "t=" and signatures "v1=")
                (GitHub: HMAC-SHA256 over body in "X-Hub-Signature-256" as "sha256=<hex>")
                (Slack: HMAC-SHA256 over "v0:{timestamp}:{body}" in "X-Slack-Signature")
              NO (custom) → use the default scheme:
                X-Webhook-Signature: hex(HMAC-SHA256(secret, "{timestamp}.{body}"))
                X-Webhook-Timestamp: unix seconds
                X-Webhook-Id: UUIDv7
            → Q: Can the handler complete in < 5s?
                YES → may process inline, but still return 200 first
                NO  → MUST enqueue for async processing (return 200, worker picks up)
  OUTBOUND → Q: Is the recipient ours or third-party?
              OURS → still sign + retry — defense in depth
              THIRD-PARTY → sign + retry + add a per-recipient secret rotation policy
            → Q: Does the recipient verify signatures?
                YES → normal flow
                NO  → log a warning, mark delivery as `delivered_unverified` (don't silently skip — that's how you lose events)

Q: Did a delivery fail?
  HTTP 2xx → mark `delivered`, stop retrying
  HTTP 4xx (except 408, 429) → mark `failed` (client error, retrying won't help), move to dead letter
  HTTP 408, 429, 5xx, or network error → schedule next retry per `retry_schedule`
  Exhausted 6 attempts → mark `dead_lettered`, emit alert, keep payload for 30 days
```

## Retry Schedule (exponential backoff + jitter)

| Attempt       | Delay from previous | Cumulative  | Jitter (±20%)           |
| ------------- | ------------------- | ----------- | ----------------------- |
| 1 (immediate) | —                   | 0s          | —                       |
| 2             | 1 min               | 1 min       | 48s – 72s               |
| 3             | 5 min               | 6 min       | 4 min – 6 min           |
| 4             | 30 min              | 36 min      | 24 min – 36 min         |
| 5             | 2 h                 | 2h 36min    | 1h 36min – 2h 24min     |
| 6             | 6 h                 | 8h 36min    | 4h 48min – 7h 12min     |
| 7             | 24 h                | 1d 8h 36min | 19h 12min – 1d 4h 48min |
| → dead letter | —                   | —           | —                       |

Jitter is computed as `delay * (0.8 + random() * 0.4)` to prevent thundering-herd retries when a recipient recovers from an outage.

## Failure Modes & Recovery

| Symptom                                                    | Cause                                                                | Recovery                                                                                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webhook.signature_mismatch` spike                         | Secret rotated on one side but not the other                         | `webhook_agent.py rotate-secret` on both sides; support a 10-min dual-secret window during rotation                                                                 |
| Duplicate side effects (same charge twice)                 | Handler not idempotent; provider retried because we were slow to ack | Add `X-Webhook-Id` dedup table: `INSERT ... ON CONFLICT (event_id) DO NOTHING`; ensure all side-effecting code is idempotent (use external IDs, not auto-generated) |
| Handler times out, provider retries                        | Slow DB write or external API call inside handler                    | Move work to background queue — return 200 within 5s, process async                                                                                                 |
| Recipient down for 6h+ → all events dead-lettered          | Recipient outage longer than retry schedule                          | Don't auto-replay (could flood). Wait for recipient recovery, then `webhook_agent.py replay --since <time> --provider <p>` in batches of 100                        |
| Lost events (provider says "delivered", we have no record) | Handler returned 200 before persisting                               | Order of operations MUST be: persist → ack. Never ack-then-persist (a crash between = lost event)                                                                   |
| Replay attack (old event re-delivered)                     | Timestamp check missing or window too wide                           | Enforce `abs(now - timestamp) <= 300s`; reject otherwise with `401`                                                                                                 |
| Clock skew between sender and receiver                     | Server clocks off by > 5 min                                         | Sync with NTP; widen window to 600s temporarily; do NOT disable timestamp check                                                                                     |

## Self-Healing Loop

Every dead-lettered event triggers the loop:

1. **Detect** — retry worker sees `attempts >= max_attempts`, marks row `dead_lettered`, emits `webhook.dead_letter` alert (PagerDuty / Slack / email per `alert_channel` env).
2. **Diagnose** — `webhook_agent.py diagnose --id <event_id>` fetches: last response status, last error, recipient URL reachability, recent success rate for that recipient.
3. **Decide** — if recipient is reachable now and the failure was transient (5xx, timeout), suggest replay. If permanent (4xx, signature mismatch), suggest manual investigation and DON'T auto-replay.
4. **Replay** — `webhook_agent.py replay --id <event_id>` re-queues the original payload with a fresh timestamp + signature, resets attempt counter. Logs the replay actor (human or automated) for audit.
5. **Verify** — after replay, the event must reach `delivered` within 60s or escalate back to dead letter with a `replay_failed` flag.
6. **Learn** — every dead-letter + replay pair is written to `OMNIPROJECT_SELF_IMPROVEMENT.md` with: provider, event_type, root cause, recovery action. `meta-auditor` reads this in Phase 13; if a provider's dead-letter rate exceeds 1% over 7 days, `self-patch-generator` proposes a retry-schedule tuning.

## Quality Gates

- [ ] Inbound: signature verification test passes with valid HMAC, fails with tampered HMAC
- [ ] Inbound: replay test — same payload with old timestamp is rejected with `401`
- [ ] Inbound: idempotency test — same `X-Webhook-Id` delivered 3x produces side effect exactly once
- [ ] Inbound: handler returns `200` within 5s even when downstream is slow (verified by injecting a 10s DB delay)
- [ ] Outbound: signed payload passes recipient's verification (run against provider's test endpoint — e.g. Stripe CLI `stripe trigger` round-trip)
- [ ] Outbound: retry test — recipient returns `503`, sender retries per schedule (mock the clock to verify all 6 attempts fire)
- [ ] Outbound: dead letter test — after 6 failures, event is in dead letter queue and alert was emitted
- [ ] Outbound: replay test — dead-lettered event can be replayed and reaches `delivered`
- [ ] Metrics: all 5 metrics emitted with correct tags
- [ ] Secret: generated secret is in `.env.example` as a placeholder, NOT in `.env` (which would be committed) — verify with `git diff --cached` showing no secret
- [ ] Docs: README has a "Webhooks" section with: how to rotate secret, how to replay, how to read delivery stats

## Tools

- **Stripe CLI** (`stripe trigger`) — simulate Stripe webhook delivery locally for end-to-end tests.
- **smee.io** — proxy GitHub/Slack webhooks to localhost during development (do NOT use in production).
- **sqsmock / localstack** — local SQS for testing the queue backend without AWS.
- **BullMQ (Node) / RQ (Python)** — Redis-backed job queues with built-in exponential backoff; preferred over hand-rolled loops when Redis is available.
- **Prisma migrate / Alembic** — schema migration tool for the `webhook_deliveries` table.
- **`hmac` stdlib (Python/Node)** — for HMAC-SHA256. NEVER use a custom hash; NEVER use MD5 or SHA1.
- **`hmac.compare_digest` (Python) / `crypto.timingSafeEqual` (Node)** — constant-time comparison to prevent timing attacks. NEVER use `===` for signature comparison.

## Hard Rules

1. **Always verify the signature.** An unverified webhook endpoint is an unauthenticated RCE vector — attackers who know the URL can forge events. No signature check = no ship.
2. **Always check the timestamp.** `abs(now - timestamp) <= replay_window_seconds` (default 300s). Without this, a captured valid payload can be replayed months later.
3. **Always return 200 fast.** Persist the payload, return `200 OK` within 5s, process async. Providers (Stripe especially) will retry with exponential backoff if you're slow, and will eventually disable your endpoint if you consistently time out.
4. **Always make handlers idempotent.** The provider WILL deliver the same event more than once. Side effects must be keyed by `X-Webhook-Id` (or provider equivalent) so duplicates are no-ops, not double-charges.
5. **Never lose events.** A dead-letter queue is mandatory. After max retries, the event must be persisted with full payload + headers + last error for at least 30 days, and an alert must fire. Dropping silently is forbidden — financial and data-integrity consequences.
6. **Never commit the signing secret.** It lives in env vars / secret manager only. `.env.example` contains a placeholder like `WEBHOOK_SIGNING_SECRET=replace_me`, never the real value. CI fails if `.env` is git-tracked.
7. **Never compare signatures with `==`.** Timing attacks let attackers recover secrets byte-by-byte. Use `hmac.compare_digest` / `crypto.timingSafeEqual` — always.
