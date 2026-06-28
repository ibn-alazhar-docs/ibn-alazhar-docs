import { ownedWhere, type AuthSession } from "@/lib/auth-guards";
import { isAdminRole } from "@/domain/auth";
import { NotFoundError, AppError } from "@/lib/errors";
import { executeBulkExport } from "@/lib/export/bulk-export-helpers";
import {
  resolveDocumentForExport,
  resolveTagsForExport,
  resolveFolderForExport,
  resolveOcrData,
  resolvePipelineData,
  buildExportMetadata,
} from "@/lib/export/metadata";
import { buildZipPackage } from "@/lib/export/zip-builder";
import { loadConfig, downloadFile, fileExists, uploadBuffer } from "@ibn-al-azhar-docs/pipeline";
import type { ExportMetadata } from "@/lib/export/types";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";

interface ExportOptions {
  format: string;
  includeSource: boolean;
  profile: "research" | "archive" | "plain" | "developer";
  pageRange?: string;
}

interface SingleExportResult {
  type: "zip" | "file";
  buffer: Uint8Array;
  contentType: string;
  fileName: string;
}

export class ExportUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly tagRepository: ITagRepository,
    private readonly folderRepository: IFolderRepository,
    private readonly tagDocumentRepository: ITagDocumentRepository,
  ) {}

  async exportSingle(
    documentId: string,
    options: ExportOptions,
    session: AuthSession,
  ): Promise<SingleExportResult> {
    const document = await resolveDocumentForExport(documentId, session);
    const [tags, folder, ocr, pipeline] = await Promise.all([
      resolveTagsForExport(documentId),
      resolveFolderForExport(document.folderId),
      resolveOcrData(documentId),
      resolvePipelineData(documentId),
    ]);
    const metadata = await buildExportMetadata(
      document,
      tags,
      folder,
      ocr,
      pipeline,
      options.profile,
    );

    if (options.format === "zip") {
      return this.buildZipExport(document, tags, folder, metadata, options);
    }

    return this.buildSingleFileExport(document, options.format, pipeline, options);
  }

  private async buildZipExport(
    document: {
      id: string;
      title: string;
      fileName: string;
      originalName: string;
      pageCount: number | null;
    },
    tags: { name: string }[],
    folder: { path: string } | null,
    metadata: ExportMetadata,
    options: ExportOptions,
  ): Promise<SingleExportResult> {
    const config = loadConfig();
    let rawText = "";
    let markdown = "";

    const ocrKey = `${config.paths.ocrResults}/${document.id}/text.json`;
    const ocrExists = await fileExists(config, ocrKey);
    if (ocrExists) {
      const ocrBuffer = await downloadFile(config, ocrKey);
      try {
        const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
        rawText = ocrData.text || "";
      } catch {
        rawText = "";
      }
    }

    const outputKey = `${config.paths.exports}/${document.id}/output.md`;
    const mdExists = await fileExists(config, outputKey);
    if (mdExists) {
      const mdBuffer = await downloadFile(config, outputKey);
      markdown = mdBuffer.toString("utf-8");
      if (!rawText) rawText = markdown;
    }

    let sourceBuffer: Buffer | undefined;
    if (options.includeSource) {
      const sourceKey = `${config.paths.uploads}/${document.id}/${document.fileName}`;
      const srcExists = await fileExists(config, sourceKey);
      if (srcExists) {
        sourceBuffer = await downloadFile(config, sourceKey);
      }
    }

    const exportId = `exp_${document.id}_${Date.now()}`;
    const zipBuffer = await buildZipPackage({
      exportId,
      documents: [
        {
          id: document.id,
          title: document.title,
          tags: tags.map((t) => t.name),
          folderPath: folder?.path ?? "",
          pageCount: document.pageCount,
          metadata,
          rawText,
          markdown,
          sourceBuffer,
          sourceFileName: document.originalName,
        },
      ],
      profile: options.profile,
      includeSource: options.includeSource,
    });

    const { sanitizeTitle, getContentType } = await import("@/lib/export/profiles");
    const zipName = `${sanitizeTitle(document.title)}_${new Date().toISOString().split("T")[0]}.zip`;

    return {
      type: "zip",
      buffer: new Uint8Array(zipBuffer),
      contentType: getContentType("zip"),
      fileName: zipName,
    };
  }

  private async buildSingleFileExport(
    document: { id: string; title: string; pageCount: number | null },
    format: string,
    pipeline: { wordCount: number; pageCount?: number },
    options: ExportOptions,
  ): Promise<SingleExportResult> {
    // For text-based formats, generate on-demand from OCR text
    const textFormats = ["md", "txt", "json"];
    if (textFormats.includes(format)) {
      return this.generateTextFormat(document, format, pipeline);
    }

    // For binary formats (pdf, docx, epub), generate on-demand
    const binaryFormats = ["pdf", "docx", "epub"];
    if (binaryFormats.includes(format)) {
      return this.generateBinaryFormat(document, format, pipeline, options);
    }

    throw new AppError(`Unsupported format: ${format}`, "VALIDATION_ERROR", 400);
  }

  private async generateTextFormat(
    document: { id: string; title: string; pageCount: number | null },
    format: string,
    pipeline: { wordCount: number; pageCount?: number },
  ): Promise<SingleExportResult> {
    const config = loadConfig();
    const { sanitizeTitle, getContentType } = await import("@/lib/export/profiles");

    // Try to read pre-generated output first
    const outputKey = `${config.paths.exports}/${document.id}/output.${format}`;
    const exportKey = `${config.paths.exports}/${document.id}/export.${format}`;
    const key = (await fileExists(config, outputKey))
      ? outputKey
      : (await fileExists(config, exportKey))
        ? exportKey
        : null;

    if (key) {
      const buffer = await downloadFile(config, key);
      return {
        type: "file",
        buffer: new Uint8Array(buffer),
        contentType: getContentType(format),
        fileName: `${sanitizeTitle(document.title)}.${format}`,
      };
    }

    // Generate on-demand from OCR text
    const ocrKey = `${config.paths.ocrResults}/${document.id}/text.json`;
    const ocrExists = await fileExists(config, ocrKey);
    if (!ocrExists) {
      throw new NotFoundError("OCR text not available for this document");
    }

    const ocrBuffer = await downloadFile(config, ocrKey);
    const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
    const rawText: string = ocrData.text || "";

    const { generateMarkdown, generateTxt, generateJson } =
      await import("@ibn-al-azhar-docs/pipeline");
    const cleaned = generateMarkdown(rawText, { pageCount: pipeline.pageCount });

    let outputBuffer: Buffer;
    switch (format) {
      case "md":
        outputBuffer = Buffer.from(cleaned.markdown, "utf-8");
        break;
      case "txt":
        outputBuffer = Buffer.from(generateTxt(cleaned), "utf-8");
        break;
      case "json":
        outputBuffer = Buffer.from(generateJson(cleaned), "utf-8");
        break;
      default:
        throw new AppError(`Unsupported text format: ${format}`, "VALIDATION_ERROR", 400);
    }

    // Cache the generated file
    const outputFilePath = `${config.paths.exports}/${document.id}/export.${format}`;
    await uploadBuffer(config, outputFilePath, outputBuffer, getContentType(format));

    return {
      type: "file",
      buffer: new Uint8Array(outputBuffer),
      contentType: getContentType(format),
      fileName: `${sanitizeTitle(document.title)}.${format}`,
    };
  }

  private async generateBinaryFormat(
    document: { id: string; title: string; pageCount: number | null },
    format: string,
    pipeline: { wordCount: number; pageCount?: number },
    options: ExportOptions,
  ): Promise<SingleExportResult> {
    const config = loadConfig();
    const { sanitizeTitle, getContentType } = await import("@/lib/export/profiles");

    // Try to read pre-generated output first
    const outputKey = `${config.paths.exports}/${document.id}/output.${format}`;
    const exportKey = `${config.paths.exports}/${document.id}/export.${format}`;
    const key = (await fileExists(config, outputKey))
      ? outputKey
      : (await fileExists(config, exportKey))
        ? exportKey
        : null;

    if (key) {
      const buffer = await downloadFile(config, key);
      return {
        type: "file",
        buffer: new Uint8Array(buffer),
        contentType: getContentType(format),
        fileName: `${sanitizeTitle(document.title)}.${format}`,
      };
    }

    // Generate on-demand from OCR text
    const ocrKey = `${config.paths.ocrResults}/${document.id}/text.json`;
    const ocrExists = await fileExists(config, ocrKey);
    if (!ocrExists) {
      throw new NotFoundError("OCR text not available for this document");
    }

    const ocrBuffer = await downloadFile(config, ocrKey);
    const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
    const rawText: string = ocrData.text || "";

    const { generateMarkdown } = await import("@ibn-al-azhar-docs/pipeline");
    const cleaned = generateMarkdown(rawText, {
      pageCount: document.pageCount ?? pipeline.pageCount,
    });

    let outputBuffer: Buffer;
    switch (format) {
      case "pdf": {
        const { generatePdf } = await import("@ibn-al-azhar-docs/pipeline");
        outputBuffer = await generatePdf(cleaned, {
          fontSize: undefined,
          watermark: undefined,
          pageRange: options.pageRange,
        });
        break;
      }
      case "docx": {
        const { generateDocx } = await import("@ibn-al-azhar-docs/pipeline");
        outputBuffer = await generateDocx(cleaned);
        break;
      }
      case "epub": {
        const { generateEpub } = await import("@ibn-al-azhar-docs/pipeline");
        outputBuffer = await generateEpub(cleaned);
        break;
      }
      default:
        throw new AppError(`Unsupported binary format: ${format}`, "VALIDATION_ERROR", 400);
    }

    // Cache the generated file
    const outputFilePath = `${config.paths.exports}/${document.id}/export.${format}`;
    await uploadBuffer(config, outputFilePath, outputBuffer, getContentType(format));

    return {
      type: "file",
      buffer: new Uint8Array(outputBuffer),
      contentType: getContentType(format),
      fileName: `${sanitizeTitle(document.title)}.${format}`,
    };
  }

  async exportByTag(tagId: string, options: ExportOptions, session: AuthSession) {
    const tag = await this.tagRepository.findFirst(ownedWhere({ id: tagId }, session));
    if (!tag) throw new NotFoundError("Tag not found");

    const tagDocs = await this.tagDocumentRepository.findMany({
      where: { tagId },
      include: { document: true },
    });

    const allDocuments = tagDocs.map((td) => td.document);
    const documents = allDocuments.filter(
      (doc): doc is NonNullable<typeof doc> =>
        doc != null &&
        typeof doc === "object" &&
        "deletedAt" in doc &&
        doc.deletedAt === null &&
        (isAdminRole(session.user.role) || ("userId" in doc && doc.userId === session.user.id)),
    ) as import("@prisma/client").Document[];

    if (documents.length === 0) throw new NotFoundError("No documents with this tag");

    if (options.format !== "zip") {
      throw new AppError("Tag export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Tag_${tag.name}_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      documents,
      { ...options, userId: session.user.id },
      "exp_tag",
      zipName,
    );
  }

  async exportByFolder(
    folderId: string,
    options: ExportOptions & { recursive?: boolean },
    session: AuthSession,
  ) {
    const folder = await this.folderRepository.findFirst(ownedWhere({ id: folderId }, session));
    if (!folder) throw new NotFoundError("Folder not found");

    const folderIds: string[] = [folderId];

    if (options.recursive) {
      const collectChildFolderIds = async (parentId: string): Promise<void> => {
        const children = await this.folderRepository.findMany({
          where: ownedWhere({ parentId }, session),
          select: { id: true },
        });
        for (const child of children) {
          folderIds.push(child.id);
          await collectChildFolderIds(child.id);
        }
      };
      await collectChildFolderIds(folderId);
    }

    const documents = await this.documentRepository.findMany({
      where: ownedWhere({ folderId: { in: folderIds }, deletedAt: null }, session),
    });

    if (documents.length === 0) throw new NotFoundError("Folder is empty");

    if (options.format !== "zip") {
      throw new AppError("Folder export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Folder_${folder.name}_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      documents,
      { ...options, userId: session.user.id },
      "exp_folder",
      zipName,
    );
  }

  async exportByBatch(documentIds: string[], options: ExportOptions, session: AuthSession) {
    const validDocs = await this.documentRepository.findMany({
      where: ownedWhere({ id: { in: documentIds }, deletedAt: null }, session),
    });

    if (validDocs.length === 0) throw new NotFoundError("No documents found");

    if (validDocs.length !== documentIds.length) {
      const foundIds = new Set(validDocs.map((d) => d.id));
      const missing = documentIds.filter((id) => !foundIds.has(id));
      throw new NotFoundError(`لم يتم العثور على بعض المستندات: ${missing.join(", ")}`);
    }

    if (options.format !== "zip") {
      throw new AppError("Batch export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Export_${validDocs.length}_docs_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      validDocs,
      { ...options, userId: session.user.id },
      "exp_batch",
      zipName,
    );
  }
}
