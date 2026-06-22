# STAGING_SETUP.md

## Overview

Staging is a **complete mirror** of production with separate infrastructure.
No data, secrets, or network paths are shared.

| Component  | Production          | Staging                     |
| ---------- | ------------------- | --------------------------- |
| PostgreSQL | `ibn_docs` @ 5433   | `ibn_staging` @ 5434        |
| PgBouncer  | 6432                | 6433                        |
| Redis      | 6379                | 6380                        |
| MinIO      | 9000/9001           | 9002/9003                   |
| Web        | 3000                | 3001                        |
| Caddy      | 80/443              | 8080/8443                   |
| Bucket     | `ibn-al-azhar-docs` | `ibn-al-azhar-docs-staging` |
| Domain     | `ibnalazhar.app`    | `staging.ibnalazhar.app`    |

## Setup

### 1. Create environment file

```bash
cp .env.staging.example .env.staging
```

### 2. Generate secrets

```bash
# Generate all secrets at once
echo "STAGING_POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "STAGING_REDIS_PASSWORD=$(openssl rand -base64 32)"
echo "STAGING_MINIO_ACCESS_KEY=$(openssl rand -hex 16)"
echo "STAGING_MINIO_SECRET_KEY=$(openssl rand -base64 32)"
echo "STAGING_AUTH_SECRET=$(openssl rand -base64 64)"
echo "STAGING_ADMIN_PASSWORD=$(openssl rand -base64 24)"
```

Replace the `CHANGE_ME_*` values in `.env.staging` with the generated values.

### 3. Deploy

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

### 4. Verify

```bash
# Check all services are healthy
docker compose -f docker-compose.staging.yml ps

# Verify health endpoint
curl http://localhost:3001/api/health

# Verify readiness
curl http://localhost:3001/api/health/ready
```

## Deployment Workflow

```
Developer → Push to feat/* branch
         → CI runs: format + lint + typecheck + test + build
         → If CI passes: auto-deploy to staging
         → QA verifies on staging.ibnalazhar.app
         → If approved: merge to main → deploy to production
```

## Staging vs Production Differences

| Aspect                | Production                      | Staging                            |
| --------------------- | ------------------------------- | ---------------------------------- |
| Resource limits       | Full (2C/1G web)                | Reduced (1C/512M)                  |
| Backup scheduling     | Daily via Ofelia                | Disabled                           |
| Monitoring            | Prometheus + Grafana + cAdvisor | Disabled                           |
| PgBouncer pool        | 25 connections, 200 max         | 15 connections, 100 max            |
| Backend network       | Not internal (yet)              | `internal: true`                   |
| db-migrate dependency | Commented out                   | **Enabled** (waits for completion) |
| APP_NAME              | Ibn Al-Azhar Docs               | Ibn Al-Azhar Docs (Staging)        |

## Teardown

```bash
# Stop all services
docker compose -f docker-compose.staging.yml down

# Remove all data volumes (DESTRUCTIVE)
docker compose -f docker-compose.staging.yml down -v
```

## Troubleshooting

| Issue                         | Fix                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Port conflict with production | Change port in `.env.staging`                                                                                    |
| Migration fails               | Check `db-migrate` logs: `docker compose -f docker-compose.staging.yml logs db-migrate`                          |
| Web can't connect to DB       | Verify PgBouncer is healthy: `docker compose -f docker-compose.staging.yml ps pgbouncer`                         |
| Worker not processing         | Check Redis: `docker compose -f docker-compose.staging.yml exec redis redis-cli -a $STAGING_REDIS_PASSWORD ping` |
