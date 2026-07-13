#!/usr/bin/env bash
# =============================================================================
# Ibn Al-Azhar Docs — container entrypoint (self-contained FREE deployment)
# Starts PostgreSQL + Redis + MinIO inside the container, runs migrations and
# seeding, then hands off to supervisord (web + workers).
# All data lives under /data (the Hugging Face persistent volume).
# =============================================================================
set -u

# ---- Persistent directories -------------------------------------------------
mkdir -p "$PGDATA" "$REDIS_DATA" "$MINIO_DATA" "$APP_DATA"

# ---- Credentials (defaults keep the container runnable without secrets) -----
REDIS_PASSWORD="${REDIS_PASSWORD:-ibn_docs_redis}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
S3_BUCKET="${S3_BUCKET:-ibnalazhardocs}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ibnalazhar.app}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-AdminPassword123!}"
AUTH_SECRET="${AUTH_SECRET:-change-me-in-hf-secrets-please-0000000000}"
PROMETHEUS_BEARER_TOKEN="${PROMETHEUS_BEARER_TOKEN:-hf-internal-metrics}"

# ---- Storage backend -----------------------------------------------------
# Default to local filesystem storage on the persistent /data volume. This
# removes the in-container MinIO dependency (single-container Spaces) and is
# the most reliable option for Hugging Face. Set STORAGE_DRIVER=s3 to use the
# bundled MinIO server instead.
export STORAGE_DRIVER="${STORAGE_DRIVER:-local}"
export STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/data}"

# ---- Public URL (auto-detect on Hugging Face) -------------------------------
if [ -n "${SPACE_HOST:-}" ]; then
  APP_URL="https://${SPACE_HOST}"
elif [ -n "${APP_URL:-}" ]; then
  APP_URL="$APP_URL"
else
  APP_URL="http://localhost:7860"
fi
NEXT_PUBLIC_SITE_URL="$APP_URL"
SITE_URL="$APP_URL"

# ---- Internal connection strings (everything is in-container) --------------
DATABASE_URL="postgresql://ibn_docs:postgres@127.0.0.1:5432/ibn_docs?schema=public"
REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379"
S3_ENDPOINT="http://127.0.0.1:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="$MINIO_ACCESS_KEY"
S3_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY"

export DATABASE_URL DATABASE_URL_DIRECT="$DATABASE_URL" REDIS_URL S3_ENDPOINT S3_REGION S3_BUCKET \
       S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY \
       AUTH_SECRET AUTH_TRUST_HOST=true AUTH_URL="$APP_URL" NEXTAUTH_URL="$APP_URL" APP_URL NEXT_PUBLIC_SITE_URL SITE_URL \
       ADMIN_EMAIL ADMIN_PASSWORD PROMETHEUS_BEARER_TOKEN NODE_ENV=production \
       NEXT_TELEMETRY_DISABLED=1 PORT=7860 HOSTNAME=0.0.0.0

PG_BIN="$(ls -d /usr/lib/postgresql/*/bin | head -1)"
PGPORT=5432
PGHOST=127.0.0.1

# ---- 1) PostgreSQL -----------------------------------------------------------
# Hugging Face runs containers as user 1000. PostgreSQL cannot be run as root.
# If we are root, we drop privileges to the postgres user.
# If we are already a non-root user, we run postgres directly.
RUN_PG=""
if [ "$(id -u)" = "0" ]; then
  chown -R postgres:postgres "$PGDATA"
  RUN_PG="su postgres -c"
else
  RUN_PG="eval"
fi

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[entrypoint] initializing PostgreSQL data directory..."
  rm -rf "$PGDATA"/* "$PGDATA"/.* 2>/dev/null || true
  $RUN_PG "$PG_BIN/initdb -D $PGDATA --auth=trust" >/dev/null 2>&1
fi
echo "[entrypoint] starting PostgreSQL..."
$RUN_PG "$PG_BIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k /tmp -c listen_addresses=127.0.0.1' -l /tmp/pg.log start" >/dev/null 2>&1 || true

# Wait for Postgres
for i in $(seq 1 30); do
  if $RUN_PG "$PG_BIN/pg_isready -h $PGHOST -p $PGPORT" >/dev/null 2>&1; then break; fi
  sleep 1
done

# Create role + database idempotently
$RUN_PG "$PG_BIN/psql -h $PGHOST -p $PGPORT -tc \"SELECT 1 FROM pg_roles WHERE rolname='ibn_docs'\" | grep -q 1 || $PG_BIN/psql -h $PGHOST -p $PGPORT -c \"CREATE ROLE ibn_docs LOGIN PASSWORD 'postgres';\"" 2>/dev/null || true
$RUN_PG "$PG_BIN/psql -h $PGHOST -p $PGPORT -tc \"SELECT 1 FROM pg_database WHERE datname='ibn_docs'\" | grep -q 1 || $PG_BIN/psql -h $PGHOST -p $PGPORT -c \"CREATE DATABASE ibn_docs OWNER ibn_docs;\"" 2>/dev/null || true

# ---- 2) Redis ---------------------------------------------------------------
echo "[entrypoint] starting Redis..."
redis-server --port 6379 --requirepass "$REDIS_PASSWORD" --dir "$REDIS_DATA" --daemonize yes --save 60 1 >/dev/null 2>&1
for i in $(seq 1 30); do
  if redis-cli -p 6379 -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then break; fi
  sleep 1
done

# ---- 3) MinIO (S3-compatible object storage) --------------------------------
# Only started when STORAGE_DRIVER=s3. In local-storage mode (default on HF
# Spaces) files live on the persistent /data volume, so MinIO is skipped.
if [ "$STORAGE_DRIVER" = "s3" ]; then
  echo "[entrypoint] starting MinIO (STORAGE_DRIVER=s3)..."
  minio server "$MINIO_DATA" --address 127.0.0.1:9000 --console-address 127.0.0.1:9001 >"$APP_DATA/minio.log" 2>&1 &
  for i in $(seq 1 60); do
    if curl -fsS http://127.0.0.1:9000/minio/health/live >/dev/null 2>&1; then break; fi
    sleep 1
  done
  mc alias set local http://127.0.0.1:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1
  mc mb -p "local/$S3_BUCKET" >/dev/null 2>&1 || true
else
  echo "[entrypoint] local filesystem storage enabled (STORAGE_DRIVER=${STORAGE_DRIVER}) — MinIO skipped"
  mkdir -p "$STORAGE_LOCAL_DIR/uploads" "$STORAGE_LOCAL_DIR/exports" "$STORAGE_LOCAL_DIR/ocr-text" "$STORAGE_LOCAL_DIR/tmp"
fi

# ---- 4) Database migrations + seed -----------------------------------------
echo "[entrypoint] applying database migrations..."
if ! prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma 2>&1 | tail -5; then
  echo "[entrypoint] migrate deploy failed — falling back to prisma db push"
  prisma db push --schema=/app/packages/database/prisma/schema.prisma --accept-data-loss 2>&1 | tail -5 || true
fi
echo "[entrypoint] seeding database (idempotent)..."
node --import tsx /app/packages/database/prisma/seed.ts 2>&1 | tail -10 || true

# ---- 5) Hand off to supervisord (web + workers) -----------------------------
echo "[entrypoint] starting application (web + workers) via supervisord..."
exec "$@"
