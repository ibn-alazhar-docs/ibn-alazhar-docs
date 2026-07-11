#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/ibn-al-azhar-docs/backups}"
PG_HOST="${PG_HOST:-localhost}"
PG_USER="${PG_USER:-ibn_docs}"
PG_PASS="${PG_PASS:-ibn_docs_password}"
TEST_DB="ibn_docs_restore_test_$(date +%s)"

export PGPASSWORD="${PG_PASS}"

echo "Testing restore procedure..."
echo "   This creates a temporary database, restores, and verifies."

# Find latest backup
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}/postgres/"ibn_docs_*.sql.gz 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "No backups found in ${BACKUP_DIR}/postgres/"
  exit 1
fi

echo "   Latest backup: ${LATEST_BACKUP}"

# Create test database
echo "   Creating test database: ${TEST_DB}"
psql -h "${PG_HOST}" -U "${PG_USER}" -d postgres -c "CREATE DATABASE \"${TEST_DB}\";" 2>/dev/null || {
  echo "Cannot create test database. Ensure PostgreSQL is running."
  exit 1
}

# Restore to test database
echo "   Restoring..."
gunzip -c "$LATEST_BACKUP" | psql -h "${PG_HOST}" -U "${PG_USER}" -d "${TEST_DB}" -q 2>&1

# Verify tables exist
TABLE_COUNT=$(psql -h "${PG_HOST}" -U "${PG_USER}" -d "${TEST_DB}" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

echo "   Tables found: ${TABLE_COUNT}"

# Cleanup
echo "   Cleaning up test database..."
psql -h "${PG_HOST}" -U "${PG_USER}" -d postgres -c "DROP DATABASE \"${TEST_DB}\";" 2>/dev/null || true

if [ "${TABLE_COUNT:-0}" -gt 0 ]; then
  echo "Restore test PASSED (${TABLE_COUNT} tables)"
  exit 0
else
  echo "Restore test FAILED (no tables found)"
  exit 1
fi
