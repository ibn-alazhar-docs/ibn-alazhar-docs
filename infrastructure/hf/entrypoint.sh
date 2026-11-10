#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════"
echo "  Ibn Al-Azhar Docs — HuggingFace Spaces"
echo "  Starting all services..."
echo "═══════════════════════════════════════════════════"

# Point Python calls to the venv with pypdfium2/cv2/PIL installed.
export SURYA_PYTHON_PATH="/opt/ocr-venv/bin/python3"

# ── Step 1: Storage driver resolution ─────────────────────
# MinIO server binaries are no longer distributed (dl.min.io 410, 2026-11-07),
# and the image no longer bundles them. Default to local storage on /data.
# STORAGE_DRIVER=s3 remains valid ONLY with S3_* pointing to a real remote
# endpoint (e.g. R2); a local S3 server is not available.
STORAGE_DRIVER="${STORAGE_DRIVER:-local}"
if [ "$STORAGE_DRIVER" = "local" ]; then
  echo "[1/5] Local filesystem storage enabled (STORAGE_DRIVER=local) — MinIO skipped"
else
  echo "[1/5] STORAGE_DRIVER=$STORAGE_DRIVER requested — ensure S3_* point to a real remote endpoint (no local MinIO in image)"
fi
MINIO_PID=""

# ── Step 2: Sync database schema ───────────────────────────────────────
echo "[2/5] Syncing database schema..."
cd /app

SCHEMA=packages/database/prisma/schema.prisma

# `migrate-with-lock.mjs` runs `prisma migrate deploy` as the primary,
# history-tracked path, but FIRST takes a Postgres advisory lock so two
# containers booting at once (rolling restart) cannot race and corrupt the
# migration history (P3009). It also recovers from a genuinely stuck
# incomplete migration and only ever uses `db push --accept-data-loss` as a
# documented last resort. See infrastructure/hf/migrate-with-lock.mjs.
node /app/migrate-with-lock.mjs || echo "[2/5] migration step reported issues; continuing boot"

# Drop orphaned triggers that reference columns dropped by `db push`.
# The searchvector trigger (trg_update_searchvector) fires on every INSERT and
# writes to NEW.searchvector — if db push dropped that column the trigger causes
# every document INSERT to fail. Safe to drop: the app's
# DocumentRepository.updateSearchVector() handles search indexing via raw SQL.
echo "[2/5] Cleaning up orphaned triggers..."
npx prisma db execute --schema="$SCHEMA" --stdin <<'SQL' 2>/dev/null || true
DROP TRIGGER IF EXISTS trg_update_searchvector ON documents;
DROP FUNCTION IF EXISTS update_searchvector();
SQL

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
