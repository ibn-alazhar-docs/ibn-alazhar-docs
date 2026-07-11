-- Database Hardening Migration
-- ================================
-- Adds missing indexes, fixes Arabic search, creates PgBouncer-compatible setup
-- Applied: 2026-06-16

-- 1. Missing FK indexes (already in Prisma @@index, not yet in DB)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS searchvector tsvector;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS searchpreview text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS wordcount integer;

CREATE INDEX IF NOT EXISTS idx_accounts_userId ON accounts("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions("userId");

-- 2. Worker queue composite indexes (already in Prisma @@index, not yet in DB)
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status_created ON conversion_jobs(status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_userId_status ON conversion_jobs("userId", status);

-- 3. Document listing composite
CREATE INDEX IF NOT EXISTS idx_documents_userId_status_created ON documents("userId", status, "createdAt");

-- 4. Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, "createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId_created ON audit_logs("userId", "createdAt");

-- 5. Fix search vector with Arabic normalization
CREATE OR REPLACE FUNCTION update_searchvector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.searchvector := to_tsvector('simple',
    COALESCE(normalize_arabic(NEW.title), '') || ' ' ||
    COALESCE(normalize_arabic(NEW.description), '') || ' ' ||
    COALESCE(normalize_arabic(NEW."originalName"), '')
  );
  RETURN NEW;
END;
$$;

-- 6. Refresh existing search vectors
UPDATE documents SET
  searchvector = to_tsvector('simple',
    COALESCE(normalize_arabic(title), '') || ' ' ||
    COALESCE(normalize_arabic(description), '') || ' ' ||
    COALESCE(normalize_arabic("originalName"), '')
  );
