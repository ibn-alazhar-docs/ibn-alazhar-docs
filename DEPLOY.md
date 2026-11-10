# Deploy — Ibn Al-Azhar Docs

A concise guide to the supported **global-scale, production** deployment path.

## Architecture

```
Cloudflare (CDN + edge TLS)
        │  cache /_next/static, images, public/ ; proxy / and /api/*
        ▼
   Caddy (reverse proxy, internal)  ──►  web  (Next.js, replicated)
                                              │
        BullMQ ──► Redis ◄── ocr-worker  (Node container)
                    │        export-worker (Node container)
                    ▼
              Postgres (managed Neon or container)
              Object storage: Cloudflare R2 / S3 (or MinIO container)
```

## Recommended path: Docker Compose (self-host) + Cloudflare

1. **Container host** runs `infrastructure/docker/docker-compose.prod.yml`:
   `web`, `ocr-worker`, `export-worker`, Postgres, Redis, MinIO, Caddy, and the
   monitoring stack (Loki/Promtail/Prometheus/Alertmanager/Grafana).
2. **Cloudflare** sits in front as a CDN: terminates TLS at the edge (Origin =
   Strict), caches static assets, and proxies dynamic traffic to Caddy.
3. **Object storage** uses Cloudflare R2 (or S3) via the `S3_*` env vars — set
   these and you can drop the `minio` service.

### Workers are not serverless

`ocr-worker` and `export-worker` are **BullMQ Node consumers** — long-lived
processes that hold Redis connections. They **must run in a container host**
and **cannot run on Cloudflare Workers**. Keep them in the Compose deployment.

## Run it

```bash
# 1. Provide production env (see required vars below)
cp .env.production.example .env.production   # then fill values

# 2. Launch the production stack
docker compose -f infrastructure/docker/docker-compose.prod.yml --env-file .env.production up -d
```

Set `DOMAIN` and a real `EMAIL` for Caddy/ACME. For the Cloudflare DNS-01
challenge, build Caddy with the `caddy-dns/cloudflare` module and set
`CF_DNS_API_TOKEN`.

## Required environment variables

| Variable                                    | Purpose                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `DOMAIN`                                    | Public domain (e.g. `ibnalazhardocs.com`) for ACME/HTTPS                                  |
| `EMAIL`                                     | ACME registration email                                                                   |
| `DATABASE_URL`                              | Postgres/Neon connection string                                                           |
| `REDIS_URL`                                 | Redis/Upstash connection string (BullMQ broker)                                           |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET`   | Object storage (R2/S3)                                                                    |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage credentials                                                                |
| `AUTH_SECRET`                               | Auth.js session secret                                                                    |
| `ADMIN_PASSWORD`                            | Initial admin account password                                                            |
| `PROMETHEUS_BEARER_TOKEN`                   | Bearer token for Prometheus `/api/metrics/prometheus` scraping (must match scrape config) |
| `APP_URL`                                   | Canonical app URL (e.g. `https://ibnalazhardocs.com`)                                     |
| `NEXT_PUBLIC_SITE_URL`                      | Public site URL used for sitemap/OG/canonical/email links                                 |
| `SITE_URL`                                  | Optional; defaults to `NEXT_PUBLIC_SITE_URL`                                              |
| `GRAFANA_PASSWORD`                          | Grafana admin password                                                                    |
| `POSTGRES_PASSWORD` / `REDIS_PASSWORD`      | Required if running the bundled Postgres/Redis containers                                 |

See `.env.production.example` for the full list (Cloudflare, Sentry, Resend,
OpenTelemetry, etc.).

---

## Free, self-contained deployment — Hugging Face Spaces (Docker SDK)

This path runs the **entire stack inside a single container** (PostgreSQL +
Redis + MinIO + `web` + `ocr-worker` + `export-worker`) so the project goes live
**for free with zero external services**. It uses `Dockerfile.space` +
`supervisord.conf` + `scripts/docker-entrypoint.sh`.

### 1. Create the Space

- New Space → SDK: **Docker**.
- Set the Dockerfile path to: `Dockerfile.space`.
- Set **App port**: `7860`.
- Enable **Persistent Storage** (so the database, Redis, and uploads survive
  restarts — the container stores everything under `/data`).

### 2. Set Space secrets (Settings → Secrets)

Only **`AUTH_SECRET`** is mandatory. Everything else has safe in-container
defaults (override only if you want custom credentials).

| Secret             | Required | Default if omitted     | Purpose                                                |
| ------------------ | -------- | ---------------------- | ------------------------------------------------------ |
| `AUTH_SECRET`      | ✅       | —                      | Auth.js session signing key (use a long random string) |
| `ADMIN_PASSWORD`   | ❌       | `AdminPassword123!`    | Initial admin account password                         |
| `ADMIN_EMAIL`      | ❌       | `admin@ibnalazhar.app` | Admin account email                                    |
| `REDIS_PASSWORD`   | ❌       | `ibn_docs_redis`       | Internal Redis password                                |
| `MINIO_ACCESS_KEY` | ❌       | `minioadmin`           | Internal object-storage key                            |
| `MINIO_SECRET_KEY` | ❌       | `minioadmin`           | Internal object-storage secret                         |
| `S3_BUCKET`        | ❌       | `ibnalazhardocs`       | Object-storage bucket name                             |

> The public URL is auto-detected from the Space host (`SPACE_HOST`); no manual
> `APP_URL` is needed.

### 3. Done

Hugging Face builds the image and starts it. The health endpoint
`/api/health` becomes green once Postgres/Redis/MinIO are up (usually < 60s).
Log in with the admin email/password above.

### Notes / limits

- This is the **free** option: a single container with shared CPU/RAM. For
  production scale, use the Docker Compose path above (managed Neon + Upstash
  - R2 + multiple web replicas).
- OCR/export run inside the same container; heavy concurrent jobs share
  resources.
- To push directly from this repo, set `HF_TOKEN` and run:
  `huggingface-cli upload <your-org>/<space-name> . --repo-type space`
  (after creating the Space). Provide the token and it can be done for you.
