---
name: email-setup
description: "Transactional email integration — SendGrid, AWS SES, Postmark, Mailgun, Resend. Picks the provider, wires API-based sending (never SMTP in app code), HTML+plaintext templates, List-Unsubscribe headers, bounce/complaint webhooks, and SPF/DKIM/DMARC DNS records. Triggers in Phase 6 EXECUTE when the app needs to send email, and in Phase 2 AUDIT when Dimension 4 finds SMTP-in-code, missing unsubscribe, or unhandled bounces."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: infra
---

# Email Setup

> Infra sub-skill for the email channel. Picks the provider (Resend/SendGrid/SES/Postmark/Mailgun), implements transactional send via the provider's REST API (never SMTP from the app process), wires HTML+plaintext templates with List-Unsubscribe headers, registers bounce/complaint webhooks that mark users as undeliverable, and emits the SPF/DKIM/DMARC DNS records needed for deliverability. Coordinates with `auth-setup` (password reset / email verification), `webhook-setup` (provider event delivery), and `env-config` (provider API keys).

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | Dimension 4 (Security) finds `smtplib.SMTP` / `nodemailer` direct SMTP, hardcoded SMTP password, or no TLS | Direct SMTP in app code leaks credentials and bypasses provider deliverability infra |
| Phase 2 — AUDIT | Dimension 9 (Observability) finds email sent with no bounce handling | Bounces silently pile up; sender reputation degrades |
| Phase 6 — EXECUTE | User says "add email", "add password reset", "add welcome email", "add SendGrid/SES/Resend" | This is the executing sub-skill |
| Phase 6 — EXECUTE | Migrating providers (SendGrid → Resend, SES → Postmark) | Full replace of integration layer, keep templates |
| Phase 9 — ACCEPTANCE | Send a test transactional email, verify webhook delivery, verify SPF/DKIM pass | Email is async — must walk the full send → deliver → bounce loop |
| Phase 11 — ROLLOUT | Verify DNS records live, verify provider API key in env, verify webhook endpoint registered | Misconfigured DNS = email goes to spam |

**Do NOT use this sub-skill for:** marketing campaigns (use a dedicated ESP — Mailchimp, Customer.io — and never send marketing without explicit consent), inbox / IMAP receive (use a service like Postmark Inbound or Nylas), or SMS (use `twilio-setup`-equivalent). This sub-skill is **transactional only**.

## What It Does

1. Picks the provider via the Decision Tree.
2. Installs the official SDK: `@sendgrid/mail` / `@aws-sdk/client-sesv2` / `postmark` / `mailgun.js` / `resend`. Never SMTP.
3. Wires environment: `RESEND_API_KEY` / `SENDGRID_API_KEY` / `SES_REGION` + IAM role / `POSTMARK_SERVER_TOKEN` / `MAILGUN_API_KEY` + `MAILGUN_DOMAIN`.
4. Builds a `send_transactional(to, template_id, params)` function that:
   - Renders HTML + plaintext from a template (provider template, MJML, or in-repo Handlebars).
   - Sets `List-Unsubscribe` + `List-Unsubscribe-Post` headers (one-click unsubscribe — RFC 8058).
   - Sets `Message-ID`, `X-Entity-Ref-ID` (prevent Gmail threading collapse for transactional mail).
   - Sends via the provider's REST API with a 10s timeout.
   - Returns the provider message ID for idempotency tracking.
5. Registers a webhook endpoint (`/webhooks/email`) that verifies the provider signature on raw body and processes:
   - `bounce` → mark user `email_status = bounced`, record `bounce_type` (hard/soft) and `bounce_reason`.
   - `complaint` (marked-as-spam) → mark user `email_status = complained`, NEVER email them again.
   - `delivered` → record delivery timestamp (optional, for SLA dashboards).
6. Emits DNS records for the customer's domain: SPF (TXT), DKIM (CNAME or TXT), DMARC (TXT, `p=quarantine` minimum).
7. Enforces a suppression list: never send to bounced/complained addresses. Provider-side suppression + local DB cross-check.
8. Emits an `email_client` for other modules: `send_transactional`, `send_password_reset`, `send_verification`, `send_invoice`.

