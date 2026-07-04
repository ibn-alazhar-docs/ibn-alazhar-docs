import { GoogleGenerativeAI } from "@google/generative-ai";
import { ownedWhere } from "@/core/authorization";
import type { AuthSession } from "@/domain/types";
import { NotFoundError, ValidationError } from "@/lib/shared/errors";
import { logger } from "@ibn-al-azhar-docs/shared";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export interface TagSuggestion {
  name: string;
  confidence: number;
  existingTagId: string | null;
}

export class AutoTagUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly storageRepository: IStorageRepository,
    private readonly tagRepository: ITagRepository,
  ) {}

  async suggestTags(documentId: string, session: AuthSession): Promise<TagSuggestion[]> {
    if (!GEMINI_API_KEY) {
      throw new ValidationError("Gemini API Key is not configured");
    }

    const doc = await this.documentRepository.findFirst(
      ownedWhere({ id: documentId, deletedAt: null }, session),
      {
        id: true,
        title: true,
        description: true,
        outputKeys: true,
        outputFormats: true,
        language: true,
      },
    );

    if (!doc) throw new NotFoundError("المستند غير موجود");

    const mdFormat = (doc.outputFormats as string[]) ?? [];
    if (!mdFormat.includes("md")) {
      throw new ValidationError("المستند لم تكمل معالجته بعد");
    }

    const outputKeys = (doc.outputKeys ?? {}) as Record<string, string>;
    const mdKey = outputKeys["md"];
    if (!mdKey) {
      throw new ValidationError("ملف المحتوى غير موجود");
    }

    const buffer = await this.storageRepository.downloadFile(mdKey);
    const content = buffer.toString("utf-8");
    const preview = content.slice(0, 3000);

    const existingTags = await this.tagRepository.findMany({
      userId: session.user.id,
      deletedAt: null,
    });

    const tagNames = existingTags.map((t) => t.name);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `أنت نظام ذكي لاقتراح وسوم للمستندات. قم بتحليل المحتوى التالي واقترح 3-5 وسوم مناسبة.

عنوان المستند: ${doc.title}
${doc.description ? `وصف: ${doc.description}` : ""}
لغة المستند: ${doc.language === "ar" ? "العربية" : "English"}

المحتوى:
${preview}

الوسوم الموجودة لدى المستخدم:
${tagNames.length > 0 ? tagNames.join("، ") : "لا توجد وسوم"}

تعليمات:
1. اقترح وسوماً وصفية تعكس محتوى المستند بدقة
2. استخدم العربية إذا كان المستند بالعربية
3. تجنب الوسوم المكررة أو المتشابهة جداً
4. رتب حسب الأهمية (الأكثر صلة أولاً)

أرجع النتيجة كمصفوفة JSON فقط، بدون أي نص إضافي:
[
  {"name": "الوسم", "confidence": 0.95},
  ...
]`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new ValidationError("فشل في تحليل استجابة الذكاء الاصطناعي");
      }

      const suggestions: Array<{ name: string; confidence: number }> = JSON.parse(jsonMatch[0]);
      const existingTagMap = new Map(existingTags.map((t) => [t.name.toLowerCase(), t.id]));

      const results: TagSuggestion[] = suggestions.slice(0, 5).map((s) => ({
        name: s.name,
        confidence: Math.min(1, Math.max(0, s.confidence)),
        existingTagId: existingTagMap.get(s.name.toLowerCase()) ?? null,
      }));

      return results;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      logger.error(error, "Auto-tag Gemini error");
      throw new ValidationError("فشل في توليد اقتراحات الوسوم");
    }
  }
}
