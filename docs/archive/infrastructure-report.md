# Production Infrastructure Report — Ibn Al-Azhar Docs

**Date**: 2026-07-04  
**Pipeline**: Layer 5 — Production Infrastructure & CI/CD

---

## Executive Summary

| Component         | Status                                                                          |
| ----------------- | ------------------------------------------------------------------------------- |
| Dockerfile        | ✅ Multi-stage, optimized, health checks                                        |
| Docker Compose    | ✅ 8 services, security hardened                                                |
| CI Pipeline       | ✅ 10 jobs (format → lint → typecheck → test → e2e → build → security → deploy) |
| Health Checks     | ✅ DB, Redis, MinIO, Web, Workers                                               |
| Security Scanning | ✅ Trivy (filesystem, image, config)                                            |
| Deployment        | ✅ GHCR + Docker Buildx + GHA cache                                             |

---

## 1. Docker Architecture

### Dockerfile (Multi-stage)

| Stage     | Purpose                | Base Image     |
| --------- | ---------------------- | -------------- |
| `builder` | Build Next.js + Prisma | `node:22-slim` |
| `runner`  | Production runtime     | `node:22-slim` |

**Optimizations**:

- `pnpm install --frozen-lockfile` for reproducible builds
- `next build` with `SENTRY_RELEASE` and `OTEL_ENABLED` ARGs
- `bcryptjs` manually copied (Next.js standalone tracing misses it)
- Non-root user (`nextjs:nodejs`, UID 1001)
- `HEALTHCHECK` on `/api/health/ready`

### Docker Compose Services (8 services)

| Service         | Image                            | Health Check              | Resource Limits |
| --------------- | -------------------------------- | ------------------------- | --------------- |
| `caddy`         | `caddy:2-alpine`                 | —                         | 0.5 CPU, 128M   |
| `postgres`      | `postgres:16-alpine`             | `pg_isready`              | 1.0 CPU, 512M   |
| `pgbouncer`     | `edoburu/pgbouncer:v1.23.1-p3`   | `pg_isready`              | 0.5 CPU, 128M   |
| `redis`         | `redis:7-alpine`                 | `redis-cli ping`          | 1.0 CPU, 256M   |
| `minio`         | `minio/minio:RELEASE.2025-09-07` | `curl /minio/health/live` | 2.0 CPU, 1G     |
| `web`           | Built from `Dockerfile`          | `wget /api/health`        | 2.0 CPU, 1G     |
| `ocr-worker`    | Built from `Dockerfile.worker`   | `kill -0 1`               | 2.0 CPU, 1G     |
| `export-worker` | Built from `Dockerfile.worker`   | `kill -0 1`               | 1.0 CPU, 512M   |

### Security Hardening

| Measure             | Status                      |
| ------------------- | --------------------------- |
| `cap_drop: ALL`     | ✅ All services             |
| `no-new-privileges` | ✅ All services             |
| `read_only: true`   | ✅ Web service              |
| `tmpfs: /tmp`       | ✅ Web + workers            |
| Internal network    | ✅ Backend network isolated |
| Port binding        | ✅ All bound to `127.0.0.1` |

### Backup Automation

| Schedule  | Service    | Command                  |
| --------- | ---------- | ------------------------ |
| `@daily`  | PostgreSQL | `backup-job.sh postgres` |
| `@weekly` | PostgreSQL | `backup-job.sh verify`   |
| `@daily`  | MinIO      | `backup-job.sh minio`    |

---

## 2. CI/CD Pipeline

**File**: `.github/workflows/ci.yml` (407 lines)

### Pipeline Flow

```
format ─┐
lint   ─┤
typecheck ─┼─→ test ─┬─→ smoke ──┐
        │          └─→ e2e ──────┤
        └─→ integration ─────────┤
                                 ├─→ build ──→ security ──→ deploy
```

### Jobs (10 total)

| Job           | Dependencies            | What It Does                                     |
| ------------- | ----------------------- | ------------------------------------------------ |
| `format`      | —                       | Prettier check                                   |
| `lint`        | —                       | ESLint check                                     |
| `typecheck`   | —                       | TypeScript check (4 workspaces)                  |
| `test`        | —                       | Unit tests (776) + Security tests                |
| `smoke`       | test                    | Pre-deploy smoke test                            |
| `e2e`         | test                    | Playwright (accessibility, visual regression)    |
| `integration` | format, lint, typecheck | Integration tests (133)                          |
| `build`       | All above               | Next.js build + bundle size check + Docker build |
| `security`    | build                   | Trivy vulnerability scanning                     |
| `deploy`      | security                | GHCR push + deployment webhook                   |