## Integration Contract

```
INPUT:
  - provider_hint: resend|sendgrid|ses|postmark|mailgun (optional — decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - from_domain: string (required — e.g. "mail.example.com", NEVER bare "example.com")
  - from_name: string (default "Example Team")
  - reply_to: string (default none — set if users should reply)
  - transactional_volume_per_day: int (for IP warm-up planning)
  - template_engine: provider|mjml|handlebars (default provider)
  - webhook_path: string (default "/webhooks/email")

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "provider": "resend|sendgrid|ses|postmark|mailgun",
    "from_domain": "mail.example.com",
    "files_created": [
      "src/email/client.{ts,py}",
      "src/email/templates/",
      "src/email/webhooks.{ts,py}",
      "src/email/suppression.{ts,py}"
    ],
    "env_required": ["RESEND_API_KEY"],
    "dns_records": [
      {"type": "TXT", "name": "mail.example.com", "value": "v=spf1 include:amazonses.com ~all"},
      {"type": "CNAME", "name": "resend._domainkey.mail.example.com", "value": "<provider DKIM>"},
      {"type": "TXT", "name": "_dmarc.mail.example.com", "value": "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"}
    ],
    "webhook_endpoint_registered": "https://<host>/webhooks/email",
    "events_handled": ["email.bounced", "email.complained", "email.delivered"],
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes email module under src/email/
  - Adds migrations for `email_suppressions` table (email, reason, bounced_at, complaint_at)
  - Adds required env vars to .env.example
  - Registers webhook route on RAW body (signature verification fails on parsed JSON)
```

## CLI

