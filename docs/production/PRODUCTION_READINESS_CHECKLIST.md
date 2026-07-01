# Production Readiness Checklist

Last updated: 2026-07-01

## Status: PASS (with noted gaps)

---

## 1. Build & Type Safety

| Check                                | Status | Evidence                                                  |
| ------------------------------------ | ------ | --------------------------------------------------------- |
| TypeScript compiles with zero errors | PASS   | `pnpm typecheck` — 4 workspaces, 0 errors                 |
| ESLint passes with zero warnings     | PASS   | `rtk lint` — 0 issues                                     |
| All unit tests pass                  | PASS   | 776/776 tests pass                                        |
| No `any` types in production code    | WARN   | 3 unsafe `as unknown as` casts in UserRepository (CQ-001) |
| No `console.log` in production code  | PASS   | Only `console.error` in client error handlers             |
| Prisma client generated              | PASS   | `prisma generate` runs in build                           |

## 2. Security

| Check                                             | Status | Evidence                                                      |
| ------------------------------------------------- | ------ | ------------------------------------------------------------- |
| CSRF protection on state-changing routes          | PASS   | Origin/referer validation in middleware                       |
| Rate limiting on all API routes                   | PASS   | Default 100/min catch-all + specific limits per endpoint      |
| User-based rate limits on authenticated endpoints | PASS   | Upload, search use `checkUserRateLimit`                       |
| CSP headers configured                            | PASS   | Middleware + next.config.ts headers                           |
| Security headers on API routes                    | PASS   | X-Content-Type-Options, X-Frame-Options, Referrer-Policy      |
| No internal error messages leaked                 | PASS   | `getErrorMessage()` returns `INTERNAL_ERROR` for non-AppError |
| Password hashing (bcrypt cost 12)                 | PASS   | `lib/backend/auth.ts`                                         |
| Account lockout after failed attempts             | PASS   | Configurable thresholds in `auth.ts`                          |
| Audit logging on auth events                      | PASS   | Login success/failure/lockout/register                        |
| Audit logging on document operations              | PASS   | Create, update, delete, move                                  |
| Input validation (Zod) on all endpoints           | PASS   | All routes use schema validation                              |
| Soft delete for documents, folders, tags          | PASS   | `deletedAt` pattern with `ownedWhere` filter                  |
| No hardcoded secrets in source                    | PASS   | All from env vars                                             |
| Docker runs non-root (UID 1000)                   | PASS   | HF Dockerfile USER directive                                  |

## 3. Authentication & Authorization

| Check                                     | Status | Evidence                                   |
| ----------------------------------------- | ------ | ------------------------------------------ |
| NextAuth v5 with JWT strategy             | PASS   | `lib/backend/auth.ts`                      |
| Google OAuth configured                   | PASS   | Google provider in NextAuth config         |
| Credentials provider with lockout         | PASS   | Email/password + failed attempt tracking   |
| Role-based access (ADMIN/TEACHER/STUDENT) | PASS   | `domain/auth.ts` + `core/authorization.ts` |
| Ownership-based data access               | PASS   | `ownedWhere()` helper in all use-cases     |
| Admin-only routes protected               | PASS   | `withAdminAuth` guard on user management   |
| Session validation on protected routes    | PASS   | Middleware redirects unauthenticated users |

## 4. Database

| Check                                | Status | Evidence                                                          |
| ------------------------------------ | ------ | ----------------------------------------------------------------- |
| Prisma schema matches migrations     | PASS   | `prisma migrate status` clean                                     |
| Composite indexes on hot queries     | PASS   | `userId + deletedAt + createdAt` on Document                      |
| No N+1 queries in repositories       | WARN   | `exportByFolder` recursive calls (PERF-004)                       |
| Soft delete implemented consistently | WARN   | `findFirst` base methods don't enforce `deletedAt: null` (DB-003) |
| Connection pooling configured        | PASS   | PgBouncer in docker-compose, `connection_limit` in URL            |
| Migration rollback strategy          | PASS   | Prisma migrate with documented rollback in RUNBOOK                |

## 5. API Routes

| Check                               | Status | Evidence                                                  |
| ----------------------------------- | ------ | --------------------------------------------------------- |
| All routes have error handling      | PASS   | `handleRouteError` wrapper on all routes                  |
| Consistent error response format    | PASS   | `{ error: { code, message, requestId } }`                 |
| Cache-Control headers on responses  | PASS   | Middleware defaults + route-specific overrides            |
| Request ID tracing                  | PASS   | `x-request-id` header generated per request               |
| Zod validation on all inputs        | PASS   | All POST/PATCH routes validate body                       |
| No direct Prisma access from routes | WARN   | Export route queries Account table directly (BACKEND-009) |

## 6. Frontend

