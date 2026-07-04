-- PGroonga full-text search upgrade
-- Adds searchContent generated column + PGroonga index for fast Arabic search

-- 1. Add computed text column combining all searchable fields
ALTER TABLE "documents" ADD COLUMN "searchContent" text
GENERATED ALWAYS AS (
  COALESCE(title, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE("originalName", '') || ' ' ||
  COALESCE(searchpreview, '')
) STORED;

-- 2. Create PGroonga index on the searchContent column
CREATE INDEX "documents_searchContent_pgroonga_idx"
ON "documents" USING pgroonga ("searchContent");
