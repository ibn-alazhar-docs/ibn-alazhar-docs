#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/ibn-al-azhar-docs/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ibn_docs_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "📦 Starting PostgreSQL backup..."
echo "   Database: ${DATABASE_URL:-postgresql://localhost:5432/ibn_docs}"
echo "   Output: ${BACKUP_FILE}"

pg_dump "${DATABASE_URL:-postgresql://ibn_docs:ibn_docs_password@localhost:5432/ibn_docs}" \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup completed: ${BACKUP_FILE} (${FILESIZE})"

# Cleanup old backups
echo "🧹 Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "ibn_docs_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
REMAINING=$(find "$BACKUP_DIR" -name "ibn_docs_*.sql.gz" | wc -l)
echo "📋 Remaining backups: ${REMAINING}"

echo "✅ PostgreSQL backup finished"
