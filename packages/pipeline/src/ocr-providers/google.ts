import { drive_v3 } from "@googleapis/drive";
import type { PipelineConfig, OcrEngineType, OcrEngineResult } from "../types";
import type { OcrProvider } from "./types";
import { estimateConfidence, toOcrPageResult } from "./types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "ocr-google" });

let driveClient: drive_v3.Drive | null = null;
let lastGoogleEmail = "";
let lastGooglePrivateKey = "";

async function getDriveClient(config: PipelineConfig): Promise<drive_v3.Drive> {
  const changed =
    !driveClient ||
    lastGoogleEmail !== config.google.serviceAccountEmail ||
    lastGooglePrivateKey !== config.google.privateKey;

  if (changed) {
    const { JWT } = await import("google-auth-library");
    const auth = new JWT({
      email: config.google.serviceAccountEmail,
      key: config.google.privateKey,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    // @ts-expect-error - Type mismatch between google-auth-library and googleapis
    driveClient = (await import("@googleapis/drive")).drive({ version: "v3", auth });
    lastGoogleEmail = config.google.serviceAccountEmail;
    lastGooglePrivateKey = config.google.privateKey;
  }
  return driveClient!;
}

export class GoogleDriveOcrProvider implements OcrProvider {
  readonly name = "Google Drive OCR";
  readonly type = "google" as OcrEngineType;

  isAvailable(config: PipelineConfig): boolean {
    return !!(config.google.serviceAccountEmail && config.google.privateKey);
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult> {
    const drv = await getDriveClient(config);
    const uploaded = await drv.files.create({
      requestBody: {
        name: `ocr_${Date.now()}_${fileName}`,
        mimeType,
      },
      media: {
        mimeType,
        body: fileBuffer,
      },
      fields: "id",
    });

    const fileId = uploaded.data.id ?? null;
    if (!fileId) throw new Error("OCR_UPLOAD_FAILED");

    try {
      let response;
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          response = await drv.files.export(
            { fileId, mimeType: "text/plain" },
            { responseType: "text" },
          );
          break;
        } catch (err: unknown) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`Export attempt ${attempt}/5 failed for file ${fileId}: ${msg}`);
          if (attempt < 5) {
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
          }
        }
      }

      if (!response) {
        const errMsg =
          lastErr instanceof Error ? lastErr.message : String(lastErr ?? "Unknown error");
        throw new Error(`OCR_EXPORT_FAILED: ${errMsg}`);
      }

      const fullText =
        typeof response.data === "string" ? response.data : JSON.stringify(response.data);

      if (!fullText || fullText.trim().length === 0) {
        throw new Error("OCR_NO_TEXT");
      }

      const rawPages = fullText
        .split("\f")
        .filter(Boolean)
        .map((text: string, i: number) => ({
          number: i + 1,
          text: text.trim(),
        }));

      const pages = toOcrPageResult(rawPages);
      const confidence = estimateConfidence(fullText);

      return { text: fullText, pages, confidence, engine: "google" };
    } finally {
      try {
        await drv.files.delete({ fileId });
      } catch {
        // Non-critical
      }
    }
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ): Promise<OcrEngineResult> {
    const drv = await getDriveClient(config);
    const allPages: { number: number; text: string }[] = [];
    const errors: { page: number; error: string }[] = [];

    for (let i = 0; i < pageGetters.length; i++) {
      let fileId: string | null = null;
      const pageNum = i + 1;

      try {
        const uploaded = await drv.files.create({
          requestBody: {
            name: `ocr_${Date.now()}_${fileName}_p${pageNum}`,
            mimeType: "image/png",
          },
          media: {
            mimeType: "image/png",
            body: pageGetters[i]!,
          },
          fields: "id",
        });

        fileId = uploaded.data.id ?? null;
        if (!fileId) {
          errors.push({ page: pageNum, error: "UPLOAD_FAILED" });
          allPages.push({ number: pageNum, text: "" });
          continue;
        }

        await new Promise((r) => setTimeout(r, 1000));

        const response = await drv.files.export(
          { fileId, mimeType: "text/plain" },
          { responseType: "text" },
        );

        const text =
          typeof response.data === "string" ? response.data : JSON.stringify(response.data);

        allPages.push({ number: pageNum, text: text?.trim() ?? "" });
      } catch (err: unknown) {
        errors.push({ page: pageNum, error: err instanceof Error ? err.message : "UNKNOWN" });
        allPages.push({ number: pageNum, text: "" });
      } finally {
        if (fileId) {
          try {
            await drv.files.delete({ fileId });
          } catch {
            // Non-critical
          }
        }
      }
    }

    const fullText = allPages.map((p) => p.text).join("\n\n");
    const pages = toOcrPageResult(allPages);
    const confidence = estimateConfidence(fullText);

    if (errors.length > 0) {
      logger.warn(`Page-level failures for ${fileName}: ${JSON.stringify(errors)}`);
    }

    return {
      text: fullText,
      pages,
      confidence,
      engine: "google",
      pageErrors: errors.length > 0 ? errors : undefined,
    };
  }
}
