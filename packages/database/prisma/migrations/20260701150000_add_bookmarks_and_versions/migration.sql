-- AlterTable
ALTER TABLE "documents" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "document_bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "pageCount" INTEGER,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_bookmarks_userId_documentId_key" ON "document_bookmarks"("userId", "documentId");

-- CreateIndex
CREATE INDEX "document_bookmarks_userId_idx" ON "document_bookmarks"("userId");

-- CreateIndex
CREATE INDEX "document_bookmarks_documentId_idx" ON "document_bookmarks"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_version_key" ON "document_versions"("documentId", "version");

-- CreateIndex
CREATE INDEX "document_versions_documentId_idx" ON "document_versions"("documentId");

-- CreateIndex
CREATE INDEX "document_versions_userId_idx" ON "document_versions"("userId");

-- CreateIndex
CREATE INDEX "document_versions_createdAt_idx" ON "document_versions"("createdAt");

-- AddForeignKey
ALTER TABLE "document_bookmarks" ADD CONSTRAINT "document_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_bookmarks" ADD CONSTRAINT "document_bookmarks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
