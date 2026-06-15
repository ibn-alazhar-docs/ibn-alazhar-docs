export const EXPORT_FORMATS = ["md", "txt", "json", "zip"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_PROFILES = ["research", "archive", "plain", "developer"] as const;
export type ExportProfile = (typeof EXPORT_PROFILES)[number];

export interface ExportProfileConfig {
  name: string;
  description: string;
  formats: ExportFormat[];
  includeMetadata: boolean;
  includeSource: boolean;
  includeTags: boolean;
  includeFolderPath: boolean;
  metadataLevel: "minimal" | "standard" | "full";
}

export interface ExportDocumentData {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number | null;
  outputFormats: string[];
  language: string;
  isRtl: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportTagData {
  name: string;
  color: string;
}

export interface ExportFolderData {
  name: string;
  path: string;
  ancestors: string[];
}

export interface ExportOcrData {
  confidence: number;
  engine: string;
  pageCount: number;
}

export interface ExportPipelineData {
  wordCount: number;
  charCount: number;
  headingCount: number;
  paragraphCount: number;
  qualityScore: number;
  garbageRatio: number;
  pageCount?: number;
}

export interface ExportMetadata {
  source: {
    title: string;
    description: string | null;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    language: string;
    isRtl: boolean;
  };
  tags: ExportTagData[];
  folder: ExportFolderData | null;
  ocr: ExportOcrData;
  pipeline: ExportPipelineData;
  dates: {
    created: string;
    updated: string;
    exported: string;
  };
  export: {
    format: ExportFormat;
    profile: ExportProfile;
    version: string;
    generator: string;
  };
}

export interface ManifestDocument {
  id: string;
  title: string;
  tags: string[];
  folder: string;
  pageCount: number | null;
  files: Array<{
    path: string;
    size: number;
    format: string;
  }>;
}

export interface ExportManifest {
  exportId: string;
  exportedAt: string;
  generator: string;
  profile: ExportProfile;
  documentCount: number;
  totalSize: number;
  documents: ManifestDocument[];
}

export interface ExportJobRecord {
  id: string;
  userId: string;
  documentIds: string[];
  format: ExportFormat;
  profile: ExportProfile;
  includeSource: boolean;
  status: "pending" | "processing" | "ready" | "failed";
  progress: number;
  downloadKey: string | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface SingleExportRequest {
  documentId: string;
  format: ExportFormat;
  profile: ExportProfile;
  includeSource?: boolean;
}

export interface BatchExportRequest {
  documentIds: string[];
  format: ExportFormat;
  profile: ExportProfile;
  includeSource?: boolean;
}

export interface FolderExportRequest {
  folderId: string;
  format: ExportFormat;
  profile: ExportProfile;
  includeSource?: boolean;
  recursive?: boolean;
}

export interface TagExportRequest {
  tagId: string;
  format: ExportFormat;
  profile: ExportProfile;
  includeSource?: boolean;
}

export interface ExportStatusResponse {
  exportId: string;
  status: string;
  progress: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  error: string | null;
}
