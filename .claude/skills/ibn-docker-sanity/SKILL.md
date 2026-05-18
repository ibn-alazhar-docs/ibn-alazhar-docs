---
name: ibn-docker-sanity
description: Use this skill when creating or reviewing Dockerfiles, compose files, env vars, services, workers, databases, Redis, MinIO, Caddy, or deployment docs.
---

# Ibn Al-Azhar Docs Docker Sanity Skill

Review Docker-first local development.

## Expected services

- web
- worker
- postgres
- redis
- minio
- caddy optional
- mailpit optional

## Checks

1. compose.yaml exists or is planned.
2. compose.dev.yaml exists or is planned.
3. Dockerfile and Dockerfile.worker are separated if needed.
4. .env.example contains no secrets.
5. DATABASE_URL uses service name postgres.
6. REDIS_URL uses service name redis.
7. S3 endpoint uses minio service.
8. Volumes are explicit.
9. Healthchecks are considered.
10. Production and dev configs are separated.

## Output

Return:
- Docker readiness
- Missing files
- Risky config
- Exact commands to test
