---
name: env-config
description: "Environment configuration and secrets — .env files for dev, Doppler / AWS Secrets Manager / HashiCorp Vault for staging+prod, schema validation (zod / pydantic / environ-config) with fail-fast on missing required vars, .env.example committed and .env never committed, 90-day secret rotation with dual-key overlap. Triggers in Phase 6 EXECUTE when scaffolding a new app, and in Phase 2 AUDIT when Dimension 4 finds hardcoded secrets, missing .env.example, or no startup validation."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: infra
---

# Environment Config

> Infra sub-skill for the config-and-secrets layer. Picks the secret store by environment (.env.local for dev, Doppler / AWS Secrets Manager for staging+, HashiCorp Vault for enterprise), validates config on startup via schema (zod for TS, pydantic for Python, environ-config for explicitness) so missing required vars fail fast instead of crashing mid-request, keeps `.env.example` committed and `.env` gitignored, and rotates secrets every 90 days with dual-key overlap so rotation never causes downtime. Coordinates with every other sub-skill that consumes config (`auth-setup`, `payment-setup`, `email-setup`, `db-design`, etc.).

## When to Use

| Phase              | Trigger                                                                                           | Why                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Phase 2 — AUDIT    | Dimension 4 (Security) finds hardcoded API keys, DB passwords, or JWT secrets in source           | Hardcoded secrets in git = security incident waiting to happen         |
| Phase 2 — AUDIT    | Dimension 4 finds `.env` committed to git (no `.gitignore` entry, or committed before ignore)     | Rotate all secrets immediately; treat as a breach                      |
| Phase 2 — AUDIT    | Dimension 5 finds app crashing mid-request with `KeyError: 'DATABASE_URL'`                        | Missing startup validation — should fail at boot, not at first request |
| Phase 2 — AUDIT    | Dimension 9 finds no `.env.example`                                                               | New developers can't onboard without guessing what env vars are needed |
| Phase 6 — EXECUTE  | User says "set up env", "add config", "add secrets management", "use Doppler/Vault"               | This is the executing sub-skill                                        |
| Phase 6 — EXECUTE  | Scaffolding a new app — config layer is the first thing installed                                 | Every other module depends on this                                     |
| Phase 11 — ROLLOUT | Verify secrets in production secret store, verify rotation schedule set, verify audit log enabled | Misconfigured secrets = outage or breach                               |

**Do NOT use this sub-skill for:** runtime feature flags (use a feature-flag service — LaunchDarkly, Unleash, Flagsmith — for dynamic toggles; env vars are for static config), application config that changes per-user (use DB), or cryptographic key management for end-to-end encryption (use KMS — AWS KMS, GCP KMS, Vault Transit).

## What It Does

1. Picks the secret store via the Decision Tree.
2. Installs the schema validator: `zod` (TS) / `pydantic` (Python, via `pydantic-settings`) / `environ-config` (Python, explicit) / `convict` (Node, schema-driven).
3. Defines a typed config schema:
   ```typescript
   // TS (zod)
   const ConfigSchema = z.object({
     DATABASE_URL: z.string().url(),
     JWT_SECRET: z.string().min(32),
     STRIPE_API_KEY: z.string().startsWith("sk_"),
     APP_ENV: z.enum(["development", "staging", "production"]),
     APP_PORT: z.coerce.number().int().default(3000),
     LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
   });
   const config = ConfigSchema.parse(process.env);
   ```
   ```python
   # Python (pydantic-settings)
   class Config(BaseSettings):
       database_url: PostgresDsn
       jwt_secret: SecretStr
       stripe_api_key: SecretStr
       app_env: Literal["development", "staging", "production"]
       app_port: int = 3000
       log_level: Literal["debug","info","warn","error"] = "info"
       model_config = SettingsConfigDict(env_file=".env")
   ```
4. Validates on startup — fail fast with a clear error message naming the missing/invalid var. The app must NOT start with invalid config.
5. Generates `.env.example` from the schema — every var listed with a placeholder and a comment. Committed to git.
6. Adds `.env` to `.gitignore` (if not already). Verifies no `.env*` files are tracked.
7. Wires the secret store:
   - **Dev**: `.env.local` (loaded by dotenv / python-dotenv). `.env.example` is the template.
   - **Staging/Prod (Doppler)**: `doppler run --` wraps the process; injects secrets as env vars at runtime. No `.env` file on disk in prod.
   - **Staging/Prod (AWS Secrets Manager)**: app fetches secret on startup via `boto3`; caches in memory; refreshes every 5 min for rotation.
   - **Enterprise (HashiCorp Vault)**: app authenticates via Kubernetes service account / AWS IAM; fetches short-lived secrets; renew leases automatically.
