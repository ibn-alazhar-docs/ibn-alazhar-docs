#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/ibn-al-azhar-docs/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

case "${1:-}" in
  postgres)
    echo "📦 Starting PostgreSQL backup..."
    mkdir -p "${BACKUP_DIR}/postgres"
    BACKUP_FILE="${BACKUP_DIR}/postgres/ibn_docs_${TIMESTAMP}.sql.gz"
    pg_dump "${DATABASE_URL}" --clean --if-exists | gzip > "$BACKUP_FILE"
    FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ PostgreSQL backup: ${BACKUP_FILE} (${FILESIZE})"
    find "${BACKUP_DIR}/postgres" -name "ibn_docs_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
    ;;

  minio)
    echo "📦 Starting MinIO backup..."
    mkdir -p "${BACKUP_DIR}/minio"
    BACKUP_FILE="${BACKUP_DIR}/minio/minio_${TIMESTAMP}.tar.gz"
    mc mirror "myminio/${S3_BUCKET:-ibn-al-azhar-docs}" "/tmp/minio-backup-${TIMESTAMP}/" 2>/dev/null || \
      aws s3 sync "s3://${S3_BUCKET:-ibn-al-azhar-docs}" "/tmp/minio-backup-${TIMESTAMP}/" \
        --endpoint-url "${S3_ENDPOINT:-http://minio:9000}" --no-progress
    tar -czf "$BACKUP_FILE" -C /tmp "minio-backup-${TIMESTAMP}/"
    rm -rf "/tmp/minio-backup-${TIMESTAMP}"
    FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ MinIO backup: ${BACKUP_FILE} (${FILESIZE})"
    find "${BACKUP_DIR}/minio" -name "minio_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
    ;;

  verify)
    echo "🔍 Verifying latest PostgreSQL backup..."
    LATEST=$(ls -t "${BACKUP_DIR}/postgres/"ibn_docs_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$LATEST" ]; then
      echo "❌ No backups found to verify"
      exit 1
    fi
    echo "   Testing: ${LATEST}"
    gunzip -c "$LATEST" | psql -d "${DATABASE_URL}_verify" -q 2>&1 || {
      echo "❌ Backup verification failed"
      exit 1
    }
    echo "✅ Backup verified: $(zcat "$LATEST" | wc -c) bytes compressed"
    ;;

  *)
    echo "Usage: $0 {postgres|minio|verify}"
    exit 1
    ;;
esac
