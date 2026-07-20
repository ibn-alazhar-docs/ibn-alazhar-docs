-- Add real progress percentage column to Document so the UI can show a
-- truthful, monotonic processing percentage instead of a flat 0%.
ALTER TABLE "Document" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
