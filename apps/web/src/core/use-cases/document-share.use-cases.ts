import { documentRepository } from "../repositories/document.repository";
import { shareRepository } from "../repositories/share.repository";
import { randomBytes } from "crypto";
import { expirationToMs } from "@/lib/validators/share";
import { AppError, NotFoundError } from "@/lib/errors";

export class DocumentShareUseCases {
  async getShareLink(documentId: string, userId: string) {
    return shareRepository.findShareLinkByDocumentId(documentId, userId);
  }

  async createShareLink(documentId: string, userId: string, expirationStr: string | null) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();
    if (document.status !== "COMPLETED")
      throw new AppError("الملف جاهز للتصدير بعد", "NOT_READY", 409);

    const existing = await shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (existing) return existing;

    const expirationMs = expirationToMs((expirationStr as "never" | "7days" | "30days") || null);
    const expiresAt = expirationMs ? new Date(Date.now() + expirationMs) : null;
    const token = randomBytes(32).toString("base64url");

    return shareRepository.createShareLink({
      token,
      documentId,
      userId,
      expiresAt,
    });
  }

  async regenerateShareLink(documentId: string, userId: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const existing = await shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (!existing) throw new AppError("لا يوجد رابط مشاركة", "NO_SHARE_LINK", 404);

    const token = randomBytes(32).toString("base64url");
    return shareRepository.updateShareLinkToken(existing.id, token);
  }

  async deleteShareLink(documentId: string, userId: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const existing = await shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (!existing) throw new AppError("لا يوجد رابط مشاركة", "NO_SHARE_LINK", 404);

    await shareRepository.deleteShareLinkByDocumentId(documentId, userId);
    return true;
  }
}

export const documentShareUseCases = new DocumentShareUseCases();
