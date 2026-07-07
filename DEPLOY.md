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

| Variable | Purpose |
|---|---|
| `DOMAIN` | Public domain (e.g. `ibnalazhardocs.com`) for ACME/HTTPS |
| `EMAIL` | ACME registration email |
| `DATABASE_URL` | Postgres/Neon connection string |
| `REDIS_URL` | Redis/Upstash connection string (BullMQ broker) |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | Object storage (R2/S3) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage credentials |
| `AUTH_SECRET` | Auth.js session secret |
| `ADMIN_PASSWORD` | Initial admin account password |
| `PROMETHEUS_BEARER_TOKEN` | Bearer token for Prometheus `/api/metrics/prometheus` scraping (must match scrape config) |
| `APP_URL` | Canonical app URL (e.g. `https://ibnalazhardocs.com`) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for sitemap/OG/canonical/email links |
| `SITE_URL` | Optional; defaults to `NEXT_PUBLIC_SITE_URL` |
| `GRAFANA_PASSWORD` | Grafana admin password |
| `POSTGRES_PASSWORD` / `REDIS_PASSWORD` | Required if running the bundled Postgres/Redis containers |

See `.env.production.example` for the full list (Cloudflare, Sentry, Resend,
OpenTelemetry, etc.).
