# Secure API Design Specification

> Ibn Al-Azhar Docs — API security baseline and remediation plan.

## 1. Defaults

- **Deny by default** — every route requires authentication unless explicitly marked public.
- **Validate at boundary** — all inputs validated with Zod schemas; `.strip()` on every mutation schema.
- **Least privilege** — service accounts and API keys scoped to minimum required permissions.

## 2. Authentication Patterns

| Pattern              | Use when              | Stack implementation                                             |
| -------------------- | --------------------- | ---------------------------------------------------------------- |
| Session cookie (JWT) | Browser-first SPA     | `next-auth` with `httpOnly`, `secure`, `sameSite: "lax"` cookies |
| Bearer JWT           | SPA/mobile, stateless | Not currently used — reserved for future API consumers           |
| API key              | Machine-to-machine    | Not currently used — reserved for future integrations            |
| OAuth2/OIDC          | Third-party identity  | Google OAuth via NextAuth `GoogleProvider`                       |

### Current session strategy (`lib/auth.ts`)

- JWT with `AUTH_SECRET` (fails hard in production if missing)
- Cookie: `httpOnly: true`, `secure: true` (prod), `sameSite: "lax"`, `path: "/"`
- CSRF: relies on `sameSite: "lax"` — acceptable for SPA with `fetch()`
- Lockout: 5 failed attempts → 15-minute lockout

## 3. Authorization

- **Resource-level checks** close to data access — `ownedWhere()` adds `userId` filter for non-admins.
- **Admin bypass** — `isAdminRole()` checked in use-cases, not only route middleware.
- **No sequential IDs exposed** without ownership check.

### Guard functions (`lib/auth-guards.ts`)

| Function            | Behavior                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `withAuth()`        | Returns 401 JSON on failure — **correct for API routes**                                         |
| `requireAuth()`     | Returns session or **redirects** to login — **wrong for API routes** (returns 302, not 401 JSON) |
| `requireRole(role)` | Throws `ForbiddenError` on mismatch                                                              |
| `ownedWhere()`      | Admin bypasses ownership; non-admin adds `userId` filter                                         |

## 4. Contract-First (Public APIs)

- Define OpenAPI/JSON Schema **before** implementation when the API is shared.
- Version breaking changes; additive fields preferred.
- Stable error shape: `{ error: { code: string, message: string, details?: [] } }`.
- Pagination: cursor preferred for large sets; cap `limit`; document sort order.

### Error codes (`lib/constants.ts`)

All API errors use `ERROR_CODES` enum — machine-readable `code`, human `message`.

## 5. Input and Output

- **Reject unknown fields** — all mutation Zod schemas must use `.strip()`.
- **Normalize encoding** — limit string/array sizes.
- **Redact secrets in logs** — structured logging without raw tokens.

## 6. Secrets

- Never commit secrets; use env/secret manager.
- Separate dev/stage/prod credentials.
- Rotate on leak suspicion.

## 7. Rate Limiting

### Path-based rules (`lib/rate-limit.ts`)

| Path                             | Limit             |
| -------------------------------- | ----------------- |
| `/api/auth/register`             | 50 req/min per IP |
| `/api/auth/callback/credentials` | 50 req/min per IP |
| `/api/search`                    | 30 req/min per IP |
| `/api/export`                    | 10 req/min per IP |
| `/api/upload`                    | 20 req/min per IP |
| `/api/share`                     | 30 req/min per IP |

### User-based rules

| Action             | Limit  |
| ------------------ | ------ |
| `documents:create` | 30/min |
| `documents:delete` | 10/min |
| `documents:export` | 10/min |
| `tags:create`      | 20/min |
| `tags:merge`       | 5/min  |
| `share:regenerate` | 5/min  |
| `account:delete`   | 3/min  |
| `export:single`    | 10/min |
| `export:bulk`      | 3/min  |
| `admin:users`      | 30/min |

## 8. Audit Findings (2026-06-27)

### HIGH — Must fix

| #   | Finding                                                                                             | Remediation                                           | Status |
| --- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| H1  | Rate limits defined but never enforced: `/api/upload`, `/api/search`, `/api/export/batch`           | Add `checkRateLimit()` / `checkUserRateLimit()` calls | ✅     |
| H2  | No `.strip()` on any Zod mutation schema — unknown fields silently accepted                         | Add `.strip()` to all `z.object()` schemas            | ✅     |
| H3  | `requireAuth()` used in API routes (`stream`, `metrics`) — returns 302 redirect instead of 401 JSON | Replace with `withAuth()` wrapper                     | ✅     |

### MEDIUM — Should fix

| #   | Finding                                                      | Remediation                          | Status |
| --- | ------------------------------------------------------------ | ------------------------------------ | ------ |
| M1  | No rate limit on `DELETE /api/profile` (account deletion)    | Add `checkUserRateLimit()`           | ✅     |
| M2  | No rate limit on `POST /api/documents/[id]/share/regenerate` | Add `checkUserRateLimit()`           | ✅     |
| M3  | No rate limit on `POST /api/documents/[id]/export`           | Add `checkUserRateLimit()`           | ✅     |
| M4  | No rate limit on `/api/users` admin operations               | Add `checkUserRateLimit()`           | ✅     |
| M5  | No CSRF token validation (relies on sameSite)                | Documented risk — acceptable for SPA | ✅     |

### LOW — Nice to fix

| #   | Finding                                                                                             | Remediation                      | Status |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| L1  | No schema validation on query params in `documents`, `conversion/list`                              | Add Zod schemas for query params | ✅     |
| L2  | No validation on `q` param in `search/suggest`                                                      | Add `.max(200)` length limit     | ✅     |
| L3  | Duplicate endpoint: `/api/documents/[id]/share` DELETE vs `/api/documents/[id]/share/delete` DELETE | Remove duplicate                 | ✅     |
| L4  | Redundant bulk size check (zod + manual)                                                            | Remove manual check              | ✅     |
| L5  | In-memory SSE connection map not distributed-safe                                                   | Documented limitation            |        |
| L6  | Health/ready reads env vars (not exposed)                                                           | No action needed                 |        |

## 9. Implementation Checklist

- [x] Schema validation on all mutation inputs (Zod)
- [x] Auth required except explicit public routes (health, share/[token])
- [x] Authz enforced per resource (ownedWhere, isAdminRole)
- [x] Rate limits on login and expensive operations (configured)
- [x] Rate limits **enforced** on all configured routes
- [x] `.strip()` on all mutation schemas
- [x] `withAuth()` used in all API routes (no `requireAuth()` in API handlers)
- [ ] Security headers documented
- [ ] TLS termination documented

## 10. Related

- `api-security-testing` skill for verification before release
- `security-review` skill for code-level security audit
- `SECURITY.md` for project security policy
