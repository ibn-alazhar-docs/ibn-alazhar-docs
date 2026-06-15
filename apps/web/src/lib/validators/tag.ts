import { z } from "zod";

const MAX_TAGS_PER_USER = 50;

export const TAG_COLORS = [
  "#16A34A",
  "#2563EB",
  "#DC2626",
  "#CA8A04",
  "#9333EA",
  "#EA580C",
  "#0891B2",
  "#DB2777",
  "#4F46E5",
  "#059669",
] as const;

export const createTagSchema = z.object({
  name: z.string().min(1, "اسم الوسم مطلوب").max(50, "اسم الوسم طويل جداً").trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "اللون غير صالح")
    .optional()
    .default("#16A34A"),
});

export const updateTagSchema = z.object({
  name: z.string().min(1, "اسم الوسم مطلوب").max(50, "اسم الوسم طويل جداً").trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "اللون غير صالح")
    .optional(),
});

export const mergeTagsSchema = z.object({
  sourceTagId: z.string().min(1, "الوسم المصدر مطلوب"),
  targetTagId: z.string().min(1, "الوسم الهدف مطلوب"),
});

export const addTagToDocumentSchema = z.object({
  tagId: z.string().min(1, "معرف الوسم مطلوب"),
});

export const setDocumentTagsSchema = z.object({
  tagIds: z.array(z.string()).max(MAX_TAGS_PER_USER, "عدد كبير جداً من الأوسمة"),
});

export const bulkTagSchema = z.object({
  documentIds: z
    .array(z.string())
    .min(1, "اختر مستنداً واحداً على الأقل")
    .max(50, "الحد الأقصى 50 مستنداً في الدفعة الواحدة"),
  tagId: z.string().min(1, "معرف الوسم مطلوب"),
});

export const bulkUntagSchema = z.object({
  documentIds: z
    .array(z.string())
    .min(1, "اختر مستنداً واحداً على الأقل")
    .max(50, "الحد الأقصى 50 مستنداً في الدفعة الواحدة"),
  tagId: z.string().min(1, "معرف الوسم مطلوب"),
});

export { MAX_TAGS_PER_USER };