8. Implements secret rotation:
   - **90-day rotation schedule** for all secrets (DB passwords, API keys, JWT signing keys).
   - **Dual-key overlap**: during rotation, both old and new keys are valid for 24h. App accepts both; new writes use the new key.
   - **Audit log**: every secret access is logged (who, when, which secret).
9. Emits a typed `config` object for other modules: `config.database_url`, `config.jwt_secret`, `config.app_env`. Never `process.env` directly in app code.
10. Adds a startup self-check: log `✓ Config validated: 12 vars loaded` (without values) on boot. If validation fails, log `✗ Config invalid: missing DATABASE_URL` and exit non-zero.

## Integration Contract

```
INPUT:
  - secret_store_hint: dotenv|doppler|aws_secrets_manager|vault (optional — decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - validator: zod|pydantic|environ_config|convict (default zod for TS, pydantic for Python)
  - environments: list (default ["development", "staging", "production"])
  - rotation_days: int (default 90)
  - audit_log: bool (default true for staging+)
  - required_vars: list of {name, type, default?, description, sensitive?}

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "secret_store": "doppler",
    "validator": "zod",
    "files_created": [
      "src/config/schema.{ts,py}",
      "src/config/index.{ts,py}",
      "src/config/rotation.{ts,py}",
      ".env.example",
      ".gitignore (updated with .env*)"
    ],
    "env_required": [],  // none — config IS the env layer
    "env_example_entries": 12,
    "rotation_schedule_days": 90,
    "audit_log": true,
    "startup_check": "ConfigSchema.parse(process.env) on boot",
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes config module under src/config/
  - Creates .env.example (committed)
  - Adds .env, .env.local, .env.*.local to .gitignore
  - Verifies no .env files are tracked in git (if tracked, halts with rotation advisory)
  - Adds startup self-check at app entry point
```

## CLI

```bash
# Autonomous: pick secret store, scaffold schema + validator + .env.example
python3 scripts/env_config_agent.py setup \
  --framework fastapi --secret-store doppler --validator pydantic --required-vars vars.json

# vars.json: [{"name":"DATABASE_URL","type":"url","description":"Postgres connection","sensitive":true}, ...]

# Generate .env.example from schema; validate current .env against schema (dry-run)
python3 scripts/env_config_agent.py generate-example --schema src/config/schema.py --output .env.example
python3 scripts/env_config_agent.py validate --env-file .env --schema src/config/schema.py

# Check git history for committed secrets (treat as breach if found)
python3 scripts/env_config_agent.py scan-git-history \
  --patterns "password=,api_key=,secret=,sk_live_,sk_test_,AKIA" --since "1 year ago"

# Set up Doppler (staging+prod) and rotate a secret
python3 scripts/env_config_agent.py setup-rotation --secret-store doppler --rotation-days 90 --overlap-hours 24
doppler secrets set STRIPE_API_KEY=sk_live_new --project my-app --config prd

# Audit: grep for hardcoded secrets, missing .env.example, no validation
python3 scripts/env_config_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: Environment?
  Development (local) → .env.local (loaded by dotenv); .env.example is committed template; .env.local gitignored
  Staging / Production → continue to Q2
  Enterprise / regulated (HIPAA, SOC2, FedRAMP) → HashiCorp Vault (compliance-required; dynamic secrets; audit log; lease renewal)

Q2: Which secret store for staging+prod?
  Best DX, single source of truth → Doppler (SaaS, free tier, `doppler run --` injects at runtime; no .env on disk in prod)
  AWS-native → AWS Secrets Manager (boto3 fetch on startup, cache in memory, refresh for rotation; $0.40/secret/month)
  GCP-native → Google Secret Manager (GCP equivalent of AWS SM)
  Already running Vault cluster → HashiCorp Vault (most powerful, most complex; dynamic secrets; audit log)
  Simple, no budget → .env on server (WORST — secrets on disk, no rotation, no audit; only for tiny/hobby apps)

Q3: Validator?
  TypeScript/JavaScript → zod (runtime + static types from one schema; `ConfigSchema.parse(process.env)`)
  Python → pydantic-settings (BaseSettings, type coercion, .env support, SecretStr); or environ-config (explicit, library-friendly)
  Schema-as-code with comments → convict (Node, JSON schema)

Q4: Per-environment config strategy?
  One .env per env → .env.development, .env.staging, .env.production (gitignored except .env.example); load via `dotenv --file .env.${APP_ENV}`
  Secret store handles per-env → Doppler/Secrets Manager have config per env (`doppler setup --config prd`); no .env files in prod

Q5: Rotation strategy?
  All secrets rotate every 90 days → DB password, API keys, JWT signing keys; dual-key overlap (both valid 24h)
  JWT signing keys → use kid (key ID) header; app tries keys in order; rotate one kid at a time; old valid 24h
  Static keys that can't rotate (third-party API keys) → document as exception; monitor for leaks; rotate manually if compromised

Q6: Audit log?
  Staging/Production → enable audit log for every secret access (who, when, which secret)
    Doppler: built-in. AWS SM: CloudTrail logs every GetSecretValue. Vault: built-in audit log (file/socket).
  Development → skip (too noisy for local dev)
```

