---
name: auth-setup
description: "Implement authentication for a project — JWT, OAuth2/OIDC, Auth0/Clerk/Supabase Auth, session cookies, password hashing (bcrypt/argon2id), MFA, RBAC middleware. Triggers in Phase 6 EXECUTE when adding auth, fixing insecure auth, or migrating between auth models. Owns login/signup/logout/password-reset/MFA/session-refresh so other sub-skills only consume the authenticated request."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# Authentication Setup

> Backend sub-skill for the trust boundary of any application that has users. Picks the auth strategy (managed vs custom vs SSO), wires login/signup/logout/password-reset/MFA/refresh, and emits a `verify_request` middleware that downstream sub-skills (`rate-limiting`, `payment-setup`, `api-contract`) call to resolve the caller identity.

## When to Use

| Phase                | Trigger                                                                                                                      | Why                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Phase 2 — AUDIT      | Dimension 4 (Security): no auth, broken auth, or insecure auth (MD5 passwords, JWT in localStorage, plaintext tokens logged) | Phase must halt — auth is a release blocker            |
| Phase 6 — EXECUTE    | User says "add login", "add OAuth", "fix authentication", "add MFA", "add roles"                                             | This is the executing sub-skill                        |
| Phase 6 — EXECUTE    | Migrating session → JWT, JWT → Auth0, Firebase → Supabase Auth                                                               | Strategy migration, run full replace                   |
| Phase 9 — ACCEPTANCE | Login/signup/reset flows must be walked end-to-end                                                                           | Coordinates with `browser-launcher` + `flow-simulator` |
| Phase 11 — ROLLOUT   | Smoke-test auth on staging (token lifetime, cookie flags, redirect URLs)                                                     | Catches environment-specific config drift              |

