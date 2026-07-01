---
name: payment-setup
description: "Integrate payment processing — Stripe (preferred), PayPal, Braintree, Coinbase Commerce, Stripe Connect for marketplaces. Implements checkout flow, idempotency keys, webhook signature verification, refunds, 3DS SCA, subscription billing. Triggers in Phase 6 EXECUTE when adding payments or fixing payment-related code. Owns the money path so other sub-skills never touch card data."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# Payment Setup

> Backend sub-skill for anything that moves money. Picks the provider (Stripe/PayPal/Connect/Coinbase), implements checkout with idempotency, signs and verifies webhooks, handles 3DS SCA for EU/UK, and exposes a `create_charge` / `refund_charge` API that the rest of the app uses. Coordinates with `auth-setup` (customer identity), `rate-limiting` (per-customer throttle), and `webhook-setup` (delivery + retry).

## When to Use

| Phase                | Trigger                                                                                                              | Why                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Phase 2 — AUDIT      | Dimension 4 (Security) finds card data on the server, missing webhook signature check, or `amount` taken from client | Critical — PCI-DSS and money-loss risk                 |
| Phase 6 — EXECUTE    | User says "add Stripe", "add payments", "add subscriptions", "add checkout"                                          | This is the executing sub-skill                        |
| Phase 6 — EXECUTE    | Migrating from one provider to another (PayPal → Stripe, Braintree → Stripe)                                         | Full replace of integration layer                      |
| Phase 9 — ACCEPTANCE | Run a test charge in sandbox, verify webhook delivery, simulate 3DS                                                  | End-to-end money flow must be walked                   |
| Phase 11 — ROLLOUT   | Verify Stripe live keys are in env, webhooks endpoint registered, idempotency store flushed                          | Money-touching config drift is the most expensive kind |

**Do NOT use this sub-skill directly for:** subscription business logic (dunning, proration — handled by Stripe Billing or Chargebee, configured here but logic lives with the provider), marketplace seller onboarding UI (Stripe Connect Express accounts via dashboard), or tax calculation (use Stripe Tax / TaxJar — separate concern).

## What It Does

1. Picks the provider via the Decision Tree.
2. Installs the official SDK (NEVER a third-party wrapper for payments).
3. Wires environment: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (frontend).
4. Implements the checkout flow:
   - **One-time payment**: client creates PaymentMethod via Stripe.js (card data never touches server) → server creates PaymentIntent with server-side amount and currency → client confirms → webhook `payment_intent.succeeded` fulfills the order.
   - **Subscription**: create Customer → create Subscription with price ID → redirect to Stripe Checkout or host the form → webhook `invoice.paid` activates the subscription.
   - **Marketplace (Connect)**: create Express account for seller → charge with `transfer_data[destination]` → webhook `account.application.authorized` onboards seller.
5. Implements idempotency: every `POST /charges` and `POST /subscriptions` requires an `Idempotency-Key` header; the key + the request body hash is stored for 24h; replay returns the original response.
6. Wires webhook signature verification: `stripe.Webhook.construct_event(payload, signature, endpoint_secret)` — if signature is invalid, return 400 immediately, do not process.
7. Implements refunds: `stripe.Refund.create(payment_intent=pi_xxx)` with idempotency; webhook `charge.refunded` updates the order state.
8. Enables 3DS SCA: `payment_intent.payment_method_options.card.request_three_d_secure = any` for EU/UK cards; webhook `payment_intent.requires_action` returns the client secret for the frontend to handle the challenge.
9. Stores charge IDs, customer IDs, and subscription IDs — NEVER card numbers, NEVER CVV, NEVER track2 data.
10. Emits a `payment_client` for other modules: `create_charge(user, amount_cents, currency)`, `refund_charge(charge_id, reason)`, `create_subscription(user, price_id)`.

## Integration Contract

