import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  ARABIC_SEARCH_FOLD_PAIRS,
  normalizeArabicForSearch,
} from "@/shared/arabic-search-normalize";
import { TASHKEEL_SOURCE, TATWEEL_SOURCE } from "@/shared/arabic-ranges";
import { SearchUseCases } from "@/core/services/search.use-cases";
import type { ISearchRepository } from "@/domain/repositories/search.repository.interface";
import { AutoTagUseCases } from "@/core/services/auto-tag.use-cases";
import type { AuthSession } from "@/domain/types";

/**
 * البحث يعمل بطرفين يجب أن يتطابقا حرفًا بحرف: استعلام JS يُطابَع متجهًا طوته
 * SQL بـ normalize_arabic. أي انحراف بينهما نتائج تختفي بصمت — بلا خطأ ولا
 * تلميح — ولهذا حدثت أخطاء «سؤل» و«ٱلله» والعلامات خارج التسع القديمة.
 *
 * هذا الاختبار يقرأ ملف الهجرة نفسه (لا نسخة من تعريفه)، ويستخرج منه أزواج
 * الطي وطبقة العلامات المزالة، ويقارنها بجدول JS نقطةً نقطة على كامل النطاق
 * 0600-08FF. يعمل بدون Postgres: دلالة SQL هنا هي سلاسل regexp_replace التي
 * تُنتجها الهجرة، وهي كل ما يراه المحرك. التنفيذ الحي مقابل قاعدة حقيقية
 * متروك لـ tests/integration/search-postgres.test.ts حين تكون الخدمات قائمة.
 */

const MIGRATION = path.resolve(
  __dirname,
  "../../packages/database/prisma/migrations/20261105000000_normalize_arabic_single_source/migration.sql",
);

const ch = (cp: number) => String.fromCodePoint(cp);

/** يفك طبقة حرفية مكتوبة حرفًا حرفًا: [ا-يب] → نطاق + حرف. */
function expandLiteralClass(content: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < content.length; ) {
    const a = content.codePointAt(i) as number;
    const aLen = String.fromCodePoint(a).length;
    if (content[i + aLen] === "-" && i + aLen + 1 < content.length) {
      const b = content.codePointAt(i + aLen + 1) as number;
      for (let cp = a; cp <= b; cp++) out.push(cp);
      i += aLen + 1 + String.fromCodePoint(b).length;
    } else {
      out.push(a);
      i += aLen;
    }
  }
  return out;
}

/** يفك مصدرًا بصيغة escape: "\\u064B-\\u065F\\u0670" → نقاط. */
function expandEscapeRanges(source: string): number[] {
  const out: number[] = [];
  for (const m of source.matchAll(/\\u([0-9A-Fa-f]{4})(?:-\\u([0-9A-Fa-f]{4}))?/g)) {
    const a = parseInt(m[1] as string, 16);
    const b = m[2] !== undefined ? parseInt(m[2] as string, 16) : a;
    for (let cp = a; cp <= b; cp++) out.push(cp);
  }
  return out;
}

interface ParsedSqlNormalization {
  folds: Map<string, string>;
  removed: Set<number>;
}

function parseMigrationSql(sql: string): ParsedSqlNormalization {
  const folds = new Map<string, string>();
  const removed = new Set<number>();
  const calls = [...sql.matchAll(/regexp_replace\(normalized_text, '([^']+)', '([^']*)', 'g'\)/g)];
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    const pattern = call[1] as string;
    const replacement = call[2] as string;
    const isClass = pattern.startsWith("[") && pattern.endsWith("]");
    const members = isClass
      ? expandLiteralClass(pattern.slice(1, -1)).map((cp) => ch(cp))
      : [pattern];
    if (replacement === "") {
      members.forEach((m) => removed.add(m.codePointAt(0) as number));
    } else {
      expect(members.length).toBeGreaterThan(0);
      for (const member of members) folds.set(member, replacement);
    }
  }
  return { folds, removed };
}

/** إعادة دلالة دقيقة لـ normalize_arabic: إزالة ثم طي (الترتيب لا يضرّب هنا). */
function applySqlNormalization(parsed: ParsedSqlNormalization, text: string): string {
  let out = "";
  for (const char of text) {
    if (parsed.removed.has(char.codePointAt(0) as number)) continue;
    out += parsed.folds.get(char) ?? char;
  }
  // to_tsvector/plainto_tsquery بوضع 'simple' تصغّر ASCII على الطرفين،
  // فالمقارنة بعد التصغير هي المقارنة التي يراها الفهرس فعلًا.
  return out.toLowerCase();
}

