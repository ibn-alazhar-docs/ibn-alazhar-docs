-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "documents_userId_deletedAt_idx" ON "documents"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "folders_userId_deletedAt_idx" ON "folders"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "shareLinks_userId_expiresAt_idx" ON "share_links"("userId", "expiresAt");
