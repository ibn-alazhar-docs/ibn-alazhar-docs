-- Add createdAt and updatedAt columns to sessions table
-- The Session model has these fields but they were missing from the initial migration

ALTER TABLE "sessions" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "sessions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

-- Create index on createdAt for session cleanup queries
CREATE INDEX IF NOT EXISTS "sessions_createdAt_idx" ON "sessions"("createdAt");