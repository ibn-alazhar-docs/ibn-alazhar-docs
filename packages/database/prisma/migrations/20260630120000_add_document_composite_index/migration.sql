-- CreateIndex
CREATE INDEX "documents_userId_deletedAt_createdAt_idx" ON "documents"("userId", "deletedAt", "createdAt");
