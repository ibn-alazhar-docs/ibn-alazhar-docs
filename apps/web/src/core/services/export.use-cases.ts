import { ownedWhere } from "@/core/authorization";
import type { AuthSession } from "@/domain/types";
import { NotFoundError, AppError } from "@/shared/errors";
import { executeBulkExport } from "@/core/services/export/bulk-export-helpers";
import {
  resolveDocumentForExport,
  resolveTagsForExport,
  resolveFolderForExport,
  resolveOcrData,
  resolvePipelineData,
  buildExportMetadata,
} from "@/core/services/export/metadata";
import { buildZipPackage } from "@/core/services/export/zip-builder";
import type { ExportMetadata } from "@/core/services/export/types";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";
import type { IConversionJobRepository } from "@/domain/repositories/conversion-job.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";

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
    private readonly conversionJobRepository: IConversionJobRepository,
    private readonly storage: IStorageRepository,
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
      resolvePipelineData(documentId, this.storage),
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
    let rawText = "";
    let markdown = "";

    const ocrBuffer = await this.storage.downloadIfExists(this.storage.ocrTextKey(document.id));
    if (ocrBuffer) {
      try {
        const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
        rawText = ocrData.text || "";
      } catch {
        rawText = "";
      }
    }

    const mdBuffer = await this.storage.downloadIfExists(
      this.storage.exportOutputKey(document.id, "md"),
    );
    if (mdBuffer) {
      markdown = mdBuffer.toString("utf-8");
      if (!rawText) rawText = markdown;
    }

    let sourceBuffer: Buffer | undefined;
    if (options.includeSource) {
      sourceBuffer =
        (await this.storage.downloadIfExists(
          this.storage.sourceKey(document.id, document.fileName),
        )) ?? undefined;
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

    const { sanitizeTitle, getContentType } = await import("@/core/services/export/profiles");
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
    const textFormats = ["md", "txt", "json"];
    if (textFormats.includes(format)) {
      return this.generateTextFormat(document, format, pipeline);
    }

    const binaryFormats = ["pdf", "docx", "epub"];
    if (binaryFormats.includes(format)) {
      return this.generateBinaryFormat(document, format, pipeline, options);
    }

    throw new AppError(`Unsupported format: ${format}`, "VALIDATION_ERROR", 400);
  }

  private async findCachedExport(documentId: string, format: string): Promise<Buffer | null> {
    const outputKey = this.storage.exportOutputKey(documentId, format);
    const exportKey = this.storage.exportCacheKey(documentId, format);

    if (await this.storage.fileExists(outputKey)) {
      return this.storage.downloadFile(outputKey);
    }
    if (await this.storage.fileExists(exportKey)) {
      return this.storage.downloadFile(exportKey);
    }
    return null;
  }

  private async generateTextFormat(
    document: { id: string; title: string; pageCount: number | null },
    format: string,
    pipeline: { wordCount: number; pageCount?: number },
  ): Promise<SingleExportResult> {
    const { sanitizeTitle, getContentType } = await import("@/core/services/export/profiles");

    const cached = await this.findCachedExport(document.id, format);
    if (cached) {
      return {
        type: "file",
        buffer: new Uint8Array(cached),
        contentType: getContentType(format),
        fileName: `${sanitizeTitle(document.title)}.${format}`,
      };
    }

    const ocrKey = this.storage.ocrTextKey(document.id);
    if (!(await this.storage.fileExists(ocrKey))) {
      throw new NotFoundError("OCR text not available for this document");
    }

    const ocrData = JSON.parse(await this.storage.downloadAsString(ocrKey));
    const rawText: string = ocrData.text || "";

    const { generateMarkdown, generateTxt, generateJson } = await import(
      "@ibn-al-azhar-docs/pipeline"
    );
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

    await this.storage.uploadBuffer(
      this.storage.exportCacheKey(document.id, format),
      outputBuffer,
      getContentType(format),
    );

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
    const { sanitizeTitle, getContentType } = await import("@/core/services/export/profiles");

    const cached = await this.findCachedExport(document.id, format);
    if (cached) {
      return {
        type: "file",
        buffer: new Uint8Array(cached),
        contentType: getContentType(format),
        fileName: `${sanitizeTitle(document.title)}.${format}`,
      };
    }

    const ocrKey = this.storage.ocrTextKey(document.id);
    if (!(await this.storage.fileExists(ocrKey))) {
      throw new NotFoundError("OCR text not available for this document");
    }

    const ocrData = JSON.parse(await this.storage.downloadAsString(ocrKey));
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

    await this.storage.uploadBuffer(
      this.storage.exportCacheKey(document.id, format),
      outputBuffer,
      getContentType(format),
    );

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
    // كل مستخدم يرى مستنداته المرتبطة بالوسم فقط
    const documents = allDocuments.filter(
      (doc): doc is NonNullable<typeof doc> =>
        doc != null &&
        typeof doc === "object" &&
        "deletedAt" in doc &&
        doc.deletedAt === null &&
        "userId" in doc &&
        doc.userId === session.user.id,
    ) as import("@prisma/client").Document[];

    if (documents.length === 0) throw new NotFoundError("No documents with this tag");

    if (options.format !== "zip") {
      throw new AppError("Tag export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Tag_${tag.name}_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      documents,
      { ...options, userId: session.user.id },
      this.storage,
      {
        tagDocument: this.tagDocumentRepository,
        conversionJob: this.conversionJobRepository,
        folder: this.folderRepository,
      },
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

    let folderIds: string[] = [folderId];

    if (options.recursive) {
      const descendantIds = await this.folderRepository.getDescendantIds(folderId, session.user.id);
      folderIds = [...folderIds, ...descendantIds];
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
      this.storage,
      {
        tagDocument: this.tagDocumentRepository,
        conversionJob: this.conversionJobRepository,
        folder: this.folderRepository,
      },
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
      throw new NotFoundError(`لم يُعثر على بعض المستندات: ${missing.join(", ")}`);
    }

    if (options.format !== "zip") {
      throw new AppError("Batch export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Export_${validDocs.length}_docs_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      validDocs,
      { ...options, userId: session.user.id },
      this.storage,
      {
        tagDocument: this.tagDocumentRepository,
        conversionJob: this.conversionJobRepository,
        folder: this.folderRepository,
      },
      "exp_batch",
      zipName,
    );
  }
}