```
INPUT:
  - provider_hint: stripe|paypal|connect|coinbase (optional — otherwise decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - mode: test|live (default test — NEVER default to live)
  - currency: ISO 4217 (default "usd")
  - 3ds_required: bool (default true for EU/UK — SCA)
  - webhook_path: string (default "/webhooks/stripe")
  - customer_model: {table: "users", id_field: "id", email_field: "email"}
  - subscription_prices: list of {price_id, name, amount_cents, interval}

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "provider": "stripe|paypal|connect|coinbase",
    "mode": "test|live",
    "files_created": [
      "src/payments/client.{ts,py}",
      "src/payments/checkout.{ts,py}",
      "src/payments/webhooks.{ts,py}",
      "src/payments/refunds.{ts,py}",
      "src/payments/idempotency.{ts,py}"
    ],
    "env_required": [
      "STRIPE_SECRET_KEY (sk_test_... or sk_live_...)",
      "STRIPE_WEBHOOK_SECRET (whsec_...)",
      "STRIPE_PUBLISHABLE_KEY (pk_test_... or pk_live_...)"
    ],
    "webhook_endpoint_registered": "https://<host>/webhooks/stripe",
    "idempotency_store": "redis|postgres",
    "events_handled": [
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
      "payment_intent.requires_action",
      "charge.refunded",
      "invoice.paid",
      "invoice.payment_failed",
      "customer.subscription.deleted"
    ],
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes payment module under src/payments/
  - Adds required env vars to .env.example
  - Adds migration for `charges`, `subscriptions`, `idempotency_keys` tables
  - Registers webhook route in the framework's entry point (RAW body required — see Failure Modes)
```

## CLI

```bash
# Autonomous: pick provider, scaffold everything, register webhook
python3 scripts/payment_agent.py setup \
  --framework fastapi \
  --provider stripe \
  --mode test \
  --currency usd \
  --3ds-required

# Add subscription with price
python3 scripts/payment_agent.py add-subscription \
  --price-id price_abc123 \
  --name "Pro Monthly" \
  --amount-cents 1999 \
  --interval month

# Add marketplace (Stripe Connect) seller flow
python3 scripts/payment_agent.py enable-connect \
  --account-type express \
  --seller-onboarding-path /onboarding/stripe

# Verify webhook signature is being checked
python3 scripts/payment_agent.py audit --path src/payments/

# Replay a webhook event from the Stripe CLI for local testing
stripe trigger payment_intent.succeeded --add "payment_intent:pi_test_local"

# Switch from test to live mode (requires explicit confirmation)
python3 scripts/payment_agent.py go-live \
  --confirm "I understand this charges real money" \
  --backup-test-config
```

## Decision Tree (autonomous)

```
Q1: What payment type?
  Credit / debit cards
    → Stripe (best DX, widest coverage, 135+ currencies, 3DS SCA built in)
       NEVER roll your own card form — use Stripe Elements / PaymentSheet
  PayPal-only (user explicitly requires it)
    → PayPal SDK + webhooks
       Trade-off: separate webhook system, two providers if also taking cards
  Subscriptions (recurring)
    → Stripe Billing (preferred) OR Chargebee (if tax/dunning advanced)
       Stripe Billing: native, no extra cost
       Chargebee: better dunning, tax, revenue ops — but extra vendor
  Marketplace (multiple sellers, split payments)
    → Stripe Connect (Express accounts for sellers)
       Use Express for low-friction onboarding; Custom only if you need KYC control
  Crypto
    → Coinbase Commerce (custodial, easy) OR BTCPay Server (self-hosted, no KYC)
       NEVER accept crypto directly into a hot wallet without confirmation depth

Q2: Capture vs authorize?
  Physical goods / digital delivery immediate → capture immediately
  Pre-orders / risk-heavy → authorize only, capture on fulfillment
  Subscription → no manual capture (Stripe handles via invoices)

Q3: 3DS SCA?
  EU / UK customers → required (PSD2 SCA)
  US customers → optional, recommended for fraud reduction
  Strategy: set `request_three_d_secure=any` always, let Stripe decide per-card

Q4: Idempotency store?
  Single server → in-memory LRU (24h TTL, 10k entries max)
  Multi-server → Redis (atomic SETNX with TTL) OR Postgres (unique constraint on key)
  Never → filesystem (race conditions across processes)
```

## Patterns (mandatory)