```bash
# Autonomous: pick provider, scaffold client + webhooks, emit DNS records
python3 scripts/email_agent.py setup \
  --framework fastapi \
  --provider resend \
  --from-domain mail.example.com \
  --from-name "Example Team" \
  --transactional-volume 1000

# Add a transactional template (HTML + plaintext + subject)
python3 scripts/email_agent.py add-template \
  --id password_reset \
  --subject "Reset your password" \
  --mjml templates/password_reset.mjml \
  --params '{"reset_url":"string","user_name":"string"}'

# Verify DNS records are live (queries authoritative nameservers)
python3 scripts/email_agent.py verify-dns --domain mail.example.com

# Send a test transactional email (sandbox if provider supports it)
python3 scripts/email_agent.py send-test \
  --template-id password_reset \
  --to user@example.com \
  --params '{"reset_url":"https://example.com/reset?token=abc","user_name":"Sam"}'

# Replay a bounce webhook locally (provider CLI)
resend emails send --from dev@example.com --to bounce@test.resend.dev --subject test

# Audit: grep for SMTP-in-code, missing unsubscribe, no webhook signature check
python3 scripts/email_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: Managed SaaS or self-hosted?
  Managed SaaS (preferred — deliverability infra is their job)
    → continue
  Self-hosted (Postfix/Haraka)
    → FORBIDDEN unless team has a dedicated deliverability engineer
      Self-hosted email almost always lands in spam; use SaaS

Q2: Which SaaS?
  Modern stack, React/Next, want DX, low volume (<100k/mo)
    → Resend (best DX, React Email templates, fair pricing)
  Enterprise, need dedicated IP, complex routing, 10M+ emails/mo
    → SendGrid (mature, dedicated IPs, sub-user segmentation)
  AWS-native, cost-sensitive at scale (millions of emails)
    → AWS SES (cheapest at scale, $0.10/1k, but barebones UX)
  Highest deliverability for transactional only, smaller volume
    → Postmark (best delivery rates, transactional-only focus)
  Existing Mailgun account or need EU data residency
    → Mailgun (good EU options, decent pricing)

Q3: Transactional or marketing?
  Transactional (password reset, receipts, notifications)
    → This sub-skill handles it. Always include List-Unsubscribe.
  Marketing (newsletter, promotions)
    → Use a dedicated ESP (Mailchimp, Customer.io, ConvertKit)
      NEVER send marketing from this client. Consent must be explicit
      and recorded. Sending marketing without consent violates CAN-SPAM/GDPR.

Q4: Template engine?
  Provider templates (SendGrid Dynamic Templates, Resend Templates)
    → Best for non-engineers editing copy; versioned in provider dashboard
  In-repo MJML → compiled to HTML at build time
    → Best for code review + git history of email changes
  In-repo Handlebars + inline CSS
    → Lightest; only if team is small and emails are simple

Q5: IP warm-up needed?
  Dedicated IP + >100k/mo volume on a fresh IP
    → Warm up over 4 weeks: 200/day, 500, 1k, 2k, 5k, 10k, 25k, 50k, 100k
      Provider has warm-up schedules; never blast cold IP — instant spam-folder
  Shared IP (default for most providers)
    → No warm-up needed; provider manages reputation across tenants
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Email lands in spam | SPF/DKIM/DMARC not configured or misaligned | Run `python3 scripts/email_agent.py verify-dns`; fix records; wait for DNS TTL; re-test with `mail-tester.com` |
| `550 5.7.1 SPF check failed` | SPF record missing or wrong `include:` | Add provider's `include:` to SPF TXT; verify with `dig TXT mail.example.com` |
| Bounce webhook never fires | Webhook not registered in provider dashboard, OR signature verification rejecting events | Register endpoint in provider UI; verify route uses raw body (Express: `express.raw({type:'application/json'})` before `express.json()`) |
| Same user keeps getting emailed despite bounce | Suppression list not checked before send | Add pre-send check: `if user.email_status in ('bounced','complained'): skip`. Cross-reference provider suppression API |
| `List-Unsubscribe` missing | Headers not set on message | Add `List-Unsubscribe: <mailto:unsub@example.com>, <https://example.com/unsub?id=...>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers |
| Password reset email delayed > 30s | Sent synchronously in request handler | Push to background queue (BullMQ / Celery / SQS); user-facing request returns immediately |
| `429 Too Many Requests` from provider | Burst exceeds rate limit | Add client-side rate limit + exponential backoff; consider provider's higher tier |
| DKIM signature invalid after domain change | DKIM key rotated but old CNAME still cached | Update DKIM CNAME, wait for TTL, re-verify with provider dashboard |
| Complaint rate > 0.1% | Users marking as spam — content or frequency problem | Halt sends, review content, reduce frequency, audit opt-in flow (single opt-in = high complaint rate) |

## Self-Healing Loop

Every email incident (bounce spike, complaint spike, deliverability drop, webhook signature failure) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: password_reset_email
  failure_class: high_bounce_rate
  trigger: bounce rate 8% (threshold 5%) over 1 hour
  recovery: identified a bad regex matching invalid emails at signup — added RFC 5322 regex + DNS MX check at signup
  rule_added: email-setup sub-skill now adds MX-record validation at the email-verification step
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the MX validation.

For deliverability specifically: if SPF/DKIM/DMARC verification fails on rollout, Phase 11 halts — email in spam is a release blocker for transactional flows (password reset is a security feature).

## Quality Gates (enforced before declaring "email ready")

- [ ] No SMTP in app code (grep for `smtplib`, `nodemailer.createTransport` with SMTP, `smtp://`)
- [ ] Provider API key from env var, never committed
- [ ] Every transactional email has both HTML and plaintext parts
- [ ] `List-Unsubscribe` and `List-Unsubscribe-Post` headers set on every message
- [ ] Webhook endpoint verifies provider signature on raw body
- [ ] Bounce webhook marks user `email_status = bounced` and prevents future sends
- [ ] Complaint webhook marks user `email_status = complained` and prevents ALL future sends
- [ ] Suppression list checked before every send (local DB + provider API cross-check)
- [ ] SPF, DKIM, DMARC DNS records emitted and verified live
- [ ] DMARC policy is `p=quarantine` or `p=reject` (NOT `p=none`)
- [ ] Sending from subdomain (`mail.example.com`), NOT bare domain (`example.com`)
- [ ] Email body never contains PII in logs (scrub `to`, `params` before logging)
- [ ] Tests cover: successful send, bounce webhook, complaint webhook, signature failure, suppression enforcement, idempotent send (same message ID → one send)

