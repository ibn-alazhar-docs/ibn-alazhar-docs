-- AlterTable: Add deletedAt to tags for soft delete
ALTER TABLE "tags" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex: Composite index for efficient soft-delete queries
CREATE INDEX "tags_userId_deletedAt_idx" ON "tags"("userId", "deletedAt");

-- CreateIndex: Index for filtering deleted tags
CREATE INDEX "tags_deletedAt_idx" ON "tags"("deletedAt");
