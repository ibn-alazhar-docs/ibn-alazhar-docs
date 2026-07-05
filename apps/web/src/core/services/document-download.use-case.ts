import {
  getDriveClient,
  downloadFromDrive,
  downloadFile,
  loadConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { IAccountRepository } from "@/domain/repositories/account.repository.interface";
import { AppError } from "@/lib/shared/errors";

export class DocumentDownloadUseCase {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(storageKey: string, userId: string): Promise<Buffer> {
    if (storageKey.startsWith("gdrive://")) {
      const fileId = storageKey.replace("gdrive://", "");
      const account = await this.accountRepository.findGoogleAccount(userId);
      if (!account || !account.access_token || !account.refresh_token) {
        throw new AppError(
          "حساب Google غير مرتبط أو ينقصه التوكن",
          "GOOGLE_ACCOUNT_NOT_LINKED",
          400,
        );
      }
      const drive = getDriveClient(
        account.access_token,
        account.refresh_token,
        process.env.GOOGLE_CLIENT_ID || "",
        process.env.GOOGLE_CLIENT_SECRET || "",
      );
      return downloadFromDrive(drive, fileId);
    }
    const config = loadConfig();
    return downloadFile(config, storageKey);
  }
}
