import { loadConfig, enqueueValidation } from "@ibn-al-azhar-docs/pipeline";
import { unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
import { NotFoundError } from "@/shared/errors";

export class UploadDocumentUseCase {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly folderRepository: IFolderRepository,
    private readonly storage: IStorageRepository,
  ) {}

  async execute(params: {
    file: File;
    folderId: string | null;
    userId: string;
    pageRange: string | null;
  }) {
    const { file, folderId, userId, pageRange } = params;

    if (folderId) {
      const folder = await this.folderRepository.findFolderById(folderId, userId);
      if (!folder) {
        throw new NotFoundError();
      }
    }

    await this.storage.ensureBucket();

    const jobId = randomUUID();
    const fileName = file.name;
    const safeName = fileName
      .replace(/[^a-zA-Z0-9._\u0600-\u06FF\u0660-\u0669-]/g, "_")
      .slice(0, 200);
    const tempPath = join(tmpdir(), `${jobId}_${safeName}`);

    await pipeline(
      Readable.fromWeb(file.stream() as import("stream/web").ReadableStream),
      createWriteStream(tempPath),
    );

    const storageKey = this.storage.uploadKey(userId, jobId, safeName);

    try {
      await this.storage.uploadFile(storageKey, tempPath, file.type);
    } finally {
      await unlink(tempPath).catch(() => {});
    }

    let document;
    try {
      document = await this.documentRepository.createDocument({
        id: jobId,
        userId: userId,
        title: fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, ""),
        fileName,
        originalName: fileName,
        mimeType: file.type,
        fileSize: file.size,
        storageKey: storageKey,
        folderId: folderId || null,
        status: "UPLOADED",
        pageRange: pageRange || null,
      });
    } catch (error) {
      // If DB insert fails, cleanup the S3 object to prevent orphaned files
      await this.storage.deleteFile(storageKey).catch(() => {});
      throw error;
    }

    const config = loadConfig();
    const job = {
      id: document.id,
      documentId: document.id,
      userId: document.userId,
      fileName: document.originalName,
      fileSize: Number(document.fileSize),
      mimeType: document.mimeType,
      storageKey: document.storageKey!,
      status: "pending" as const,
      progress: 0,
      createdAt: new Date().toISOString(),
      pageRange: pageRange || undefined,
    };
    await enqueueValidation(config, job);

    return document;
  }
}
