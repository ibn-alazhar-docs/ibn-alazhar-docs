-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "folders_userId_parentId_idx" ON "folders"("userId", "parentId");
