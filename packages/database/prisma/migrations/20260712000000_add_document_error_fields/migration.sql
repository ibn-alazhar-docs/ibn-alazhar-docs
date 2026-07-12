-- Add failure observability columns to documents so the UI can surface a
-- classified error code and a safe (non-stack-trace) message after a pipeline
-- or export failure, enabling targeted retry/recovery from the client.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "errorCode" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

CREATE INDEX IF NOT EXISTS "documents_errorCode_idx" ON "documents" ("errorCode");