## Failure Modes & Recovery

| Symptom                                                 | Cause                                                        | Recovery                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| App crashes mid-request with `KeyError: 'DATABASE_URL'` | No startup validation; missing env var                       | Add `ConfigSchema.parse(process.env)` at boot; fail fast with clear error                                               |
| `SecretStr` object has no attribute `strip` (Python)    | Code treats pydantic `SecretStr` as raw string               | Use `config.jwt_secret.get_secret_value()` to access; never log it                                                      |
| App works locally but fails in prod                     | Dev `.env` has var; prod secret store missing it             | Sync `.env.example` and prod secret store; CI check: validate against prod secret store schema                          |
| Secret rotation breaks app                              | App only accepts one key; rotation invalidates immediately   | Implement dual-key overlap; app accepts both keys for 24h window                                                        |
| `.env` committed to git by accident                     | Forgot to add to `.gitignore`, or committed before adding    | Rotate ALL secrets immediately (treat as breach); scrub git history with `git filter-repo`; add `.env*` to `.gitignore` |
| App can't read Doppler secrets                          | Not running under `doppler run --` wrapper                   | Start app with `doppler run -- node server.js` (or whatever entry); verify `process.env.DATABASE_URL` is set            |
| AWS Secrets Manager throttling                          | App fetches secret on every request                          | Fetch once on startup; cache in memory; refresh every 5 min for rotation                                                |
| Vault lease expired, app can't renew                    | App didn't implement lease renewal                           | Use `vault-client` with auto-renew; or run `vault agent` sidecar that handles renewal                                   |
| New developer can't run app locally                     | No `.env.example`, or `.env.example` out of sync with schema | Auto-generate `.env.example` from schema in CI; fail CI if out of sync                                                  |
| Config validation error message unhelpful               | Schema doesn't have `.describe()` / docstrings               | Add descriptions to every field; pydantic: `Field(..., description="...")`; zod: `.describe("...")`                     |

## Self-Healing Loop

Every config incident (missing env var in prod, secret leak, rotation outage, validation gap) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: app_startup
  failure_class: missing_env_var_in_prod
  trigger: app crashed on first request with KeyError: 'STRIPE_WEBHOOK_SECRET'
  recovery: prod secret store missing the var; added it via Doppler; added startup self-check that logs all required vars
  rule_added: env-config sub-skill now requires CI step that validates prod secret store against schema (not just local .env)
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the prod-secret-store validation step.

For committed secrets specifically: if `scan-git-history` finds any secret pattern in git history, Phase 11 halts — committed secrets are a security incident requiring rotation + history scrubbing before any further deploy.

## Quality Gates (enforced before declaring "env config ready")

- [ ] No hardcoded secrets in source (grep for `password=`, `api_key=`, `secret=`, `sk_live_`, `sk_test_`, `AKIA`, `ghp_`, `gho_`)
- [ ] `.env` in `.gitignore` (and `.env.local`, `.env.*.local`)
- [ ] No `.env` files tracked in git (`git ls-files | grep -E '^\.env'` returns empty)
- [ ] `.env.example` committed and up to date with schema
- [ ] Schema validation on startup (fail fast with clear error naming the missing var)
- [ ] Startup self-check logs `✓ Config validated: N vars loaded` (without values)
- [ ] All secrets loaded via typed `config` object, never `process.env` directly in app code
- [ ] Secret store configured for staging+ (Doppler / Secrets Manager / Vault — not `.env` file on disk)
- [ ] Rotation schedule: 90 days for all secrets, dual-key overlap, audit log
- [ ] Sensitive fields typed as `SecretStr` (pydantic) or wrapped to prevent accidental logging
- [ ] CI validates `.env.example` against schema (auto-generated, fails if out of sync)
- [ ] CI scans git history for committed secrets (pre-commit + periodic)
- [ ] Tests cover: valid config loads, missing required var fails fast, invalid type fails fast, secret values not logged, dual-key rotation works

