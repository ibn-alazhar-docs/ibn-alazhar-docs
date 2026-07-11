export interface IStorageRepository {
  fileExists(key: string): Promise<boolean>;
  downloadFile(key: string): Promise<Buffer>;
  downloadAsString(key: string): Promise<string>;
  downloadIfExists(key: string): Promise<Buffer | null>;
  uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void>;
  uploadFile(key: string, filePath: string, contentType: string): Promise<void>;
  deleteFile(key: string): Promise<void>;
  ensureBucket(): Promise<void>;

  ocrTextKey(documentId: string): string;
  ocrCleanedKey(documentId: string): string;
  exportOutputKey(documentId: string, format: string): string;
  exportCacheKey(documentId: string, format: string): string;
  sourceKey(documentId: string, fileName: string): string;
  uploadKey(userId: string, jobId: string, safeName: string): string;
  searchablePdfKey(documentId: string): string;
}