### Bundle Size Gate

```yaml
MAX_KB=51200  # 50MB limit
if [ "$TOTAL_KB" -gt "$MAX_KB" ]; then
  echo "::error::Bundle size ${TOTAL_KB}KB exceeds ${MAX_KB}KB limit"
  exit 1
fi
```

### Security Scanning (Trivy)

| Scan Type    | Target         | Severity Gate                          |
| ------------ | -------------- | -------------------------------------- |
| Filesystem   | Entire repo    | CRITICAL, HIGH                         |
| Docker image | `ibn-web-scan` | CRITICAL, HIGH                         |
| Config       | IaC files      | MEDIUM, HIGH, CRITICAL (informational) |

### Deployment

| Step     | Details                              |
| -------- | ------------------------------------ |
| Registry | GitHub Container Registry (GHCR)     |
| Images   | `web`, `ocr-worker`, `export-worker` |
| Tagging  | `latest` + git SHA                   |
| Caching  | GitHub Actions cache (`type=gha`)    |
| Webhook  | Optional deployment trigger          |

---

## 3. Health Checks

### Application Health Endpoints

| Endpoint               | What It Checks                           |
| ---------------------- | ---------------------------------------- |
| `/api/health`          | DB, Redis, MinIO, memory, workers        |
| `/api/health/live`     | Liveness (uptime)                        |
| `/api/health/ready`    | Readiness (Postgres, Redis TCP, storage) |
| `/api/actuator/health` | DB, disk space, memory (UP/DOWN)         |

### Docker Health Checks

| Service       | Interval | Timeout | Retries | Start Period |
| ------------- | -------- | ------- | ------- | ------------ |
| postgres      | 5s       | 5s      | 5       | —            |
| pgbouncer     | 15s      | 5s      | 3       | 10s          |
| redis         | 5s       | 5s      | 5       | —            |
| minio         | 10s      | 10s     | 5       | —            |
| web           | 15s      | 5s      | 3       | 30s          |
| ocr-worker    | 15s      | 5s      | 3       | 30s          |
| export-worker | 15s      | 5s      | 3       | 30s          |

---

## 4. Environment Configuration

### Required Secrets

| Secret                        | Used By               |
| ----------------------------- | --------------------- |
| `POSTGRES_PASSWORD`           | All services          |
| `REDIS_PASSWORD`              | Redis, web, workers   |
| `MINIO_ACCESS_KEY`            | MinIO, web            |
| `MINIO_SECRET_KEY`            | MinIO, web            |
| `AUTH_SECRET`                 | Web (NextAuth)        |
| `SENTRY_DSN`                  | Web (optional)        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Web (tracing)         |
| `DEPLOY_WEBHOOK_URL`          | Deploy job (optional) |

### Network Architecture

```
Internet → Caddy (80/443) → Web (3000)
                                    ↓
                              ┌─────┴─────┐
                              │  Backend   │
                              │ (internal) │
                              ├───────────┤
                              │ PostgreSQL │
                              │ PgBouncer  │
                              │ Redis      │
                              │ MinIO      │
                              │ Workers    │
                              └───────────┘
```

---

## 5. Recommendations

### Already Done ✅

- Multi-stage Docker build
- Non-root container user
- Health checks on all services
- Security hardening (cap_drop, no-new-privileges, read_only)
- CI pipeline with 10 jobs
- Trivy vulnerability scanning
- Bundle size gate
- Automated backups (Ofelia scheduler)

### Optional Enhancements

1. **Staging environment**: `docker-compose.staging.yml` exists — consider deploying to staging before production
2. **Canary deployments**: Add canary step before full deploy
3. **Monitoring**: `docker-compose.monitoring.yml` exists — consider activating Prometheus/Grafana
4. **Log aggregation**: Add Loki or ELK for centralized logging
5. **Secret rotation**: Implement automated secret rotation policy

---

_Report generated by Layer 5 Production Infrastructure pipeline — 2026-07-04_
