import {
  loadConfig,
  ensureBucket,
  enqueueValidation,
  uploadFile,
} from "@ibn-al-azhar-docs/pipeline";
import { unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { documentRepository } from "../repositories/document.repository";
import { folderRepository } from "../repositories/folder.repository";
import { NotFoundError } from "@/lib/errors";

export class UploadDocumentUseCase {
  async execute(params: {
    file: File;
    folderId: string | null;
    userId: string;
    pageRange: string | null;
  }) {
    const { file, folderId, userId, pageRange } = params;

    // Validate Folder
    if (folderId) {
      const folder = await folderRepository.findFolderById(folderId, userId);
      if (!folder) {
        throw new NotFoundError();
      }
    }

    const config = loadConfig();
    await ensureBucket(config);

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

    const storageKey = `uploads/${userId}/${jobId}_${safeName}`;

    // Upload to MinIO
    await uploadFile(config, storageKey, tempPath, file.type);

    // Clean up temp
    await unlink(tempPath).catch(() => {});

    // Create Document record
    const document = await documentRepository.createDocument({
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

    // Enqueue
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

export const uploadDocumentUseCase = new UploadDocumentUseCase();