If any gate fails: status = `error`, do not proceed to Phase 9. Email that lands in spam or fails to suppress bounces is a release blocker.

## Tools

- **Resend** (`resend` npm / `resend` pip) — modern SaaS, React Email templates, best DX. Default for new projects.
- **SendGrid** (`@sendgrid/mail` / `sendgrid`) — enterprise, dedicated IPs, mature.
- **AWS SES** (`@aws-sdk/client-sesv2` / `boto3`) — cheapest at scale, AWS-native. Pair with SES Event Publishing + SNS for webhooks.
- **Postmark** (`postmark` npm / `postmarker`) — highest deliverability, transactional-only focus.
- **Mailgun** (`mailgun.js` / `mailgun`) — good EU residency, decent routing.
- **MJML** (`mjml`) — compile responsive HTML emails from a concise markup. Pair with `handlebars` for templating.
- **React Email** (`@react-email/components`) — write emails as React components, render to HTML. Pair with Resend.
- **mail-tester.com** — verify spam score and DNS config (free, 3 checks/day).
- **dig / nslookup** — verify DNS records live: `dig TXT mail.example.com`, `dig CNAME resend._domainkey.mail.example.com`.

## Permissions

- Filesystem: write to `src/email/`, `templates/`, `.env.example`, migrations directory
- Network: outbound HTTPS to provider API (`api.resend.com`, `api.sendgrid.com`, `email.{region}.amazonaws.com`, `api.postmarkapp.com`, `api.mailgun.net`)
- Network: outbound DNS (port 53) for `verify-dns` command
- Secrets: read provider API key from env only; never log; never include in error reports
- Processes: may invoke `npm install` / `pip install` for official provider SDKs only; NEVER install third-party SMTP wrappers without explicit approval

## Hard Rules

1. **Never send email via SMTP from the app process.** Use the provider's REST API. SMTP in app code leaks credentials, bypasses provider retry/deliverability infra, and breaks idempotency tracking.
2. **Never send marketing email without explicit consent.** Consent must be recorded (timestamp, source, IP). CAN-SPAM and GDPR both require it. A transactional email client used for marketing is a regulatory landmine.
3. **Always include List-Unsubscribe and List-Unsubscribe-Post headers.** RFC 8058 one-click unsubscribe is required by Gmail/Yahoo since Feb 2024 for bulk senders. Missing it = filtered to spam.
4. **Always handle bounces and complaints via webhook.** A bounce that isn't processed means the next send to that address harms your reputation. A complaint that isn't processed means you email someone who marked you as spam — that's the worst possible outcome.
5. **Never send to a bounced or complained address again.** Suppression list checked before every send, both locally and via provider API. The provider-side suppression is the source of truth; local DB is a fast-path cache.
6. **Always configure SPF, DKIM, and DMARC.** DMARC minimum `p=quarantine`. `p=none` is monitoring only and not acceptable for production. Without these, your email is forgeable and will land in spam.
7. **Never send from a bare domain.** Use a subdomain (`mail.example.com`, not `example.com`). Bare-domain sending means a deliverability mistake corrupts your root domain's reputation — affecting your website, DNS, everything.
8. **Never log email body or recipient PII.** Log message ID, template ID, and timestamp only. Email bodies contain user data, password reset tokens, invoices — all PII. Scrub `to` and `params` before any log line.
9. **Always send transactional email asynchronously.** Push to a background queue (BullMQ/Celery/SQS). Synchronous sending makes a user-facing request depend on a third party — a provider outage becomes your outage.
10. **Always send both HTML and plaintext.** Many clients (text-only terminals, some spam filters, accessibility tools) read plaintext only. Missing plaintext = lower deliverability and accessibility failure.
