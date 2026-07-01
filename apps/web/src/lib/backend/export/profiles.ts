import type { ExportProfileConfig, ExportProfile } from "./types";
import { CONTENT_LIMITS } from "@/lib/shared/constants";

export function getContentType(format: string): string {
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
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

export const EXPORT_PROFILE_CONFIGS: Record<ExportProfile, ExportProfileConfig> = {
  research: {
    name: "Research",
    description: "Full metadata for academic use",
    formats: ["md", "json", "pdf", "docx"],
    includeMetadata: true,
    includeSource: false,
    includeTags: true,
    includeFolderPath: true,
    metadataLevel: "full",
  },
  archive: {
    name: "Archive",
    description: "Complete bundle with source file",
    formats: ["md", "txt", "json", "pdf", "docx", "epub"],
    includeMetadata: true,
    includeSource: true,
    includeTags: true,
    includeFolderPath: true,
    metadataLevel: "full",
  },
  plain: {
    name: "Plain text",
    description: "Text only, no metadata",
    formats: ["txt"],
    includeMetadata: false,
    includeSource: false,
    includeTags: false,
    includeFolderPath: false,
    metadataLevel: "minimal",
  },
  developer: {
    name: "Developer",
    description: "JSON for automation",
    formats: ["json"],
    includeMetadata: true,
    includeSource: false,
    includeTags: true,
    includeFolderPath: true,
    metadataLevel: "full",
  },
};

export function getProfileConfig(profile: ExportProfile): ExportProfileConfig {
  return EXPORT_PROFILE_CONFIGS[profile];
}

export function sanitizeTitle(title: string): string {
  let sanitized = title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .trim();

  if (sanitized.length > CONTENT_LIMITS.MAX_TITLE_LENGTH) {
    sanitized = sanitized.substring(0, 100);
  }

  if (!sanitized) {
    sanitized = "untitled";
  }

  return sanitized;
}

export function contentDispositionHeader(filename: string): string {
  const asciiSafe =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/\s+/g, "_")
      .trim() || "download";

  const encoded = encodeURIComponent(filename)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");

  return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${encoded}`;
}