**Do NOT use this sub-skill directly for:** API rate limiting per user (use `rate-limiting` — it consumes the `user_id` from this sub-skill's middleware), CSRF token issuance (handled here as part of cookie auth but coordinated by `owasp-security`), or SSO provider configuration UI (provider-specific dashboard).

## What It Does

1. Picks an auth strategy via the Decision Tree (managed vs custom vs SSO).
2. Installs the chosen library/SDK and wires environment variables.
3. Implements the core flows:
   - **Signup**: validate input → check email uniqueness → hash password (argon2id preferred, bcrypt cost ≥ 12 fallback) → persist user → issue session/token.
   - **Login**: lookup user → verify password (constant-time compare) → check account state (active/locked/MFA-required) → issue tokens.
   - **Logout**: invalidate refresh token (rotation list) → clear cookie → revoke access token if stateful.
   - **Password reset**: issue signed reset token (TTL ≤ 15 min, single-use) → email link → verify → rehash new password → invalidate all sessions.
   - **Email verification**: signed token, TTL 24h, single-use.
   - **MFA (TOTP)**: generate secret → QR code → verify first code → require on subsequent logins; backup codes single-use.
   - **Session refresh**: short-lived access token (15 min) + long-lived refresh token (7-30 days) with rotation; rotating refresh token is single-use, replay = revoke all.
4. Emits a `verify_request` middleware (per framework: Express, Fastify, FastAPI, Django, Next.js middleware) that returns `{user_id, roles, scopes}` or 401.
5. Wires RBAC: `require_role("admin")`, `require_scope("orders:write")` decorators/middleware.
6. Writes `auth-config.ts` / `auth-config.py` with all env-driven constants.

## Integration Contract

```
INPUT:
  - strategy_hint: managed|custom-jwt|session-cookie|sso (optional — otherwise decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - user_store: supabase|postgres|prisma|sqlite|external (default: detected)
  - providers: list of {type: google|github|okta|azure-ad, client_id, client_secret_env}
  - mfa_required: bool (default false; auto-enable for admin roles)
  - cookie_domain: string (optional)
  - access_token_ttl_min: int (default 15)
  - refresh_token_ttl_days: int (default 14)
  - public_routes: list (default: ["/health", "/login", "/signup", "/reset-password"])

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "strategy": "auth0|clerk|supabase-auth|custom-jwt|session-cookie|sso-oidc",
    "files_created": [
      "src/auth/config.{ts,py}",
      "src/auth/middleware.{ts,py}",
      "src/auth/flows.{ts,py}",
      "src/auth/rbac.{ts,py}"
    ],
    "env_required": [
      "JWT_SECRET (min 32 chars)",
      "REFRESH_TOKEN_SECRET (min 32 chars)",
      "AUTH0_DOMAIN (if applicable)"
    ],
    "middleware_export": "verify_request",
    "rbac_helpers": ["require_role", "require_scope"],
    "test_coverage": {
      "login": "ok",
      "signup": "ok",
      "reset": "ok",
      "mfa": "ok",
      "rbac_deny": "ok"
    },
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes auth module under src/auth/
  - Adds required env vars to .env.example (NEVER to .env — secrets stay out of git)
  - Adds migration for users/sessions/refresh_tokens tables if custom strategy
  - Registers middleware in the framework's entry point
```

## CLI

```bash
# Autonomous: pick strategy, scaffold everything, wire middleware
python3 scripts/auth_agent.py setup \
  --framework fastapi \
  --user-store supabase \
  --mfa-required \
  --public-routes /health,/login,/signup

# Explicit strategy (overrides decision tree)
python3 scripts/auth_agent.py setup \
  --framework express \
  --strategy custom-jwt \
  --access-ttl-min 15 \
  --refresh-ttl-days 14

# Add OAuth provider to an existing setup
python3 scripts/auth_agent.py add-provider \
  --provider github \
  --client-id-env GITHUB_CLIENT_ID \
  --client-secret-env GITHUB_CLIENT_SECRET

# Verify existing auth implementation against Hard Rules
python3 scripts/auth_agent.py audit --path src/auth/

# Rotate JWT secret (zero-downtime: accept both for grace period)
python3 scripts/auth_agent.py rotate-secret \
  --old-env JWT_SECRET \
  --new-env JWT_SECRET_NEW \
  --grace-hours 24
```

## Decision Tree (autonomous)

```
Q1: What kind of app?
  B2C SaaS (consumer-facing, fast ship)
    → Auth0 OR Clerk (managed — social login, MFA, magic link out of the box)
       Pick Auth0 if: enterprise SSO likely later (SAML add-on)
       Pick Clerk if: React/Next.js frontend, want prebuilt <SignIn/> components
  B2B (tenants, custom roles, audit logs)
    → Supabase Auth OR custom JWT (Postgres RLS integration)
       Pick Supabase Auth if: already on Supabase — uses RLS, zero glue
       Pick custom JWT if: need DB-level control, Postgres not on Supabase
  Internal tool (employees only)
    → SSO via OAuth2/OIDC (Okta, Azure AD, Google Workspace)
       NEVER build custom password auth for internal tools — IT policy compliance
  Mobile app (iOS/Android)
    → OAuth2 + PKCE (authorization code flow with PKCE)
       NEVER implicit flow — deprecated, insecure
       NEVER store access tokens in localStorage (use secure storage / Keychain)
  API-only (machine-to-machine)
    → API keys (hashed at rest) + optional JWT for short-lived user tokens

Q2: Stateless vs stateful?
  Stateless (JWT)
    → Use when: microservices, horizontal scale, no shared session store
    → Trade-off: cannot revoke before expiry without denylist
  Stateful (session cookie + Redis store)
    → Use when: single monolith, want instant revoke, < 1ms lookup
    → Trade-off: Redis dependency

Q3: MFA?
  Admin / finance / PII access → MFA required (TOTP via authlib or otplib)
  Regular users → MFA optional, prompted at login
  SMS MFA → NEVER (SIM-swap attacks) — TOTP or WebAuthn only
```

## Patterns (mandatory)

| Concern                | Pattern                                           | Why                                                             |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| Token storage (SPA)    | httpOnly + Secure + SameSite=Lax cookie           | XSS cannot read, CSRF needs SameSite                            |
| Token storage (mobile) | OS keychain (iOS Keychain, Android Keystore)      | localStorage on webview is XSS-exposed                          |
| Password hashing       | argon2id (preferred), bcrypt cost ≥ 12 (fallback) | OWASP-recommended; MD5/SHA1 = Critical                          |
| Password reset         | Signed token, TTL 15 min, single-use              | Prevents replay; rotated on use                                 |
| Refresh tokens         | Rotation + reuse detection                        | Stolen token = immediate revoke chain                           |
| Login throttling       | 5 attempts / minute / IP + 3 / minute / email     | Delegates enforcement to `rate-limiting`                        |
| JWT secret             | ≥ 32 chars random, from env var, never in code    | `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
| Session ID             | 256-bit CSPRNG, server-side store                 | `secrets.token_urlsafe(32)`                                     |
| OAuth state param      | Random per-request, validated on callback         | Prevents CSRF on OAuth flow                                     |
| Password rules         | Min 12 chars, check against HIBP k-anonymity API  | Length over complexity; breach check                            |

## Failure Modes & Recovery

| Symptom                              | Cause                                                | Recovery                                                                    |
| ------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `argon2 package fails to build`      | Missing `libffi-dev` / build tools                   | `apt-get install libffi-dev build-essential` then `pip install argon2-cffi` |
| `JWT signature invalid after deploy` | Secret rotation done hard-cutover                    | Roll back to old secret, then re-run `rotate-secret` with 24h grace         |
| `Refresh token replay detected`      | Stolen refresh token being reused                    | Revoke entire token family for that user; force re-login; alert user        |
| `OAuth callback ERR_REDIRECT_URI`    | Staging vs prod URL not registered with provider     | Add exact callback URL to provider dashboard; never use wildcard            |
| `Cookie not sent on cross-origin`    | Missing `SameSite=None; Secure` for legit cross-site | Only enable for explicit cross-site flows; always pair with Secure          |
| `MFA lockout (lost device)`          | User lost TOTP device                                | Backup codes (single-use) → if exhausted, admin reset with identity proof   |
| `Session fixation after login`       | Session ID not rotated post-login                    | Rotate session ID immediately after successful credential check             |
| `Login throttling false-positives`   | Shared office NAT, one IP many users                 | Throttle per (IP + email), not IP alone; CAPTCHA after 5 fails              |

## Self-Healing Loop

Every auth-related incident (failed login storm, MFA lockout, token replay) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: login
  failure_class: brute_force_lockout
  trigger: 47 failed attempts from 1 IP in 90s
  recovery: rate-limit increased 5→10/min/IP for /login, CAPTCHA threshold lowered to 3 fails
  rule_added: rate-limiting sub-skill now auto-tightens /login on anomaly signal
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that pre-tightens thresholds for high-risk routes (login, signup, reset, MFA verify).

## Quality Gates (enforced before declaring "auth ready")

- [ ] No plaintext password anywhere in the repo (grep for `password = "`, `pass ==`, etc.)
- [ ] No MD5/SHA1 password hashing (grep for `hashlib.md5`, `sha1`)
- [ ] JWT secret ≥ 32 chars and from env var
- [ ] Access token TTL ≤ 60 minutes
- [ ] Refresh token TTL ≤ 30 days with rotation
- [ ] Login endpoint rate-limited (delegated to `rate-limiting`)
- [ ] All auth cookies carry `httpOnly`, `Secure`, `SameSite=Lax` (or `Strict`)
- [ ] MFA implemented and required for admin roles (if `mfa_required=true`)
- [ ] Password reset token is single-use and TTL ≤ 15 min
- [ ] RBAC middleware tested with positive AND negative cases
- [ ] Logout invalidates refresh tokens server-side (not just clears cookie)
- [ ] `.env.example` lists all required secrets; `.env` is gitignored
- [ ] Tests cover: signup, login, logout, reset, refresh, MFA, RBAC deny, expired token, invalid token

If any gate fails: status = `error`, do not proceed to Phase 9. Route the failure to `debug-entry` with the failing gate name.

## Tools

- **argon2-cffi** (Python) / **argon2** (Node) — preferred password hashing (OWASP-recommended).
- **bcrypt** (Python `bcrypt`, Node `bcryptjs`) — fallback if argon2 unavailable; cost factor ≥ 12.
- **PyJWT** / **jsonwebtoken** (Node) — JWT encode/decode. Always pin major version.
- **authlib** — OAuth2/OIDC client + TOTP MFA (Python). Most complete library.
- **Auth0 SDK** (`@auth0/nextjs-auth0`, `auth0-python`) — when strategy = auth0.
- **Clerk SDK** (`@clerk/nextjs`, `clerk-backend-api`) — when strategy = clerk.
- **Supabase Auth** (`@supabase/supabase-js`, `supabase-py`) — when strategy = supabase-auth.
- **otplib** / **pyotp** — TOTP MFA code generation/verification.
- **qrcode** — QR generation for TOTP enrollment.
- **haveibeenpwned** API (k-anonymity) — breach password check at signup.

## Permissions

- Filesystem: write to `src/auth/`, `.env.example`, migrations directory
- Network: outbound to OAuth providers, SMTP for reset emails (via `email-setup`), HIBP API
- Secrets: read only from env vars or secret manager (AWS SSM, Vault) — never from disk
- Processes: may invoke `npm install` / `pip install` for auth libraries

## Hard Rules

1. **Never store passwords in plaintext.** Always argon2id (preferred) or bcrypt cost ≥ 12. MD5/SHA1/unsalted hashes are Critical-severity bugs and block the release.
2. **Never log tokens, passwords, or refresh tokens.** Log redactors must scrub `Authorization` headers, `password` fields, and `token` keys from every log line. A leaked log = a leaked account.
3. **Never store tokens in localStorage or sessionStorage in a browser SPA.** Use httpOnly + Secure + SameSite cookies. localStorage is XSS-readable; one vulnerable npm package = total account takeover.
4. **Always hash with bcrypt or argon2 — never MD5/SHA1/unsalted SHA256.** Salts must be per-user and stored alongside the hash. Use the library's built-in salt handling, do not roll your own.
5. **Always serve auth over HTTPS in any non-dev environment.** HSTS header on production. Cookies without Secure on HTTP are silently downgraded to plaintext on the wire.
6. **Always rate-limit auth endpoints** (`/login`, `/signup`, `/reset-password`, `/mfa/verify`) — delegate to `rate-limiting`. Without this, brute force is unrestricted.
7. **Always rotate the session ID after a successful login** to prevent session fixation. Never reuse the pre-login session ID.
8. **Never use the OAuth implicit flow** (`response_type=token`). Use authorization code + PKCE (`response_type=code`, `code_challenge`). Implicit flow leaks tokens in the URL fragment to browser history and referrers.
9. **Always verify the OAuth `state` parameter** on the callback — it's the CSRF defense for OAuth. Missing state check = account takeover via forced OAuth initiation.
10. **Never hardcode secrets in source.** All secrets (`JWT_SECRET`, OAuth client secrets, refresh-token signing keys) come from env vars or a secret manager. `.env` is gitignored; `.env.example` documents the names without values.