const parsed = parseMigrationSql(readFileSync(MIGRATION, "utf8"));

describe("الهجرة وJS — تعريف واحد حرفًا بحرف (بدون Postgres)", () => {
  it("أزواج الطي في SQL تساوي ARABIC_SEARCH_FOLD_PAIRS في الاتجاهين", () => {
    expect([...parsed.folds.entries()].sort()).toEqual(
      [...ARABIC_SEARCH_FOLD_PAIRS.entries()].sort(),
    );
  });

  it("طبقة العلامات المزالة في SQL تساوي TASHKEEL_SOURCE + TATWEEL_SOURCE القياسيَين", () => {
    const canonical = new Set([
      ...expandEscapeRanges(TASHKEEL_SOURCE),
      ...expandEscapeRanges(TATWEEL_SOURCE),
    ]);
    expect([...parsed.removed].sort((a, b) => a - b)).toEqual([...canonical].sort((a, b) => a - b));
  });

  it("لكل نقطة في 0600-08FF: JS يُطوي تمامًا ما تُطويهِ الهجرة العكسية", () => {
    for (let cp = 0x0600; cp <= 0x08ff; cp++) {
      const single = ch(cp);
      expect(applySqlNormalization(parsed, single)).toBe(normalizeArabicForSearch(single));
    }
  });

  it("العلامة الوسطى لا تنجو من أيٍّ من الطرفين داخل كلمة", () => {
    for (const cp of [0x0653, 0x0610, 0x06ed, 0x0898, 0x08ca, 0x08e3, 0x0640]) {
      const word = `م${ch(cp)}درسة`;
      expect(applySqlNormalization(parsed, word)).toBe(normalizeArabicForSearch(word));
      expect(normalizeArabicForSearch(word)).toBe("مدرسه");
    }
  });
});

describe("الإيجابيات التي كانت تضيع — مطابقة الآن", () => {
  const corpus = [
    "سؤل",
    "سول",
    "سؤال",
    "ٱلله",
    "الله",
    "صحّة",
    "صحه",
    "الحمد لله",
    "الْحَمْدُ لِلَّهِ",
    "کتاب",
    "كتاب",
    "مصطفى",
    "مستشفي",
    `م${ch(0x0653)}د`,
    `نور${ch(0x06d6)}`,
    "CORAN file.PDF",
  ];

  it("المجموعة الذهبية: JS == دلالة الهجرة نفسها", () => {
    for (const text of corpus) {
      expect(applySqlNormalization(parsed, text)).toBe(normalizeArabicForSearch(text));
    }
  });

  it("«سؤل» و«سول» يقعان على الرمز نفسه", () => {
    expect(normalizeArabicForSearch("سؤل")).toBe(normalizeArabicForSearch("سول"));
    expect(normalizeArabicForSearch("سؤل")).toBe("سول");
  });

  it("«ٱلله» (همزة وصل) تُطابَع بكتابة «الله»", () => {
    expect(normalizeArabicForSearch(`${ch(0x0671)}لله`)).toBe(normalizeArabicForSearch("الله"));
  });

  it("«صحّة» و«صحه» رمز واحد", () => {
    expect(normalizeArabicForSearch("صحّة")).toBe(normalizeArabicForSearch("صحه"));
    expect(normalizeArabicForSearch("صحّة")).toBe("صحه"); // الطي للمقارنة فقط، لا للعرض
  });

  it("ک (U+06A9) تُطوي إلى ي كما في يائية الفارسية والألف المقصورة", () => {
    expect(normalizeArabicForSearch("کتاب")).toBe(normalizeArabicForSearch("يتاب"));
    expect(normalizeArabicForSearch(ch(0x06a9))).toBe("ي");
    expect(normalizeArabicForSearch(ch(0x06cc))).toBe("ي");
    expect(normalizeArabicForSearch(ch(0x0649))).toBe("ي");
  });

  it("المدّ U+0653 والعلامة القرآنية U+06D6 تُزالان كما يُزال الفتحة", () => {
    expect(normalizeArabicForSearch(`ا${ch(0x0653)}`)).toBe("ا");
    expect(normalizeArabicForSearch(`م${ch(0x06d6)}`)).toBe("م");
  });

  it("الاتجاه الخاطئ القديم زال: ؤ/ئ لا تُطويان إلى الهمزة العارية ء", () => {
    for (const source of ["سؤل", "تشرينئ", "بئر", "لؤي"]) {
      const folded = normalizeArabicForSearch(source);
      expect(folded.includes(ch(0x0621))).toBe(false);
    }
    for (const [, target] of ARABIC_SEARCH_FOLD_PAIRS) {
      expect(target).not.toBe(ch(0x0621));
    }
    expect(normalizeArabicForSearch("بئر")).toBe("بير");
    expect(normalizeArabicForSearch("لؤي")).toBe("لوي");
  });
});

