import { prisma } from "@/lib/prisma";
import type { ExportFormat } from "@/lib/validators/share";

interface ShareAccessResult {
  share: {
    documentId: string;
    expiresAt: Date | null;
    document: Record<string, unknown>;
  };
}

export async function validateShareAccess(
  token: string,
  documentSelect: Record<string, boolean> = {
    id: true,
    title: true,
    status: true,
    deletedAt: true,
    outputFormats: true,
    originalName: true,
  },
): Promise<ShareAccessResult | { error: string; status: 404 | 410 }> {
  const share = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      document: { select: documentSelect },
    },
  });

  if (!share) return { error: "Link not found", status: 404 };
  const doc = share.document as Record<string, unknown>;
  if (doc.deletedAt) return { error: "Document deleted", status: 404 };
  if (doc.status !== "COMPLETED") return { error: "Document not ready", status: 404 };
  if (share.expiresAt && new Date() > share.expiresAt)
    return { error: "Link expired", status: 410 };

  return { share: share as ShareAccessResult["share"] };
}

export function sanitizeFilename(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

export function getContentType(format: ExportFormat): string {
  switch (format) {
    case "md":
      return "text/markdown; charset=utf-8";
    case "txt":
      return "text/plain; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "pdf":
    case "searchable-pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "epub":
      return "application/epub+zip";
    default:
      return "application/octet-stream";
  }
}
