import type { IDocumentRepository } from "../../domain/repositories/document.repository.interface";
import type { ITagRepository } from "../../domain/repositories/tag.repository.interface";
import type { AuthSession } from "../../domain/types";
import { stripArabicMarks } from "@/shared/arabic-ranges";
import { normalizeArabicForSearch } from "@/shared/arabic-search-normalize";
import { assertDocument } from "./assert-document";

export interface TagSuggestion {
  name: string;
  score: number;
  type: "existing" | "new";
  reason?: string;
}

interface AutoTagDocument {
  title: string;
  description: string | null;
  originalName: string;
  fileName: string;
  tags: { tag: { id: string; name: string; color: string } }[];
}

// الوسم المُقترح يُعرض كما كُتب في الأصل بحروفه، بلا تشكيل فقط (المُنتَج نسخة
// من الأصل)؛ أما المقارنة وإلغاء التكرار فيعملان على التطبيع القياسي للبحث —
// المصدر واحد: @/shared/arabic-search-normalize (المقفول على normalize_arabic
// في SQL). كان الطي يُخزَّن داخل اسم الوسم نفسه فتُعرض «صحه» بدل «صحة».
interface TagToken {
  /** شكل العرض: أصل الحروف مع إزالة علامات التشكيل فقط. */
  display: string;
  /** شكل المقارنة: تطبيع البحث القياسي. */
  norm: string;
}

const STOPWORDS = new Set<string>([
  // Arabic
  "في",
  "من",
  "إلى",
  "على",
  "مع",
  "هذا",
  "هذه",
  "ذلك",
  "تلك",
  "وقد",
  "كان",
  "كانت",
  "يكون",
  "يكون",
  "هو",
  "هي",
  "他们",
  "نحن",
  "انت",
  "انها",
  "عن",
  "او",
  "اما",
  "ان",
  "ان",
  "لا",
  "ما",
  "لم",
  "لن",
  "به",
  "بها",
  "وب",
  "فى",
  "ثم",
  "حتى",
  "غير",
  "كل",
  "بعض",
  "هناك",
  "هنا",
  "عند",
  "بلغ",
  "عدد",
  "خلال",
  "بين",
  "ضمن",
  // English
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "have",
  "has",
  "was",
  "were",
  "been",
  "will",
  "would",
  "should",
  "can",
  "could",
  "may",
  "file",
  "document",
  "doc",
  "pdf",
  "page",
  "pages",
  "untitled",
  "copy",
]);

function toTagToken(token: string): TagToken {
  return {
    display: token.trim(),
    norm: normalizeArabicForSearch(token),
  };
}

// تُنزَع العلامات قبل التقسيم: تنظيف «ما ليس حرفًا» يستبدلها بمسافة، فلو بقي
// التشكيل لانشقّت «صحّة» إلى «صح» + «ة» وضاع الوسم أصلًا.
function tokenize(text: string): TagToken[] {
  const cleaned = stripArabicMarks(text).replace(/[^\p{L}\p{N}\s]/gu, " ");
  return cleaned
    .split(/\s+/)
    .map(toTagToken)
    .filter((t) => t.norm.length >= 2 && !STOPWORDS.has(t.norm));
}

export class AutoTagUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly tagRepository: ITagRepository,
  ) {}

  async suggestTags(documentId: string, session: AuthSession): Promise<TagSuggestion[]> {
    const document = (await this.documentRepository.findDocumentById(documentId, session.user.id, {
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
    })) as AutoTagDocument | null;
    assertDocument(document);

    // كل مستخدم يرى الوسوم الخاصة به فقط
    const existingTags = await this.tagRepository.findMany({
      userId: session.user.id,
      deletedAt: null,
    });

    const corpus = [document.title, document.description, document.originalName, document.fileName]
      .filter(Boolean)
      .join(" ");
    const corpusTokens = tokenize(corpus);
    const corpusSet = new Set(corpusTokens.map((t) => t.norm));
    const frequency = new Map<string, number>();
    const displayByNorm = new Map<string, string>();
    for (const token of corpusTokens) {
      frequency.set(token.norm, (frequency.get(token.norm) ?? 0) + 1);
      if (!displayByNorm.has(token.norm)) displayByNorm.set(token.norm, token.display);
    }

    const appliedNames = new Set(document.tags.map((td) => normalizeArabicForSearch(td.tag.name)));
    const existingNameNorm = new Set(existingTags.map((t) => normalizeArabicForSearch(t.name)));
    const existingTokenNorm = new Set<string>();
    for (const tag of existingTags) {
      for (const tk of tokenize(tag.name)) existingTokenNorm.add(tk.norm);
    }

    const suggestions: TagSuggestion[] = [];

    for (const tag of existingTags) {
      const tagNameNorm = normalizeArabicForSearch(tag.name);
      if (appliedNames.has(tagNameNorm)) continue;

      const tagTokens = tokenize(tag.name);
      if (tagTokens.length === 0) continue;

      let matched = 0;
      for (const tk of tagTokens) if (corpusSet.has(tk.norm)) matched += 1;

      if (
        matched === 0 &&
        normalizeArabicForSearch(corpus).includes(normalizeArabicForSearch(tag.name))
      )
        matched = tagTokens.length;
      if (matched === 0) continue;

      const coverage = matched / tagTokens.length;
      suggestions.push({
        name: tag.name,
        score: Math.round(coverage * 100) / 100,
        type: "existing",
        reason: coverage >= 1 ? "يطابق عنوان المستند أو وصفه" : "يتطابق جزئياً مع نص المستند",
      });
    }

    const maxFreq = Math.max(1, ...frequency.values());
    const candidateFreq = new Map<string, number>();
    for (const [norm, count] of frequency) {
      if (existingTokenNorm.has(norm)) continue;
      if (existingNameNorm.has(norm)) continue;
      candidateFreq.set(norm, count);
    }
    const newCandidates = [...candidateFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([norm, count]) => ({
        name: displayByNorm.get(norm) ?? norm,
        score: Math.round((count / maxFreq) * 100) / 100,
        type: "new" as const,
        reason: "كلمة بارزة مقترحة من المستند",
      }));

    const ranked = [...suggestions, ...newCandidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    return ranked;
  }
}