describe("طرف الاستعلام يمرّ بالمصدر الواحد فعلًا", () => {
  it("SearchUseCases يمرر normalizedQuery مطابقة لـ normalize_arabic", async () => {
    const captured: unknown[] = [];
    const repo = {
      countDocuments: (...args: unknown[]) => {
        captured.push(args[0]);
        return Promise.resolve(0);
      },
      searchDocuments: () => Promise.resolve([]),
      getTitleSuggestions: () => Promise.resolve([]),
      getFolderSuggestions: () => Promise.resolve([]),
      getTagSuggestions: () => Promise.resolve([]),
    };
    const useCases = new SearchUseCases(repo as unknown as ISearchRepository);
    const result = await useCases.search("user-1", "STUDENT", { query: "  سؤل   في  " });
    expect(result.normalizedQuery).toBe("سول في");
    const params = captured[0] as { normalizedQuery: string };
    expect(params.normalizedQuery).toBe("سول في");
  });
});

describe("وسوم auto-tag — الاسم المعروض أصلٌ بلا تشكيل، والمقارنة قياسية", () => {
  const session = { user: { id: "user-1", role: "STUDENT" } } as unknown as AuthSession;

  function makeUseCases(
    document: unknown,
    existingTags: { id: string; name: string; color: string }[],
  ) {
    const documentRepo = {
      findDocumentById: () => Promise.resolve(document),
    } as unknown as ConstructorParameters<typeof AutoTagUseCases>[0];
    const tagRepo = {
      findMany: () => Promise.resolve(existingTags),
    } as unknown as ConstructorParameters<typeof AutoTagUseCases>[1];
    return new AutoTagUseCases(documentRepo, tagRepo);
  }

  it("«صحّة» تُنتج وسمًا معروضًا «صحة» لا «صحه»", async () => {
    const useCases = makeUseCases(
      {
        title: "صحّة المؤمن",
        description: null,
        originalName: "x.pdf",
        fileName: "x.pdf",
        tags: [],
      },
      [],
    );
    const suggestions = await useCases.suggestTags("doc-1", session);
    const health = suggestions.find((s) => normalizeArabicForSearch(s.name) === "صحه");
    expect(health).toBeDefined();
    expect(health?.name).toBe("صحة"); // U+0635 U+062D U+0629 — بدون شدة، وبحرف الأصل
    expect(health?.name).not.toContain(ch(0x0651));
  });

  it("الاسم المعروض يحتفظ بالهمزات: «إيجار» لا «ايجار»", async () => {
    const useCases = makeUseCases(
      {
        title: "إيجار عقد",
        description: null,
        originalName: "x.pdf",
        fileName: "x.pdf",
        tags: [],
      },
      [],
    );
    const suggestions = await useCases.suggestTags("doc-1", session);
    const ijar = suggestions.find((s) => s.name.startsWith("إ"));
    expect(ijar?.name).toBe("إيجار");
  });

  it("وسم «صحه» الموجود يمنع اقتراح «صحة» جديدًا (تطابق بعد الطي)", async () => {
    const useCases = makeUseCases(
      {
        title: "صحّة المؤمن",
        description: null,
        originalName: "x.pdf",
        fileName: "x.pdf",
        tags: [],
      },
      [{ id: "t1", name: "صحه", color: "#127E87" }],
    );
    const suggestions = await useCases.suggestTags("doc-1", session);
    expect(
      suggestions.some((s) => s.type === "new" && normalizeArabicForSearch(s.name) === "صحه"),
    ).toBe(false);
    expect(suggestions.some((s) => s.type === "existing" && s.name === "صحه")).toBe(true);
  });
});
