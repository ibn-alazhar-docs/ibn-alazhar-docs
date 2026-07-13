import type { IDocumentRepository } from "../../domain/repositories/document.repository.interface";
import type { ITagRepository } from "../../domain/repositories/tag.repository.interface";
import type { AuthSession } from "../../domain/types";
import { isAdminRole } from "@/domain/auth";
import { NotFoundError } from "@/shared/errors";

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

const ARABIC_DIACRITICS = /[ؐ-ًؚ-ْٰ]/g;

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

function normalizeToken(token: string): string {
  return token
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

function tokenize(text: string): string[] {
  const cleaned = text.replace(/[^\p{L}\p{N}\s]/gu, " ");
  return cleaned
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
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
    if (!document) throw new NotFoundError();

    const admin = isAdminRole(session.user.role);
    const existingTags = await this.tagRepository.findMany(
      admin ? { deletedAt: null } : { userId: session.user.id, deletedAt: null },
    );

    const corpus = [document.title, document.description, document.originalName, document.fileName]
      .filter(Boolean)
      .join(" ");
    const corpusTokens = tokenize(corpus);
    const corpusSet = new Set(corpusTokens);
    const frequency = new Map<string, number>();
    for (const token of corpusTokens) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }

    const appliedNames = new Set(document.tags.map((td) => normalizeToken(td.tag.name)));
    const existingNameNorm = new Set(existingTags.map((t) => normalizeToken(t.name)));
    const existingTokenNorm = new Set<string>();
    for (const tag of existingTags) {
      for (const tk of tokenize(tag.name)) existingTokenNorm.add(tk);
    }

    const suggestions: TagSuggestion[] = [];

    for (const tag of existingTags) {
      const tagNameNorm = normalizeToken(tag.name);
      if (appliedNames.has(tagNameNorm)) continue;

      const tagTokens = tokenize(tag.name);
      if (tagTokens.length === 0) continue;

      let matched = 0;
      for (const tk of tagTokens) if (corpusSet.has(tk)) matched += 1;

      if (matched === 0 && corpus.toLowerCase().includes(tag.name.toLowerCase()))
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
    for (const [token, count] of frequency) {
      if (existingTokenNorm.has(token)) continue;
      if (existingNameNorm.has(token)) continue;
      candidateFreq.set(token, count);
    }
    const newCandidates = [...candidateFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
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
