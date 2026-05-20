# Policy: Security Baseline

> **File:** `policies/security-baseline.md`
> **Status:** Active
> **Enforced by:** Security-reviewer agent

---

## Purpose

Define the minimum security requirements for all code changes.

## Rules

1. **No secrets in code.** All secrets must be in environment variables.
2. **Input validation.** All user input must be validated (Zod).
3. **Output encoding.** All output must be encoded to prevent XSS.
4. **Auth checks.** All protected routes must check authentication.
5. **Rate limiting.** All public endpoints must have rate limiting.
6. **SQL injection prevention.** Use Prisma parameterized queries.
7. **XSS prevention.** Strict CSP + output encoding.
8. **CSRF prevention.** NextAuth.js built-in CSRF tokens.
9. **File upload validation.** MIME type + file signature + size limits.
10. **Share link security.** Crypto-random tokens (32 bytes), expiry enforcement.
11. **HttpOnly cookies.** Auth tokens in HttpOnly cookies only.
12. **HTTPS enforced.** All traffic over HTTPS in production.
13. **Security headers.** X-Content-Type-Options, X-Frame-Options, etc.

## Enforcement

- Security-reviewer reviews all code changes.
- Security violations block merge.
- Secret detection triggers immediate rotation.
- Security baseline is documented in `docs/08_SECURITY_PRIVACY.md`.

## Violations

| Violation | Severity | Action |
|-----------|----------|--------|
| Secret in code | Critical | Block merge, rotate secret |
| No input validation | High | Block merge, add validation |
| No auth check | High | Block merge, add auth check |
| Missing security header | Medium | Fix in same PR |
| No rate limiting | Medium | Add rate limiting |

## Reference

- `docs/08_SECURITY_PRIVACY.md`
- `docs/ADR/ADR-010-security-baseline.md`
- `AI_OPERATING_RULES.md` (Rule 11)
