import type { DomainShareLink, CreateShareLinkInput } from "../types";
import type { BatchCount } from "./tag.repository.interface";

export interface IShareRepository {
  findShareLinkByDocumentId(
    documentId: string,
    userId: string,
  ): Promise<(DomainShareLink & { document: { title: string } }) | null>;
  findShareLinkByToken(
    token: string,
    documentSelect?: Record<string, boolean>,
  ): Promise<(DomainShareLink & { document: Record<string, unknown> }) | null>;
  createShareLink(data: CreateShareLinkInput): Promise<DomainShareLink>;
  updateShareLinkToken(id: string, token: string): Promise<DomainShareLink>;
  deleteShareLinkByDocumentId(documentId: string, userId: string): Promise<BatchCount>;
}
