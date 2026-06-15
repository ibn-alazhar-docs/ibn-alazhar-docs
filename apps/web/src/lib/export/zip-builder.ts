import JSZip from "jszip";
import type { ExportMetadata, ExportManifest, ManifestDocument, ExportProfile } from "./types";
import { sanitizeTitle, getProfileConfig } from "./profiles";

function buildFrontmatter(metadata: ExportMetadata, tags: string[]): string {
  const lines: string[] = ["---"];
  lines.push(`title: "${metadata.source.title}"`);
  lines.push(`created: "${metadata.dates.created}"`);
  lines.push(`updated: "${metadata.dates.updated}"`);
  if (tags.length > 0) {
    lines.push(`tags: [${tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  if (metadata.folder) {
    lines.push(`folder: "${metadata.folder.path}"`);
  }
  lines.push(`source_file: "${metadata.source.originalName}"`);
  if (metadata.ocr.pageCount > 0) {
    lines.push(`page_count: ${metadata.ocr.pageCount}`);
  }
  if (metadata.pipeline.wordCount > 0) {
    lines.push(`word_count: ${metadata.pipeline.wordCount}`);
  }
  if (metadata.ocr.confidence > 0) {
    lines.push(`ocr_confidence: ${metadata.ocr.confidence}`);
  }
  lines.push(`ocr_engine: "${metadata.ocr.engine}"`);
  lines.push(`language: "${metadata.source.language}"`);
  lines.push(`generator: "${metadata.export.generator}"`);
  lines.push("---");
  return lines.join("\n");
}

function buildTxtHeader(metadata: ExportMetadata, tags: string[]): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push(`# Title: ${metadata.source.title}`);
  if (tags.length > 0) {
    lines.push(`# Tags: ${tags.join(", ")}`);
  }
  if (metadata.folder) {
    lines.push(`# Folder: ${metadata.folder.path}`);
  }
  if (metadata.ocr.pageCount > 0) {
    lines.push(`# Pages: ${metadata.ocr.pageCount}`);
  }
  if (metadata.pipeline.wordCount > 0) {
    lines.push(`# Words: ${metadata.pipeline.wordCount}`);
  }
  if (metadata.ocr.confidence > 0) {
    lines.push(`# Confidence: ${(metadata.ocr.confidence * 100).toFixed(0)}%`);
  }
  lines.push(`# Exported: ${metadata.dates.exported}`);
  lines.push("=".repeat(60));
  lines.push("");
  return lines.join("\n");
}

function buildJsonExport(metadata: ExportMetadata, rawText: string, markdown: string): string {
  return JSON.stringify(
    {
      version: "1.0",
      source: metadata.source,
      tags: metadata.tags,
      folder: metadata.folder,
      ocr: metadata.ocr,
      pipeline: metadata.pipeline,
      dates: metadata.dates,
      content: {
        raw: rawText,
        cleaned: rawText,
        markdown,
      },
      export: metadata.export,
    },
    null,
    2,
  );
}

function buildManifest(
  exportId: string,
  profile: ExportProfile,
  documents: ManifestDocument[],
  totalSize: number,
): ExportManifest {
  return {
    exportId,
    exportedAt: new Date().toISOString(),
    generator: "ibn-al-azhar-docs/v1",
    profile,
    documentCount: documents.length,
    totalSize,
    documents,
  };
}

function buildReadme(documents: ManifestDocument[], exportedAt: string): string {
  const lines: string[] = [];
  lines.push(`# Export — ${exportedAt}`);
  lines.push("");
  lines.push(`**${documents.length} documents**`);
  lines.push("");
  lines.push("## Index");
  lines.push("");
  lines.push("| # | Title | Tags | Folder | Pages |");
  lines.push("|---|-------|------|--------|-------|");

  documents.forEach((doc, i) => {
    const tags = doc.tags.length > 0 ? doc.tags.join(", ") : "—";
    const folder = doc.folder || "—";
    const pages = doc.pageCount?.toString() || "—";
    lines.push(`| ${i + 1} | ${doc.title} | ${tags} | ${folder} | ${pages} |`);
  });

  lines.push("");
  return lines.join("\n");
}

export interface ZipBuildDocument {
  id: string;
  title: string;
  tags: string[];
  folderPath: string;
  pageCount: number | null;
  metadata: ExportMetadata;
  rawText: string;
  markdown: string;
  sourceBuffer?: Buffer;
  sourceFileName?: string;
}

export interface ZipBuildOptions {
  exportId: string;
  documents: ZipBuildDocument[];
  profile: ExportProfile;
  includeSource: boolean;
}

export async function buildZipPackage(options: ZipBuildOptions): Promise<Buffer> {
  const { exportId, documents, profile, includeSource } = options;
  const profileConfig = getProfileConfig(profile);
  const zip = new JSZip();

  const manifestDocs: ManifestDocument[] = [];
  let totalSize = 0;

  if (documents.length > 1) {
    const readmeDocs = documents.map((d) => ({
      id: d.id,
      title: d.title,
      tags: d.tags,
      folder: d.folderPath,
      pageCount: d.pageCount,
      files: [],
    }));
    zip.file("README.md", buildReadme(readmeDocs, new Date().toISOString()));
  }

  for (const doc of documents) {
    const sanitizedTitle = sanitizeTitle(doc.title);
    const folderPrefix = documents.length > 1 ? `${sanitizeTitle(doc.folderPath || "根")}/` : "";
    const docFiles: ManifestDocument["files"] = [];

    if (profileConfig.formats.includes("md")) {
      const frontmatter = profileConfig.includeMetadata
        ? buildFrontmatter(doc.metadata, doc.tags) + "\n\n"
        : "";
      const content = frontmatter + doc.markdown;
      const filePath = `${folderPrefix}${sanitizedTitle}.md`;
      zip.file(filePath, content);
      const size = Buffer.byteLength(content, "utf-8");
      docFiles.push({ path: filePath, size, format: "md" });
      totalSize += size;
    }

    if (profileConfig.formats.includes("txt")) {
      const header = profileConfig.includeMetadata ? buildTxtHeader(doc.metadata, doc.tags) : "";
      const plainText = doc.markdown
        .replace(/^---\n[\s\S]*?\n---\n/gm, "")
        .replace(/^### /gm, "")
        .replace(/^## /gm, "")
        .replace(/^# /gm, "")
        .replace(/^- /gm, "• ")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const content = header + plainText;
      const filePath = `${folderPrefix}${sanitizedTitle}.txt`;
      zip.file(filePath, content);
      const size = Buffer.byteLength(content, "utf-8");
      docFiles.push({ path: filePath, size, format: "txt" });
      totalSize += size;
    }

    if (profileConfig.formats.includes("json")) {
      const content = buildJsonExport(doc.metadata, doc.rawText, doc.markdown);
      const filePath = `${folderPrefix}${sanitizedTitle}_metadata.json`;
      zip.file(filePath, content);
      const size = Buffer.byteLength(content, "utf-8");
      docFiles.push({ path: filePath, size, format: "json" });
      totalSize += size;
    }

    if (includeSource && doc.sourceBuffer && doc.sourceFileName) {
      const filePath = `${folderPrefix}source/${doc.sourceFileName}`;
      zip.file(filePath, doc.sourceBuffer);
      const size = doc.sourceBuffer.length;
      docFiles.push({ path: filePath, size, format: "source" });
      totalSize += size;
    }

    manifestDocs.push({
      id: doc.id,
      title: doc.title,
      tags: doc.tags,
      folder: doc.folderPath,
      pageCount: doc.pageCount,
      files: docFiles,
    });
  }

  const manifest = buildManifest(exportId, profile, manifestDocs, totalSize);
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  }) as Promise<Buffer>;
}
