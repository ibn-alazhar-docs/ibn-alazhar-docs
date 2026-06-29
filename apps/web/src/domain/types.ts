import type { Role } from "./auth";
import type { DocStatus } from "@ibn-al-azhar-docs/shared";

export type { DocStatus } from "@ibn-al-azhar-docs/shared";

export interface DomainDocument {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  description: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  status: DocStatus;
  pageCount: number | null;
  pageRange: string | null;
  outputFormats: string[];
  outputKeys: Record<string, unknown> | null;
  language: string;
  isRtl: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateDocumentInput {
  id?: string;
  userId: string;
  folderId?: string | null;
  title: string;
  description?: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  status?: DocStatus;
  pageRange?: string | null;
  language?: string;
  isRtl?: boolean;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  folderId?: string | null;
  fileName?: string;
  status?: DocStatus;
  pageCount?: number | null;
  pageRange?: string | null;
  outputFormats?: string[];
  outputKeys?: Record<string, unknown> | null;
  deletedAt?: Date | null;
}

export interface DomainFolder {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateFolderInput {
  userId: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  order?: number;
}

export interface DomainTag {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface CreateTagInput {
  userId: string;
  name: string;
  color?: string;
}

export interface DomainShareLink {
  id: string;
  token: string;
  documentId: string;
  userId: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShareLinkInput {
  token: string;
  documentId: string;
  userId: string;
  expiresAt: Date | null;
}

export interface DomainUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserInput {
  name?: string | null;
  email: string;
  passwordHash?: string | null;
  role?: Role;
  locale?: string;
}
