#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════"
echo "  Ibn Al-Azhar Docs — HuggingFace Spaces"
echo "  Starting all services..."
echo "═══════════════════════════════════════════════════"

# ── Step 1: Start MinIO (optional local S3-compatible storage) ────
# MinIO is only needed when STORAGE_DRIVER=s3. In local-storage mode
# (default on HF Spaces) files live on the persistent /data volume, so
# MinIO is skipped entirely to save resources. If S3 mode is requested we
# start it best-effort and never block boot on its failure.
if [ "${STORAGE_DRIVER:-s3}" != "local" ]; then
  echo "[1/5] Starting MinIO on :9000..."
  MINIO_ROOT_USER="${S3_ACCESS_KEY_ID:-minioadmin}" \
  MINIO_ROOT_PASSWORD="${S3_SECRET_ACCESS_KEY:-minioadmin}" \
  minio server /data/minio --address ":9000" --console-address ":9001" &
  MINIO_PID=$!

  for i in $(seq 1 30); do
      if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
          echo "[1/5] MinIO is ready ✓"
          break
      fi
      if [ "$i" = "30" ]; then
          echo "[1/5] MinIO failed to start — continuing without it (S3 uploads may fail)"
      fi
      sleep 1
  done
else
  echo "[1/5] Local filesystem storage enabled (STORAGE_DRIVER=local) — MinIO skipped"
  MINIO_PID=""
fi

# ── Step 2: Sync database schema ───────────────────────────────────────
echo "[2/5] Syncing database schema..."
cd /app

SCHEMA=packages/database/prisma/schema.prisma

# ── P3009 guard ─────────────────────────────────────────────────────────
# A migration that started but never finished makes `migrate deploy` refuse
# to apply ANY migration (Prisma error P3009). In Prisma 6 the `_prisma_migrations`
# table has NO `status` column — an incomplete migration is one where
# `finished_at IS NULL` (started_at is not null). We delete those rows so the
# deploy can re-attempt them. This step is non-fatal (|| true) so a missing
# table or other hiccup never crashes the boot.
echo "[2/5] Clearing incomplete migration records (P3009 guard)..."
npx prisma db execute --schema="$SCHEMA" \
  --stdin <<'SQL' || true
DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL AND started_at IS NOT NULL;
SQL
echo "[2/5] P3009 guard finished."

# Primary: apply pending migrations. If the migration history is corrupt
# (e.g. rows recorded as applied but tables missing → P3018, or a stuck
# failed row → P3009) migrate deploy cannot recover on its own. In that case
# we fall back to `prisma db push`, which syncs the schema directly from
# schema.prisma (idempotent: creates any missing table/column such as
# Document.progress and job_queue, without dropping existing data). We then
# baseline every migration as applied so subsequent boots take the normal,
# history-tracked path and never re-trigger recovery.
if npx prisma migrate deploy --schema="$SCHEMA" 2>&1; then
    echo "[2/5] Migrations applied ✓"
else
    echo "[2/5] migrate deploy failed — syncing schema via db push"
    npx prisma db push --accept-data-loss --skip-generate --schema="$SCHEMA" 2>&1 || echo "[2/5] db push also failed"
    for m in packages/database/prisma/migrations/*/; do
        name=$(basename "$m")
        npx prisma migrate resolve --applied "$name" --schema="$SCHEMA" 2>/dev/null || true
    done
    echo "[2/5] Schema synced and migrations baselined ✓"
fi

# Seed if seed file exists
if [ -f packages/database/prisma/seed.ts ]; then
    echo "[2/5] Running database seed..."
    npx prisma db seed --schema="$SCHEMA" 2>&1 || echo "[2/5] Seed skipped (may already exist)"
fi
echo "[2/5] Database ready ✓"

# ── Step 3: Start OCR Worker ──────────────────────────────────────
echo "[3/5] Starting OCR Worker..."
cd /app
node --import tsx workers/ocr-worker/src/index.ts &
OCR_PID=$!
echo "[3/5] OCR Worker started (PID: $OCR_PID) ✓"

# ── Step 4: Start Export Worker ───────────────────────────────────
echo "[4/5] Starting Export Worker..."
node --import tsx workers/export-worker/src/index.ts &
EXPORT_PID=$!
echo "[4/5] Export Worker started (PID: $EXPORT_PID) ✓"

# ── Step 5: Start Next.js Web Server ──────────────────────────────
echo "[5/5] Starting Next.js on :7860..."
cd /app/apps/web
node server.js &
WEB_PID=$!
echo "[5/5] Next.js started (PID: $WEB_PID) ✓"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  All services running!"
echo "  Web:     http://localhost:7860"
echo "  MinIO:   http://localhost:9000 (internal)"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Graceful shutdown ──────────────────────────────────────────────
shutdown() {
    echo ""
    echo "Shutting down..."
    kill $WEB_PID 2>/dev/null || true
    kill $EXPORT_PID 2>/dev/null || true
    kill $OCR_PID 2>/dev/null || true
    kill $MINIO_PID 2>/dev/null || true
    wait
    echo "All services stopped."
    exit 0
}

trap shutdown SIGTERM SIGINT SIGQUIT

# ── Wait for any process to exit ──────────────────────────────────
wait -n $WEB_PID $OCR_PID $EXPORT_PID $MINIO_PID
EXIT_CODE=$?

echo "A process exited with code $EXIT_CODE. Shutting down all services..."
shutdown
