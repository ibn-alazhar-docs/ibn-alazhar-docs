import { readFile, rm, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  downloadFile,
  uploadBuffer,
  getDriveClient,
  downloadFromDrive,
  uploadExportBuffer,
  getPythonCommand,
  type ProcessingJob,
  type PipelineConfig,
  type OcrEngineResult,
} from "@ibn-al-azhar-docs/pipeline";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";

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
  const localDir = config.storage?.localDir || "/data";
  const expectedPath = `${localDir}/${storageKey}`;
  try {
    await access(expectedPath, fsConstants.F_OK);
    logger.info({ storageKey, expectedPath }, "[download] File found at expected path");
  } catch {
    logger.error(
      { storageKey, expectedPath, localDir, userId },
      "[download] File NOT found at expected path — ENOENT likely",
    );
  }
  return downloadFile(config, storageKey);
}

export async function uploadExportBufferForWorker(
  config: PipelineConfig,
  userId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  return uploadExportBuffer(config, userId, buffer, fileName, mimeType, account, true);
}

export async function updateDocStatus(
  documentId: string,
  status: DocStatus,
  extra?: Record<string, unknown>,
): Promise<boolean> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status, ...extra },
    });
    return true;
  } catch (err) {
    logger.error(err, `[doc-status] Failed to update document ${documentId} to ${status}`);
    return false;
  }
}

/**
 * Updates the document status AND a stage-appropriate progress percentage so
 * the UI shows a real, monotonic progress value instead of a flat 0%.
 * Percentages mirror the canonical stage map (validate 10 → split 25 → ocr 40 →
 * clean 65 → generate 85 → completed 100).
 */
const STAGE_PROGRESS: Partial<Record<DocStatus, number>> = {
  VALIDATING: 10,
  SPLITTING: 25,
  OCR_PROCESSING: 40,
  CLEANING: 65,
  GENERATING: 85,
  COMPLETED: 100,
};

export async function updateDocStatusWithProgress(
  documentId: string,
  status: DocStatus,
  extra?: Record<string, unknown>,
): Promise<boolean> {
  const progress = STAGE_PROGRESS[status];
  return updateDocStatus(
    documentId,
    status,
    progress === undefined ? extra : { progress, ...extra },
  );
}

export async function generateSearchablePdf(
  job: ProcessingJob,
  pageGetters: (() => Promise<Buffer>)[],
  config: PipelineConfig,
  ocrResult?: OcrEngineResult,
): Promise<string | null> {
  try {
    if (
      process.env.MOCK_OCR === "true" ||
      process.env.NODE_ENV === "test" ||
      process.env.PLAYWRIGHT_TEST === "true"
    ) {
      const finalBuffer = Buffer.from("%PDF-1.4 mock pdf content");
      const pdfKey = `${config.paths.exports}/${job.id}/searchable.pdf`;
      await uploadBuffer(config, pdfKey, finalBuffer, "application/pdf");
      logger.info(`[ocr] Mock generated searchable PDF for ${job.id} at ${pdfKey}`);
      return pdfKey;
    }

    logger.info(`[ocr] Generating searchable PDF for ${job.id}`);
    const { PDFDocument } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < pageGetters.length; i++) {
      const pageBuf = await pageGetters[i]();
      const tempId = randomUUID();
      const imgPath = path.join(os.tmpdir(), `${tempId}.png`);
      const pdfPath = path.join(os.tmpdir(), `${tempId}.pdf`);

      await writeFile(imgPath, pageBuf);

      const scriptPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "packages",
        "pipeline",
        "scripts",
        "generate-searchable-pdf.py",
      );
      const jsonPath = path.join(os.tmpdir(), `${tempId}.json`);

      const pageLayout = ocrResult?.pages[i]?.layout;
      const lines = pageLayout?.lines || [];
      await writeFile(jsonPath, JSON.stringify({ lines }));

      await execFileAsync(getPythonCommand(), [scriptPath, imgPath, jsonPath, pdfPath]);

      const pdfBuf = await readFile(pdfPath);
      const doc = await PDFDocument.load(pdfBuf);
      const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));

      await rm(imgPath, { force: true }).catch(() => {});
      await rm(pdfPath, { force: true }).catch(() => {});
      await rm(jsonPath, { force: true }).catch(() => {});
    }

    const finalPdfBytes = await mergedPdf.save();
    const finalBuffer = Buffer.from(finalPdfBytes);
    const pdfKey = `${config.paths.exports}/${job.id}/searchable.pdf`;
    await uploadBuffer(config, pdfKey, finalBuffer, "application/pdf");

    logger.info(`[ocr] Successfully generated searchable PDF for ${job.id} at ${pdfKey}`);
    return pdfKey;
  } catch (err) {
    logger.warn(err, `[ocr] Failed to generate searchable PDF for ${job.id}`);
    return null;
  }
}

export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (/^\d+$/.test(trimmed)) {
      const p = parseInt(trimmed, 10);
      if (p >= 1 && p <= maxPages) pages.add(p);
    } else if (/^\d+-\d+$/.test(trimmed)) {
      const [startStr, endStr] = trimmed.split("-");
      if (startStr && endStr) {
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (start >= 1 && end >= start) {
          const actualEnd = Math.min(end, maxPages);
          for (let i = start; i <= actualEnd; i++) {
            pages.add(i);
          }
        }
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}
