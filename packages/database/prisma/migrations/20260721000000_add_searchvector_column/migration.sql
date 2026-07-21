-- Ensure searchvector/searchpreview/wordcount exist on documents.
-- These columns are managed by raw SQL/migrations and were previously
-- dropped by db push when absent from the Prisma schema.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS searchvector tsvector;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS searchpreview text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS wordcount integer;
