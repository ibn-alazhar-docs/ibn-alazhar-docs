import type { DomainDocument, DocStatus } from "./types";

const STATUS_TRANSITIONS: Record<DocStatus, readonly DocStatus[]> = {
  UPLOADED: ["VALIDATING", "FAILED"],
  VALIDATING: ["SPLITTING", "FAILED"],
  SPLITTING: ["OCR_PROCESSING", "FAILED"],
  OCR_PROCESSING: ["CLEANING", "FAILED"],
  CLEANING: ["GENERATING", "FAILED"],
  GENERATING: ["COMPLETED", "FAILED"],
  COMPLETED: ["ARCHIVED"],
  FAILED: ["UPLOADED"],
  ARCHIVED: [],
} as const;

export function isDocumentOwner(doc: DomainDocument, userId: string): boolean {
  return doc.userId === userId;
}

export function isDocumentDeleted(doc: DomainDocument): boolean {
  return doc.deletedAt !== null;
}

export function canDeleteDocument(doc: DomainDocument): boolean {
  return !isDocumentDeleted(doc) && doc.status !== "ARCHIVED";
}

export function canRestoreDocument(doc: DomainDocument): boolean {
  return isDocumentDeleted(doc);
}

export function isValidStatusTransition(current: DocStatus, next: DocStatus): boolean {
  return STATUS_TRANSITIONS[current].includes(next);
}

export function getValidTransitions(status: DocStatus): readonly DocStatus[] {
  return STATUS_TRANSITIONS[status];
}

export function isTerminalStatus(status: DocStatus): boolean {
  return STATUS_TRANSITIONS[status].length === 0;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