| Concern             | Pattern                                                           | Why                                                     |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Card capture        | Stripe.js / PaymentSheet on client                                | Card data never reaches your server — PCI scope = SAQ-A |
| Amount              | Server-side only (from price ID + quantity)                       | Never trust `req.body.amount` — trivially manipulated   |
| Idempotency         | `Idempotency-Key` header + 24h store                              | Network retries create duplicate charges without it     |
| Webhook signature   | `stripe.Webhook.construct_event` on raw body                      | Prevents forged webhooks from crediting accounts        |
| Customer            | Create Stripe Customer for repeat purchases                       | Avoids re-entering card; supports subscriptions         |
| Refunds             | `stripe.Refund.create` with idempotency                           | Refunds can be partial; never refund twice by accident  |
| Failed payment      | Webhook `invoice.payment_failed` → retry via Stripe Smart Retries | Don't write your own dunning — Stripe's is better       |
| Webhook idempotency | Store event ID, skip if already processed                         | Stripe retries; without idempotency you double-process  |
| Currency            | Always integer minor units (cents)                                | `$10.00` = `1000`. Float math = rounding bugs           |
| Test mode           | Default to `sk_test_`, never `sk_live_` in dev                    | Live keys in dev = accidental real charges              |

## Failure Modes & Recovery

| Symptom                                               | Cause                                                                | Recovery                                                                                                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `No signatures found matching the expected signature` | Webhook signed with wrong secret, OR body parsed before verification | Use RAW body (Express: `express.raw({type: 'application/json'})` before `express.json()`; FastAPI: `Request.body()` not `Request.json()`). Re-fetch secret from Stripe dashboard |
| `Charge already exists with this Idempotency-Key`     | Key reused with different params                                     | Generate new key per logical operation; never reuse across requests                                                                                                              |
| Duplicate charge in DB but one in Stripe              | Webhook processed twice (retried)                                    | Store event ID; skip if seen. Add `UNIQUE(event_id)` constraint                                                                                                                  |
| `PaymentIntent requires action` not handled           | 3DS challenge not surfaced to client                                 | Return `client_secret` to frontend; call `stripe.confirmCardPayment`                                                                                                             |
| `card_declined` UX is "Try again" with no detail      | Stripe `decline_code` not surfaced                                   | Map `insufficient_funds`, `stolen_card`, `expired_card` to user-friendly messages                                                                                                |
| Amount mismatch between client and server             | Client sent amount, server used it                                   | Always derive amount from server-side price lookup; reject `req.body.amount`                                                                                                     |
| Webhook delivery delayed > 1 min                      | Stripe queue backlog or your endpoint slow                           | Webhook handler must return 200 in < 3s — push heavy work to background queue                                                                                                    |
| Subscription active but DB shows canceled             | `customer.subscription.deleted` webhook missed                       | Reconcile via `stripe.Subscription.list(customer=...)` cron job nightly                                                                                                          |
| Live key leaked in git history                        | Committed `.env` accidentally                                        | Rotate key in Stripe dashboard immediately; scrub git history with `git filter-repo`; treat as a security incident                                                               |

## Self-Healing Loop

Every payment incident (failed webhook signature, duplicate charge, 3DS drop-off, refund spike) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: checkout
  failure_class: webhook_signature_mismatch
  trigger: signature verification failed on 12% of webhooks for 1 hour
  recovery: raw body parser misordered behind express.json() — moved stripe webhook route to its own parser
  rule_added: payment-setup sub-skill now emits a comment in the route file: "RAW BODY REQUIRED — do not add express.json() above this route"
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the raw-body parser warning.

For duplicate charges specifically: if `Idempotency-Key` is missing on a `POST /charges` endpoint, the audit halts the build — this is a Critical bug.

## Quality Gates (enforced before declaring "payments ready")

