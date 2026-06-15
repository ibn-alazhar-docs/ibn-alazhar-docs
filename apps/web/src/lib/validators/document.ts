import { z } from "zod";

export const documentUpdateSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب").max(200, "العنوان طويل جداً").optional(),
  description: z.string().max(500, "الوصف طويل جداً").nullable().optional(),
  folderId: z.string().nullable().optional(),
});

export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
