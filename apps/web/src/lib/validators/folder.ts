import { z } from "zod";

const MAX_FOLDER_DEPTH = 5;

export const createFolderSchema = z.object({
  name: z.string().min(1, "اسم المجلد مطلوب").max(100, "اسم المجلد طويل جداً").trim(),
  parentId: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "اللون غير صالح")
    .nullable()
    .optional(),
  icon: z.string().max(50).nullable().optional(),
});

export const renameFolderSchema = z.object({
  name: z.string().min(1, "اسم المجلد مطلوب").max(100, "اسم المجلد طويل جداً").trim(),
});

export const moveFolderSchema = z.object({
  parentId: z.string().nullable(),
});

export { MAX_FOLDER_DEPTH };
