import { z } from "zod";
import { EXPORT_FORMATS, EXPORT_PROFILES } from "./types";

export const singleExportSchema = z
  .object({
    documentId: z.string().min(1, "Document ID required"),
    format: z.enum(EXPORT_FORMATS, { error: "Unsupported format" }),
    profile: z.enum(EXPORT_PROFILES, { error: "Unsupported profile" }),
    includeSource: z.boolean().optional().default(false),
    pageRange: z.string().optional(),
  })
  .strip();

export const batchExportSchema = z
  .object({
    documentIds: z
      .array(z.string().min(1))
      .min(1, "Document IDs required")
      .max(50, "Max 50 per batch"),
    format: z.enum(EXPORT_FORMATS, { error: "Unsupported format" }),
    profile: z.enum(EXPORT_PROFILES, { error: "Unsupported profile" }),
    includeSource: z.boolean().optional().default(false),
  })
  .strip();

export const folderExportSchema = z
  .object({
    folderId: z.string().min(1, "Folder ID required"),
    format: z.enum(EXPORT_FORMATS, { error: "Unsupported format" }),
    profile: z.enum(EXPORT_PROFILES, { error: "Unsupported profile" }),
    includeSource: z.boolean().optional().default(false),
    recursive: z.boolean().optional().default(true),
  })
  .strip();

export const tagExportSchema = z
  .object({
    tagId: z.string().min(1, "Tag ID required"),
    format: z.enum(EXPORT_FORMATS, { error: "Unsupported format" }),
    profile: z.enum(EXPORT_PROFILES, { error: "Unsupported profile" }),
    includeSource: z.boolean().optional().default(false),
  })
  .strip();
