#!/usr/bin/env bash
# =============================================================================
# Ibn Al-Azhar Docs - container entrypoint (self-contained FREE deployment)
# Starts PostgreSQL + Redis + MinIO inside the container, runs migrations and
# seeding, then hands off to supervisord (web + workers).
# All data lives under /data (the Hugging Face persistent volume).
# =============================================================================
set -u

# ---- Persistent directories -------------------------------------------------
mkdir -p "$PGDATA" "$REDIS_DATA" "$MINIO_DATA" "$APP_DATA"

# Self-contained flag so the pipeline config can default Redis safely if the
# env is ever lost (see packages/pipeline/src/config.ts). Lives on /data so it
# persists across container restarts.
touch /data/.self-contained 2>/dev/null || true

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

# For local storage, also disable S3 endpoint to prevent confusion
if [ "$STORAGE_DRIVER" = "local" ]; then
  export S3_ENDPOINT=""
  export MINIO_ENDPOINT=""
fi

# ---- Local storage directory initialization ---------------------------------
# Ensure the root storage directory exists with correct ownership and write
# permissions before any subdirectories are created. This prevents ENOENT errors
# during file uploads when the container starts with no pre-existing /data volume.
if [ "$STORAGE_DRIVER" = "local" ]; then
  echo "[entrypoint] local filesystem storage enabled (STORAGE_DRIVER=${STORAGE_DRIVER})"
  echo "[entrypoint] ensuring storage directory exists: $STORAGE_LOCAL_DIR"
  
  # Create root storage directory with proper ownership
  if [ ! -d "$STORAGE_LOCAL_DIR" ]; then
    mkdir -p "$STORAGE_LOCAL_DIR"
    if [ "$(id -u)" = "0" ]; then
      chown 1000:1000 "$STORAGE_LOCAL_DIR"
    fi
    chmod 755 "$STORAGE_LOCAL_DIR"
  fi
  
  # Verify write permissions with a test file
  if ! touch "$STORAGE_LOCAL_DIR/.write-test" 2>/dev/null || ! rm "$STORAGE_LOCAL_DIR/.write-test" 2>/dev/null; then
    echo "[entrypoint] ERROR: Storage directory $STORAGE_LOCAL_DIR is not writable"
    exit 1
  fi
  
  # Create subdirectories synchronously with error checking
  mkdir -p "$STORAGE_LOCAL_DIR/uploads" "$STORAGE_LOCAL_DIR/exports" \
           "$STORAGE_LOCAL_DIR/ocr-text" "$STORAGE_LOCAL_DIR/tmp" || {
    echo "[entrypoint] ERROR: Failed to create storage subdirectories"
    exit 1
  }

  # The app runs as uid 1000 on Hugging Face, but this entrypoint may run as
  # root. When it does, the subdirectories above are created owned by root with
  # 755 perms, which blocks the app (uid 1000) from writing upload/temp files
  # into them (EACCES -> "failed to prepare file"). Re-assign ownership to 1000:1000 so
  # the runtime user can write, and keep the temp dir world-writable.
  if [ "$(id -u)" = "0" ]; then
    chown -R 1000:1000 "$STORAGE_LOCAL_DIR"
  fi
  chmod -R 755 "$STORAGE_LOCAL_DIR"
  chmod 777 "$STORAGE_LOCAL_DIR/tmp"

  echo "[entrypoint] storage directory verified: $STORAGE_LOCAL_DIR"
fi

# ---- OCR engine ------------------------------------------------------------
# The bundled image only ships the local Tesseract engine. Surya/cloud engines
# require heavy model downloads or API keys and are not installed here, so force
# the local engine and point the Python helper at the bundled OCR venv.
export OCR_PROVIDER="${OCR_PROVIDER:-tesseract}"
export OCR_CLOUD_ENABLED="${OCR_CLOUD_ENABLED:-false}"
export SURYA_PYTHON_PATH="${SURYA_PYTHON_PATH:-/opt/ocr-venv/bin/python}"

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
# Respect externally-provided connection strings (e.g. Neon + Upstash) so the
# self-contained container can also run against managed services. We only fall
# back to the in-container Postgres/Redis (127.0.0.1) when nothing is configured.
export DATABASE_URL="${DATABASE_URL:-postgresql://ibn_docs:postgres@127.0.0.1:5432/ibn_docs?schema=public}"
export DATABASE_URL_DIRECT="${DATABASE_URL_DIRECT:-$DATABASE_URL}"
export REDIS_URL="${REDIS_URL:-redis://:${REDIS_PASSWORD}@127.0.0.1:6379}"
S3_ENDPOINT="http://127.0.0.1:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="$MINIO_ACCESS_KEY"
S3_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY"

