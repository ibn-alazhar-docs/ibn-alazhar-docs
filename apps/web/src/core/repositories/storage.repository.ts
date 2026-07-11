import {
  loadConfig,
  fileExists,
  downloadFile,
  uploadBuffer,
  uploadFile,
  ensureBucket,
  deleteFile,
} from "@ibn-al-azhar-docs/pipeline";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";

export class MinioStorageRepository implements IStorageRepository {
  private config = loadConfig();

  async fileExists(key: string): Promise<boolean> {
    return fileExists(this.config, key);
  }

  async downloadFile(key: string): Promise<Buffer> {
    return downloadFile(this.config, key);
  }

  async downloadAsString(key: string): Promise<string> {
    const buffer = await downloadFile(this.config, key);
    return buffer.toString("utf-8");
  }

  async downloadIfExists(key: string): Promise<Buffer | null> {
    const exists = await fileExists(this.config, key);
    if (!exists) return null;
    return downloadFile(this.config, key);
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await uploadBuffer(this.config, key, buffer, contentType);
  }

  async uploadFile(key: string, filePath: string, contentType: string): Promise<void> {
    await uploadFile(this.config, key, filePath, contentType);
  }

  async deleteFile(key: string): Promise<void> {
    await deleteFile(this.config, key);
  }

  async ensureBucket(): Promise<void> {
    await ensureBucket(this.config);
  }

  ocrTextKey(documentId: string): string {
    return `${this.config.paths.ocrResults}/${documentId}/text.json`;
  }

  ocrCleanedKey(documentId: string): string {
    return `${this.config.paths.ocrResults}/${documentId}/cleaned.json`;
  }

  exportOutputKey(documentId: string, format: string): string {
    return `${this.config.paths.exports}/${documentId}/output.${format}`;
  }

  exportCacheKey(documentId: string, format: string): string {
    return `${this.config.paths.exports}/${documentId}/export.${format}`;
  }

  sourceKey(documentId: string, fileName: string): string {
    return `${this.config.paths.uploads}/${documentId}/${fileName}`;
  }

  uploadKey(userId: string, jobId: string, safeName: string): string {
    return `uploads/${userId}/${jobId}_${safeName}`;
  }

  searchablePdfKey(documentId: string): string {
    return `${this.config.paths.exports}/${documentId}/searchable.pdf`;
  }
}