| Check                                   | Status | Evidence                                                          |
| --------------------------------------- | ------ | ----------------------------------------------------------------- |
| RTL layout support                      | PASS   | Tailwind RTL plugin, logical CSS properties                       |
| Arabic-first translations               | PASS   | `next-intl` with `ar` as default locale                           |
| Brand colors correct (#16A34A, #CA8A04) | WARN   | Some hardcoded Tailwind colors in error/conversions pages (F4-01) |
| Font Cairo loaded                       | PASS   | Google Fonts in root layout                                       |
| Toast notifications (sonner)            | PASS   | Arabic defaults configured                                        |
| Loading states                          | PASS   | Loading spinners on all route groups                              |
| Error boundaries                        | PASS   | `error.tsx` in each route group                                   |

## 7. Performance

| Check                            | Status         | Evidence                                                      |
| -------------------------------- | -------------- | ------------------------------------------------------------- |
| Image optimization (AVIF + WebP) | PASS           | `next.config.ts` formats configured                           |
| Image cache TTL (24h)            | PASS           | `minimumCacheTTL: 86400`                                      |
| Standalone output                | PASS           | `output: "standalone"` in next.config                         |
| React strict mode                | PASS           | `reactStrictMode: true`                                       |
| Bundle analyzer                  | NOT CONFIGURED | No `@next/bundle-analyzer`                                    |
| Server Components ratio          | WARN           | 58 `"use client"` components, some could be Server (PERF-007) |

## 8. Docker & Deployment

| Check                                | Status | Evidence                                                    |
| ------------------------------------ | ------ | ----------------------------------------------------------- |
| Multi-stage Docker build             | PASS   | Builder + runner stages in Dockerfile                       |
| Health check in Dockerfile           | PASS   | `HEALTHCHECK` directive                                     |
| Graceful shutdown                    | PASS   | `entrypoint.sh` trap for SIGTERM                            |
| Container resource limits            | PASS   | CPU/memory limits in docker-compose                         |
| MinIO health check                   | PASS   | Docker compose healthcheck                                  |
| Redis health check                   | PASS   | Docker compose healthcheck with `redis-cli ping`            |
| PostgreSQL health check              | PASS   | Docker compose healthcheck with `pg_isready`                |
| No `latest` tag in production deploy | WARN   | Deploy workflow uses both `sha-*` and `latest` (DEVOPS-010) |

## 9. Observability

| Check                                     | Status         | Evidence                                                   |
| ----------------------------------------- | -------------- | ---------------------------------------------------------- |
| Sentry configured (client/server/edge)    | PASS           | 3 config files, 10% tracesSampleRate                       |
| Structured logging (pino)                 | PASS           | JSON output with ISO timestamps                            |
| Health endpoints (/health, /live, /ready) | PASS           | Liveness + readiness probes                                |
| Metrics endpoint                          | PASS           | `/api/metrics` with DB + queue stats                       |
| Sentry release tracking                   | NOT CONFIGURED | No `release` option in Sentry config (O-002)               |
| Prometheus-format metrics                 | NOT CONFIGURED | `/api/metrics` returns JSON, not exposition format (O-010) |
| Distributed tracing                       | NOT CONFIGURED | No OpenTelemetry SDK (O-013)                               |
| Log aggregation                           | NOT CONFIGURED | Logs to stdout only, no remote shipping (O-005)            |
| Alerting rules                            | NOT CONFIGURED | No Prometheus alerting or notification channels (O-012)    |

## 10. Testing

| Check                          | Status     | Evidence                                      |
| ------------------------------ | ---------- | --------------------------------------------- |
| Unit tests pass                | PASS       | 776/776                                       |
| CI runs unit tests             | PASS       | `ci.yml` test job                             |
| Security tests exist           | PASS       | `tests/security/` with OWASP coverage         |
| CI runs security tests         | NOT WIRED  | `test:security` not in CI workflow (TEST-003) |
| E2E tests exist                | PASS       | `tests/e2e/webapp-smoke.test.ts`              |
| CI runs E2E tests              | NOT WIRED  | No Playwright step in CI (TEST-004)           |
| Integration tests exist        | PASS       | `tests/integration/`                          |
| CI runs integration tests      | NOT WIRED  | No `test:integration` job in CI (TEST-001)    |
| Visual regression tests        | NOT EXISTS | No screenshot comparison tests (TEST-007)     |
| Accessibility tests (axe-core) | NOT EXISTS | No automated a11y audits (TEST-008)           |

## 11. Documentation

| Check                                | Status | Evidence                                     |
| ------------------------------------ | ------ | -------------------------------------------- |
| README with setup instructions       | PASS   | Comprehensive README.md                      |
| Architecture diagram                 | PASS   | `docs/ARCHITECTURE.md` with Mermaid diagrams |
| ADRs (Architecture Decision Records) | PASS   | 24 ADRs in `docs/ADR/`                       |
| Runbook for incidents                | PASS   | `docs/production/RUNBOOK.md`                 |
| API documentation (OpenAPI)          | PASS   | `docs/openapi.yaml`                          |
| Contributing guide                   | PASS   | `CONTRIBUTING.md`                            |
| Code style guide                     | PASS   | `CODE_STYLE.md`                              |
| Deployment guide                     | PASS   | `docs/deployment/HF_DEPLOYMENT_GUIDE.md`     |

---

## Gaps Summary

### Must Fix Before Production (Critical)

None — all critical items are resolved.

### Should Fix Before Production (High)

1. **Sentry release tracking** — Cannot correlate errors to deployments
2. **CI: Security tests** — Security regressions ship undetected
3. **CI: E2E tests** — User-facing flow regressions undetected
4. **CI: Integration tests** — Backend logic regressions undetected

### Nice to Have (Medium)

1. Prometheus-format metrics endpoint
2. OpenTelemetry distributed tracing
3. Log aggregation (Grafana Loki)
4. Alerting rules + notification channels
5. Bundle analyzer
6. Convert eligible Server Components
7. Fix `findFirst` soft-delete enforcement
8. Fix `exportByFolder` N+1 queries

### Accepted Risks (Low)

1. 3 unsafe type casts in UserRepository
2. Some hardcoded Tailwind colors in non-core pages
3. 58 client components (could reduce)
4. No visual regression testing
5. No accessibility automated testing