# Decide whether to start the bundled Postgres/Redis daemons. We only start them
# when the configured URL actually points at the local container; otherwise we
# assume an external service (Neon / Upstash / compose service) is reachable.
case "$DATABASE_URL" in
  *127.0.0.1:5432*|*localhost:5432*|*0.0.0.0:5432*) USE_LOCAL_PG=1 ;;
  *) USE_LOCAL_PG=0 ;;
esac
case "$REDIS_URL" in
  *127.0.0.1:6379*|*localhost:6379*|*0.0.0.0:6379*) USE_LOCAL_REDIS=1 ;;
  *) USE_LOCAL_REDIS=0 ;;
esac

# In pg queue mode the driver does NOT use Redis at all, so never start the
# bundled Redis daemon internally - even if REDIS_URL happens to point locally.
export QUEUE_DRIVER="${QUEUE_DRIVER:-redis}"
if [ "$QUEUE_DRIVER" = "pg" ]; then
  USE_LOCAL_REDIS=0
fi

export DATABASE_URL DATABASE_URL_DIRECT REDIS_URL S3_ENDPOINT S3_REGION S3_BUCKET \
       S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY \
       AUTH_SECRET AUTH_TRUST_HOST=true AUTH_URL="$APP_URL" NEXTAUTH_URL="$APP_URL" APP_URL NEXT_PUBLIC_SITE_URL SITE_URL \
       ADMIN_EMAIL ADMIN_PASSWORD PROMETHEUS_BEARER_TOKEN NODE_ENV=production \
       NEXT_TELEMETRY_DISABLED=1 PORT=7860 HOSTNAME=0.0.0.0 QUEUE_DRIVER

PG_BIN="$(ls -d /usr/lib/postgresql/*/bin | head -1)"
PGPORT=5432
PGHOST=127.0.0.1

# ---- 1) PostgreSQL -----------------------------------------------------------
# Only start the bundled PostgreSQL when the configured DATABASE_URL points at
# the local container (self-contained mode). With an external database (Neon,
# RDS, compose service, ...) we assume it is already reachable.
if [ "$USE_LOCAL_PG" = "1" ]; then
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
else
  echo "[entrypoint] skipping bundled PostgreSQL (using external DATABASE_URL)"
fi

# ---- 2) Redis ---------------------------------------------------------------
# Only start the bundled Redis when REDIS_URL points at the local container.
if [ "$USE_LOCAL_REDIS" = "1" ]; then
  echo "[entrypoint] starting Redis..."
  redis-server --port 6379 --requirepass "$REDIS_PASSWORD" --dir "$REDIS_DATA" --daemonize yes --save 60 1 >/dev/null 2>&1
  for i in $(seq 1 30); do
    if redis-cli -p 6379 -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then break; fi
    sleep 1
  done
else
  echo "[entrypoint] skipping bundled Redis (using external REDIS_URL)"
fi

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
  echo "[entrypoint] MinIO skipped (local filesystem storage initialized earlier)"
fi

# ---- 4) Database migrations + seed -----------------------------------------
# Do not auto-migrate in production unless explicitly requested. In non-prod
# environments the schema is applied automatically on boot for local dev.
if [ "$NODE_ENV" = "production" ] && [ "${MIGRATE_ON_BOOT:-0}" != "1" ]; then
  echo "[entrypoint] skipping automatic migrations in production (set MIGRATE_ON_BOOT=1 to opt in)"
else
  echo "[entrypoint] applying database migrations..."
  if ! prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma 2>&1 | tail -5; then
    echo "[entrypoint] migrate deploy failed - falling back to prisma db push"
    prisma db push --schema=/app/packages/database/prisma/schema.prisma --accept-data-loss 2>&1 | tail -5 || true
  fi
fi
echo "[entrypoint] seeding database (idempotent)..."
node --import tsx /app/packages/database/prisma/seed.ts 2>&1 | tail -10 || true

# ---- 5) Hand off to supervisord (web + workers) -----------------------------
echo "[entrypoint] starting application (web + workers) via supervisord..."
exec "$@"
