# Northflank Deployment Configuration

This project is configured for **free deployment on Northflank** (generous free tier).

## 🚀 Quick Deploy

1. **Create Northflank account**: https://northflank.com (free tier: 2 services, 2 GB RAM, 10 GB storage)
2. **Create new project**: "ibn-al-azhar-docs"
3. **Add services**:
   - **PostgreSQL** (managed, free)
   - **Redis** (managed, free)
   - **S3-compatible storage**: Use Cloudflare R2 (free 10 GB) or MinIO
4. **Add Web Service** (Docker):
   - Repository: `ibn-alazhar-docs/ibn-al-azhar-docs`
   - Dockerfile: `Dockerfile`
   - Port: 3000
   - Build context: `.`
5. **Add Worker Service** (Docker):
   - Repository: `ibn-alazhar-docs/ibn-al-azhar-docs`
   - Dockerfile: `Dockerfile.worker`
   - Target: `ocr-runner`
   - Scale: 1 replica
6. **Add Export Worker Service** (Docker):
   - Dockerfile: `Dockerfile.worker`
   - Target: `export-runner`
   - Scale: 1 replica

## 🔐 Required Environment Variables

| Variable                  | Description                  | Example                                    |
| ------------------------- | ---------------------------- | ------------------------------------------ |
| `DATABASE_URL`            | PostgreSQL connection string | `postgresql://user:pass@host:5432/db`      |
| `REDIS_URL`               | Redis connection string      | `redis://:pass@host:6379`                  |
| `S3_ENDPOINT`             | R2/MinIO endpoint            | `https://account.r2.cloudflarestorage.com` |
| `S3_REGION`               | Region                       | `auto`                                     |
| `S3_BUCKET`               | Bucket name                  | `ibn-al-azhar-docs`                        |
| `S3_ACCESS_KEY_ID`        | R2 access key                | `...`                                      |
| `S3_SECRET_ACCESS_KEY`    | R2 secret                    | `...`                                      |
| `AUTH_SECRET`             | 32+ char random string       | `openssl rand -hex 32`                     |
| `ADMIN_PASSWORD`          | Initial admin password       | `StrongPass123!`                           |
| `APP_URL`                 | Public URL                   | `https://your-app.northflank.app`          |
| `NEXT_PUBLIC_SITE_URL`    | Same as APP_URL              | `https://your-app.northflank.app`          |
| `PROMETHEUS_BEARER_TOKEN` | Metrics token                | `random-token`                             |

## 🔄 Auto-Deploy

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) auto-deploys on push to `main` when you add:

- `NORTHFLANK_API_TOKEN` (from Northflank Account → API Tokens)
- Or `RAILWAY_TOKEN` (from Railway Account → Tokens)

## 🛠 Manual Deploy Commands

```bash
# Build locally
pnpm build

# Deploy via Northflank CLI
northflank service deploy --project ibn-al-azhar-docs --service web

# Deploy via Railway CLI
railway up --service web
```

## 📊 Monitoring

- **Health**: `https://your-app.northflank.app/api/health`
- **Metrics**: `https://your-app.northflank.app/api/metrics/prometheus`
- **Logs**: Northflank dashboard → Service → Logs

## 💰 Cost

**Free tier** covers:

- 2 services (web + worker) with 512 MB RAM each
- 1 PostgreSQL (1 GB)
- 1 Redis (256 MB)
- 10 GB storage
- 100 GB bandwidth/month

Perfect for development and low-traffic production.
