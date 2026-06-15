#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/ibn-al-azhar-docs/backups/minio}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/minio_${TIMESTAMP}.tar.gz"
BUCKET="${S3_BUCKET:-ibn-al-azhar-docs}"

mkdir -p "$BACKUP_DIR"

echo "📦 Starting MinIO backup..."
echo "   Endpoint: ${S3_ENDPOINT:-http://localhost:9000}"
echo "   Bucket: ${BUCKET}"
echo "   Output: ${BACKUP_FILE}"

# Use mc (MinIO Client) for backup
# Ensure mc is configured: mc alias set myminio ${S3_ENDPOINT} ${S3_ACCESS_KEY_ID} ${S3_SECRET_ACCESS_KEY}
mc mirror "myminio/${BUCKET}" "/tmp/minio-backup-${TIMESTAMP}/" 2>/dev/null || {
  echo "⚠️  mc not available, using AWS CLI fallback..."
  aws s3 sync "s3://${BUCKET}" "/tmp/minio-backup-${TIMESTAMP}/" \
    --endpoint-url "${S3_ENDPOINT:-http://localhost:9000}" \
    --no-progress
}

tar -czf "$BACKUP_FILE" -C /tmp "minio-backup-${TIMESTAMP}/"
rm -rf "/tmp/minio-backup-${TIMESTAMP}"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup completed: ${BACKUP_FILE} (${FILESIZE})"

# Cleanup old backups
echo "🧹 Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
REMAINING=$(find "$BACKUP_DIR" -name "minio_*.tar.gz" | wc -l)
echo "📋 Remaining backups: ${REMAINING}"

echo "✅ MinIO backup finished"