If any gate fails: status = `error`, do not proceed to Phase 9. Misconfigured secrets = outage or breach.

## Tools

- **zod** (TS) — schema validation with type inference. `z.object({...}).parse(process.env)` gives you typed config + runtime validation in one step.
- **pydantic-settings** (Python) — `BaseSettings` class with `.env` file support, type coercion, `SecretStr` for sensitive fields.
- **environ-config** (Python) — explicit, less magic than pydantic. Good for libraries.
- **convict** (Node) — JSON-schema-driven config with validation and default values.
- **dotenv** (`dotenv` npm / `python-dotenv` pip) — loads `.env` file into `process.env` for dev.
- **Doppler** (`doppler` CLI) — SaaS secret store. `doppler run --` injects at runtime. Best DX.
- **AWS Secrets Manager** (`boto3`) — AWS-native. Rotation support built-in. $0.40/secret/month.
- **AWS Parameter Store** — for non-sensitive config (free, integrates with Secrets Manager).
- **Google Secret Manager** — GCP-native equivalent of AWS Secrets Manager.
- **HashiCorp Vault** (`hvac` Python / `node-vault`) — enterprise. Dynamic secrets, audit log, lease renewal.
- **git filter-repo** — for scrubbing committed secrets from git history (replaces `git filter-branch`).
- **truffleHog / gitleaks** — secret scanners for git history. Run in CI to catch leaks before deploy.

## Permissions

- Filesystem: write to `src/config/`, `.env.example`, `.gitignore`
- Filesystem: NEVER write to `.env`, `.env.local` (those are user-owned, gitignored)
- Network: outbound HTTPS to secret store (`api.doppler.com`, `secretsmanager.*.amazonaws.com`, `vault.*`)
- Secrets: read from secret store / env; never log; never commit; never include in error reports
- Processes: may invoke `doppler`, `aws secretsmanager`, `vault` CLI for setup and rotation
- CI: adds steps for `.env.example` validation, git-history secret scanning, prod-secret-store validation

## Hard Rules

1. **Never commit `.env`.** Real secrets in git = security incident. `.env`, `.env.local`, `.env.*.local` must be in `.gitignore` from day one. If a secret was committed, rotate immediately and scrub history with `git filter-repo`.
2. **Never log secrets.** Use `SecretStr` (pydantic) or wrapped types that redact on `__repr__`. Grep log formatters for `password`, `secret`, `token`, `key` and redact. A logged secret is a leaked secret.
3. **Always validate config on startup.** Schema-parse `process.env` at boot. Fail fast with a clear error naming the missing/invalid var. The app must NOT start with invalid config — better to fail at boot than crash mid-request.
4. **Always have `.env.example` committed.** Every required var listed with a placeholder and a description. New developers run `cp .env.example .env.local` and fill in. Auto-generate from schema in CI; fail if out of sync.
5. **Never hardcode secrets in source.** No `API_KEY = "sk_live_abc123"` in code. All secrets via `config.stripe_api_key` (which reads from env / secret store). Grep the codebase for `sk_`, `AKIA`, `ghp_` — zero matches in source files.
6. **Always use a typed `config` object, never `process.env` directly.** Centralize access in `src/config/`. Direct `process.env.X` in app code bypasses validation and is a maintenance hazard. Lint rule: `no-restricted-syntax` banning `process.env` outside `src/config/`.
7. **Always rotate secrets on a schedule.** 90 days for DB passwords, API keys, JWT signing keys. Dual-key overlap (both old and new valid for 24h) so rotation never causes downtime. Audit log every access.
8. **Never use a `.env` file on disk in production.** Use a secret store (Doppler / Secrets Manager / Vault) that injects at runtime. Files on disk are readable by anyone with shell access; secret stores have audit logs and access control.
9. **Always scan git history for leaked secrets.** Run `truffleHog` or `gitleaks` in CI on every push. If a secret is found: halt the build, page on-call, rotate the secret, scrub history. Treat as a security incident.
10. **Always provide a default for non-sensitive config.** `LOG_LEVEL=info`, `APP_PORT=3000`, `NODE_ENV=development` — these have safe defaults. Required secrets (`DATABASE_URL`, `JWT_SECRET`) must NOT have defaults — they must fail fast if missing.
