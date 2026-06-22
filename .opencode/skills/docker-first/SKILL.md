---
name: docker-first
description: Docker-first development workflow rules
---

## What I Do

Enforce Docker-first local development practices.

## When to Use Me

- Setting up development environment
- Modifying Docker files
- Reviewing infrastructure code
- Onboarding new developers

## Rules

### Local Development

- All services run via `docker compose -f docker-compose.dev.yml`
- No local service installations required
- Services: PostgreSQL, Redis, MinIO

### Commands

- `./ibn.sh dev-infra` — Start infrastructure (Postgres, Redis, MinIO)
- `./ibn.sh start` — Full Docker stack (web + workers + infra)
- `docker compose -f docker-compose.dev.yml down` — Stop infrastructure
- `docker compose -f docker-compose.dev.yml logs -f` — View logs

### Dockerfile Standards

- Multi-stage builds
- Minimal base images (alpine)
- Non-root users in production
- Health checks on all services
- Explicit version tags (no `latest`)

### Environment Variables

- All env vars documented in `.env.example`
- No secrets in compose files
- Use Docker secrets for production

### Service Naming

- Prefix: `ibn-` (e.g., `ibn-postgres`, `ibn-redis`)
- Clear, descriptive names
