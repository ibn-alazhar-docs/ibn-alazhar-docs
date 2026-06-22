import {
  getDriveClient,
  downloadFromDrive,
  downloadFile,
  PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@/lib/prisma";

export async function downloadDocumentBuffer(
  storageKey: string,
  userId: string,
  config: PipelineConfig,
): Promise<Buffer> {
  if (storageKey.startsWith("gdrive://")) {
    const fileId = storageKey.replace("gdrive://", "");
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
    });
    if (!account || !account.access_token || !account.refresh_token) {
      throw new Error("Google account not linked or missing tokens");
    }
    const drive = getDriveClient(
      account.access_token,
      account.refresh_token,
      process.env.GOOGLE_CLIENT_ID || "",
      process.env.GOOGLE_CLIENT_SECRET || "",
    );
    return downloadFromDrive(drive, fileId);
  }
  return downloadFile(config, storageKey);
}
