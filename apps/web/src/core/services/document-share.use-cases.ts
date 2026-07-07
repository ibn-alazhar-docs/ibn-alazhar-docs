import type { IDocumentRepository } from "../../domain/repositories/document.repository.interface";
import type { IShareRepository } from "../../domain/repositories/share.repository.interface";
import { randomBytes } from "crypto";
import { expirationToMs } from "@/lib/shared/validators/share";
import { AppError, NotFoundError } from "@/lib/shared/errors";
import { ERROR_CODES } from "@/lib/shared/constants";

export class DocumentShareUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly shareRepository: IShareRepository,
  ) {}

  async getShareLink(documentId: string, userId: string) {
    return this.shareRepository.findShareLinkByDocumentId(documentId, userId);
  }

  async createShareLink(documentId: string, userId: string, expirationStr: string | null) {
    const document = await this.documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();
    if (document.status === "FAILED") {
      throw new AppError("الملف فشل في المعالجة ولا يمكن مشاركته", ERROR_CODES.NOT_READY, 409);
    }
    if (document.status !== "COMPLETED") {
      throw new AppError("الملف غير جاهز للمشاركة بعد", ERROR_CODES.NOT_READY, 409);
    }

    const existing = await this.shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (existing) return existing;

    const expirationMs = expirationToMs((expirationStr as "never" | "7days" | "30days") || null);
    const expiresAt = expirationMs ? new Date(Date.now() + expirationMs) : null;
    const token = randomBytes(32).toString("base64url");

    return this.shareRepository.createShareLink({
      token,
      documentId,
      userId,
      expiresAt,
    });
  }

  async regenerateShareLink(documentId: string, userId: string) {
    const document = await this.documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const existing = await this.shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (!existing) throw new AppError("لا يوجد رابط مشاركة", ERROR_CODES.NO_SHARE_LINK, 404);

    const token = randomBytes(32).toString("base64url");
    return this.shareRepository.updateShareLinkToken(existing.id, token);
  }

  async deleteShareLink(documentId: string, userId: string) {
    const document = await this.documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const existing = await this.shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (!existing) throw new AppError("لا يوجد رابط مشاركة", ERROR_CODES.NO_SHARE_LINK, 404);

    await this.shareRepository.deleteShareLinkByDocumentId(documentId, userId);
    return true;
  }
}
