-- Add needsReview flag for low-confidence OCR (graceful degradation).
ALTER TABLE "documents" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "documents_needsReview" ON "documents" ("needsReview");
