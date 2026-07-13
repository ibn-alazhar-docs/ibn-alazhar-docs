import { z } from "zod";

export const documentUpdateSchema = z
  .object({
    title: z.string().min(1, "العنوان مطلوب").max(200, "العنوان طويل جداً").optional(),
    description: z.string().max(500, "الوصف طويل جداً").nullable().optional(),
    folderId: z.string().nullable().optional(),
  })
  .strip();

const CUID_REGEX = /^c[a-z0-9]{23,29}$/i;
const PAGE_RANGE_REGEX = /^\d+(-\d+)?$/;
const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_UPLOAD_SIZE_MB = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 200);

export const uploadMetadataSchema = z
  .object({
    folderId: z.string().regex(CUID_REGEX, "معرف المجلد غير صالح").nullable().optional(),
    pageRange: z.string().regex(PAGE_RANGE_REGEX, "نطاق الصفحات غير صالح").nullable().optional(),
  })
  .strip();

export function validateUploadFile(
  file: File | null,
): { valid: true } | { valid: false; error: string; status: number; code: string } {
  if (!file) {
    return { valid: false, error: "لم يُرفق أي ملف", status: 400, code: "VALIDATION_ERROR" };
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "نوع الملف غير مدعوم. ارفع ملف PDF أو صورة (JPG/PNG).",
      status: 400,
      code: "UPLOAD_UNSUPPORTED_TYPE",
    };
  }
  if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `الملف أكبر من الحد المسموح (${MAX_UPLOAD_SIZE_MB}MB). يرجى تقليل الحجم أو تقسيم الملف.`,
      status: 400,
      code: "UPLOAD_FILE_TOO_LARGE",
    };
  }
  return { valid: true };
}