- [ ] No card number, CVV, or track data stored anywhere (grep for `card_number`, `cvv`, `cvc`, PAN regex `\d{13,19}`)
- [ ] Stripe.js or PaymentSheet used on the client — no raw `<input name="card">` forms
- [ ] `STRIPE_SECRET_KEY` from env var, never in code, never committed
- [ ] Webhook endpoint verifies signature with `construct_event` on raw body
- [ ] All `POST /charges`, `POST /refunds`, `POST /subscriptions` require `Idempotency-Key` header
- [ ] Amount derived server-side from price ID — `req.body.amount` ignored
- [ ] 3DS enabled for EU/UK customers (SCA compliance)
- [ ] Webhook handler returns 200 in < 3s; heavy work pushed to background
- [ ] Webhook event IDs stored with `UNIQUE` constraint to prevent double-processing
- [ ] Refund flow tested with partial refund and full refund
- [ ] Tests cover: successful charge, declined card, 3DS challenge, refund, webhook replay, webhook signature failure, idempotency replay
- [ ] Mode is `test` in dev, `live` only in production with explicit env var
- [ ] Customer objects created for repeat buyers
- [ ] Nightly reconciliation cron: `stripe.Charge.list` vs DB (detects missed webhooks)

If any gate fails: status = `error`, do not proceed to Phase 9. Money-touching bugs are not "ship and fix later" — they are release blockers.

## Tools

- **stripe** (Python `stripe`, Node `stripe`) — official SDK. Always the latest major; Stripe ships breaking changes rarely but security patches often.
- **Stripe.js / PaymentSheet** (frontend) — card capture. NEVER use raw HTML inputs for card data.
- **Stripe CLI** (`stripe listen --forward-to localhost:8000/webhooks/stripe`) — local webhook testing. Critical for dev.
- **paypal-rest-sdk** — PayPal REST API. Use only if PayPal is explicitly required.
- **@paypal/react-paypal-js** — PayPal Buttons frontend.
- **coinbase-commerce-node** — Coinbase Commerce for crypto.
- **btcpayserver** (self-hosted) — for self-hosted crypto without KYC.
- **Stripe Connect** — Express accounts for marketplaces (`stripe.Account.create(type='express')`).
- **Redis** / **Postgres** — idempotency key store. Redis preferred for sub-ms lookup.

## Permissions

- Filesystem: write to `src/payments/`, `.env.example`, migrations directory
- Network: outbound to `api.stripe.com`, `api.paypal.com`, `api.coinbase.com` (provider-dependent)
- Secrets: read only from env vars or secret manager — never from disk, never logged
- Processes: may invoke `npm install` / `pip install` for official SDKs only; NEVER install third-party payment wrappers without explicit approval

## Hard Rules

1. **Never log card numbers, CVV, or track data.** PCI-DSS Requirement 3. Grep the log formatter for `card`, `cvv`, `pan` and redact. A logged PAN = reportable breach.
2. **Never store CVV post-authorization.** Storing CVV is a PCI-DSS violation even encrypted. CVV is for authorization only and must be discarded.
3. **Always use Stripe.js / PaymentSheet for card capture.** Card data must never touch your server. Raw `<input>` card forms expand your PCI scope to SAQ-D (the worst tier) and are a release blocker.
4. **Always verify webhook signatures.** `construct_event(payload, signature, endpoint_secret)`. An unverified webhook endpoint is a free money-printing machine for an attacker who can post to it.
5. **Always use idempotency keys on charge / refund / subscription endpoints.** `Idempotency-Key` header, 24h store, body hash check. Without this, a network retry double-charges the customer.
6. **Never trust client-side amount.** The server derives `amount` from a price ID + quantity lookup. `req.body.amount` is ignored. A client-controlled amount is trivially exploitable (`amount=1` for a $1000 product).
7. **Always default to test mode in dev.** `sk_test_` keys only. Live keys (`sk_live_`) must require explicit env-var override AND a CI check that prevents deploying live keys to non-prod environments.
8. **Always enable 3DS for EU/UK cards (SCA compliance).** PSD2 mandates Strong Customer Authentication. Without 3DS, EU issuers decline the charge and you lose the sale.
9. **Never reuse Stripe live keys across environments.** One key per environment, rotated quarterly. A leaked live key = full access to your Stripe account = refund/charge at will.
10. **Always reconcile charges against the provider nightly.** Missed webhooks happen. A cron job comparing `stripe.Charge.list` to your DB catches them before the customer notices. Discrepancy alerting to on-call.
