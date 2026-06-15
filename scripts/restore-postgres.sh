#!/bin/bash
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh /opt/ibn-al-azhar-docs/backups/postgres/ibn_docs_*.sql.gz 2>/dev/null || echo "   No backups found"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "⚠️  WARNING: This will OVERWRITE the current database!"
echo "   Backup file: ${BACKUP_FILE}"
echo "   Database: ${DATABASE_URL:-postgresql://localhost:5432/ibn_docs}"
read -p "   Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

echo "🔄 Restoring PostgreSQL from: ${BACKUP_FILE}"

gunzip -c "$BACKUP_FILE" | psql "${DATABASE_URL:-postgresql://ibn_docs:ibn_docs_password@localhost:5432/ibn_docs}" \
  --no-owner \
  --no-acl

echo "✅ PostgreSQL restore completed"
echo "⚠️  Run 'npx prisma db push' to ensure schema is up to date"
