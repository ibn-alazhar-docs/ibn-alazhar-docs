import type { ErrorCode, FailureCategory } from "@ibn-al-azhar-docs/shared";

export type { ErrorCode, FailureCategory } from "@ibn-al-azhar-docs/shared";
export { ERROR_CODES, FAILURE_CATEGORIES } from "@ibn-al-azhar-docs/shared";

export type OcrEngineType = "google" | "surya" | "tesseract" | "gemini";

export interface OcrPageResult {
  number: number;
  text: string;
  confidence: number;
}

export interface OcrEngineResult {
  text: string;
  pages: OcrPageResult[];
  confidence: number;
  engine: OcrEngineType;
  pageErrors?: { page: number; error: string }[];
}

export interface PipelineConfig {
  minio: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    tls?: boolean;
  };
  google: {
    serviceAccountEmail: string;
    privateKey: string;
  };
  gemini: {
    apiKey: string;
  };
  ocr: {
    dpi: number;
    language: string;
    maxRetries: number;
    provider: OcrEngineType;
    providers: OcrEngineType[];
  };
  paths: {
    uploads: string;
    pages: string;
    ocrResults: string;
    exports: string;
    temp: string;
  };
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  status: JobStage;
  progress: number;
  error?: string;
  createdAt: string;
  pageRange?: string;
}

export type JobStage =
  | "pending"
  | "validating"
  | "splitting"
  | "ocr"
  | "cleaning"
  | "generating"
  | "completed"
  | "failed";

export { DOC_STATUS_MAP as DOCUMENT_STATUS_MAP } from "@ibn-al-azhar-docs/shared";

export interface ExportRequest {
  jobId: string;
  documentId: string;
  userId: string;
  format: "md" | "txt" | "docx" | "json" | "pdf" | "epub";
  textKey: string;
  outputKey: string;
  pageCount?: number;
  options?: {
    fontSize?: number;
    watermark?: string;
    destination?: string;
    pageRange?: string;
  };
}

export interface CleanedText {
  raw: string;
  cleaned: string;
  markdown: string;
  metadata: {
    pageCount: number;
    headingCount: number;
    wordCount: number;
    charCount: number;
    confidence: number;
    garbageRatio: number;
    htmlFragmentCount: number;
    paragraphCount: number;
    qualityScore: number;
  };
}

export interface FailedJob {
  jobId: string;
  queue: string;
  originalData: unknown;
  error: string;
  errorCode: ErrorCode;
  failureCategory: FailureCategory;
  attempts: number;
  lastAttemptAt: string;
  failedAt: string;
}

export interface StorageObject {
  bucket: string;
  key: string;
  size: number;
  contentType: string;
}

export const JOB_QUEUES = {
  VALIDATION: "pipeline-validation",
  SPLITTING: "pipeline-splitting",
  OCR: "pipeline-ocr",
  CLEANING: "pipeline-cleaning",
  GENERATION: "pipeline-generation",
  EXPORT: "pipeline-export",
  FAILED: "pipeline-failed",
} as const;

export const JOB_TIMEOUTS: Record<string, number> = {
  [JOB_QUEUES.VALIDATION]: 60_000,
  [JOB_QUEUES.SPLITTING]: 600_000,
  [JOB_QUEUES.OCR]: 7_200_000,
  [JOB_QUEUES.CLEANING]: 180_000,
  [JOB_QUEUES.GENERATION]: 600_000,
  [JOB_QUEUES.EXPORT]: 300_000,
};

export const JOB_CONCURRENCY: Record<string, number> = {
  [JOB_QUEUES.VALIDATION]: 5,
  [JOB_QUEUES.SPLITTING]: 2,
  [JOB_QUEUES.OCR]: 3,
  [JOB_QUEUES.CLEANING]: 5,
  [JOB_QUEUES.GENERATION]: 3,
  [JOB_QUEUES.EXPORT]: 3,
};
