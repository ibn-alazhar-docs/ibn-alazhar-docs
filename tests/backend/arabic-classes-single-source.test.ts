import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import {
  ARABIC_LETTER_RANGES,
  TASHKEEL_SOURCE,
  TATWEEL_SOURCE,
  containsArabic,
  countArabicLetters,
  arabicLetterRatio,
  hasArabicContent,
  TASHKEEL,
} from "../../packages/pipeline/src/text/constants";
import { stripTashkeel } from "../../packages/pipeline/src/booklet";
import {
  ARABIC_LETTER_RANGES as WEB_LETTER_RANGES,
  TASHKEEL_SOURCE as WEB_TASHKEEL_SOURCE,
  TATWEEL_SOURCE as WEB_TATWEEL_SOURCE,
} from "../../apps/web/src/shared/arabic-ranges";

/**
 * الطبقة العربية تُقاس من Unicode مرة واحدة، لا من أربع صياغات متقاربة.
 * القرار موثّق في docs/MERGE_PLAN.md؛ هذا الملف يمنع سببين محددين للانهيار الصامت:
 * (١) أن تسقط كتلة كاملة من النطاق القياسي. حدث هذا مع Extended-B: حروف المخطوطات
 * U+0870-U+088E كانت تُحسب غير عربية، فيفقد السطر اتجاهه RTL وتُمرّره عتبات الجودة
 * كنص أعجمي — وهذا يخالف قاعدة «المُنتَج نسخة طبق الأصل من الأصل».
 * (٢) أن تُعيد طبقة ما تعريف الطبقة الحرفية بيدها، فتنحرف تدريجيًا عن القياسي دون
 * أن يلاحظها أحد، لأن كل نسخة «تعمل».
 *
 * كل الحروف هنا مكتوبة بنقاطها الرمزِيّة صراحةً: نسخ حرف من Extended-B إلى ملف
 * مصدَر يُدخل حروفًا خفية للاتجاه، فيفشل الاختبار حينها لسبب لا علاقة له بالكود.
 */

const classOf = (ranges: string) => new RegExp(`[${ranges}]`);
const ch = (cp: number) => String.fromCodePoint(cp);

/** MEEM — الحرف المرجعي لأي اختبار «حرف + علامة». */
const MEEM = ch(0x0645);

/** حروف مقيسة في كل كتلة من الكتلات الثلاث (Unicode 15.0). */
const EXTENDED_B_LETTERS = [0x0870, 0x0880, 0x088e];
const SUPPLEMENT_LETTERS = [0x0750, 0x0770, 0x077f];
const EXTENDED_A_LETTERS = [0x08a0, 0x08a9, 0x08c9];

/** علامات مقيسة خارج التسع القديمة التي كانت بعض النسخ تكتفي بها. */
const MEASURED_MARKS = [0x0610, 0x0653, 0x0670, 0x06ed, 0x0898, 0x08ca, 0x08e3];

/** نقاط يجب أن تبقى خارج طبقة الحروف. */
const NOT_ARABIC_LETTERS = [
  0xfb50, // Arabic Presentation Forms-A
  0xfe70, // Arabic Presentation Forms-B
  0x0780, // Thaana — أول كتلة بعد Arabic Supplement
  0x0900, // Devanagari
  0x0590, // Hebrew
  0x0041, // Latin A
];

/** كل النقاط الرمزِيّة العربية الممكنة، زائد جيران يجب ألا يدخلوا. */
const ARABIC_UNIVERSE: number[] = [];
for (let cp = 0x0600; cp <= 0x09ff; cp++) ARABIC_UNIVERSE.push(cp);
const NEIGHBOURS = [0x0590, 0x0780, 0x0900, 0x0fb0, 0xfb50, 0xfe70, 0x0041, 0x0410];

function diffCodePoints(a: RegExp, b: RegExp): number[] {
  const out: number[] = [];
  for (const cp of [...ARABIC_UNIVERSE, ...NEIGHBOURS]) {
    if (a.test(ch(cp)) !== b.test(ch(cp))) out.push(cp);
  }
  return out;
}

describe("النطاق القياسي — الكتلة المقيسة", () => {
  it("يعتبر حروف Extended-B عربيًا (كانت غائبة عن كل البوابات)", () => {
    for (const cp of EXTENDED_B_LETTERS) {
      expect(containsArabic(ch(cp))).toBe(true);
      expect(countArabicLetters(ch(cp))).toBe(1);
    }
    const word = String.fromCodePoint(...EXTENDED_B_LETTERS);
    expect(arabicLetterRatio(word)).toBe(1);
    expect(hasArabicContent(word.repeat(7))).toBe(true);
    expect(hasArabicContent(word.repeat(6))).toBe(false); // تحت حدّ 20 حرفًا
  });

  it("يثبت أن الصياغة القديمة بثلاث كتلات كانت تُسقط هذه الحروف", () => {
    // ضابط عكسي: الصيغة السابقة كانت 0600-06FF + 0750-077F + 08A0-08FF، أي أنها
    // تُغلق 0870-089F. لو رجع القياسي يومًا إلى تلك الصياغة فتحمرّ الاختبار
    // الأول، لا هذا.
    const oldThreeBlocks = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    expect(oldThreeBlocks.test(ch(0x0870))).toBe(false);
    expect(classOf(ARABIC_LETTER_RANGES).test(ch(0x0870))).toBe(true);
  });

  it("يبقي على الكتلتين السابقتين ولا يتسع للأشكال العرضية", () => {
    const cls = classOf(ARABIC_LETTER_RANGES);
    for (const cp of [...SUPPLEMENT_LETTERS, ...EXTENDED_A_LETTERS]) {
      expect(cls.test(ch(cp))).toBe(true);
    }
    // الأشكال العرضية خارج النطاق عمدًا: بواباتا SHAPING_FORM وPRESENTATION
    // وassertion الطبقة النصية في searchable-PDF تسأل «هل ما زال التحويل قائمًا؟»،
    // فلو حُسبت هذه حروفًا لنجحت تلك الفحوص بلا سبب.
    for (const cp of NOT_ARABIC_LETTERS) {
      expect(containsArabic(ch(cp))).toBe(false);
      expect(cls.test(ch(cp))).toBe(false);
    }
  });

  it("يغطي كل علامات التشكيل المقيسة، ومنها ما كان يُترك في الوسوم", () => {
    for (const cp of MEASURED_MARKS) {
      expect(`${MEEM}${ch(cp)}`.replace(TASHKEEL, "")).toBe(MEEM);
    }
    // نسخة booklet كانت تكتفي بـ 064B-0652 + 0670
    for (const cp of [0x0610, 0x06ed, 0x0898, 0x08e3]) {
      expect(stripTashkeel(`${MEEM}${ch(cp)}`)).toBe(MEEM);
    }
    // التطويل (tatweel) ليس تشكيلًا: إزالته تغيّر العرض، والمنتَج يجب أن يبقى
    // مطابقًا للأصل.
    expect(stripTashkeel(`${MEEM}${ch(0x0640)}`)).toBe(`${MEEM}${ch(0x0640)}`);
  });
});

describe("نسخة apps/web — مقفولة حرفًا بحرف على القياسي", () => {
  it("طبقة الحروف متطابقة تمامًا", () => {
    expect(diffCodePoints(classOf(ARABIC_LETTER_RANGES), classOf(WEB_LETTER_RANGES))).toEqual([]);
  });

  it("طبقة العلامات والمدّ متطابقة تمامًا", () => {
    expect(diffCodePoints(classOf(TASHKEEL_SOURCE), classOf(WEB_TASHKEEL_SOURCE))).toEqual([]);
    expect(classOf(TATWEEL_SOURCE).test(ch(0x0640))).toBe(true);
    expect(classOf(WEB_TATWEEL_SOURCE).test(ch(0x0640))).toBe(true);
    // التطابق مطلوب لا الاحتواء: النسخة الأوسع في الواجهة تعني أن البحث يُطبع
    // بخلاف ما يُطبع في SQL، فتختفي نتائج بلا سبب ظاهر.
  });
});

describe("المصدر الواحد — لا إعادة تعريف للطبقة العربية", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const ROOTS = ["packages", "apps", "workers"];
  const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".git", "coverage"]);
  /** الملف الوحيد المسموح له بتعريف النطاق، ثم نسخة الواجهة المقفولة أعلاه. */
  const ALLOWED = [
    path.join("packages", "pipeline", "src", "text", "constants.ts"),
    path.join("apps", "web", "src", "shared", "arabic-ranges.ts"),
  ];

  // صياغات «طبقة العربية» المعروفة: نطاق يبدأ من U+0600، أو كتلة ممتدة مكتوبة يدًا.
  // نطاقات الأرقام [٠-٩] وحروف الترتيب [أ-ي] ليست طبقة حروف، لذا تبقى مشروعة.
  const SCRIPT_CLASS_SIGNATURES = [
    /\\u0600-\\u06[0-9A-Fa-f]{2}/,
    /\\u0600-\\u0[78][0-9A-Fa-f]{2}/,
    /\\u0750-\\u07[0-9A-Fa-f]{2}/,
    /\\u08[78A-F][0-9A-Fa-f]{2}-\\u08/,
    /\u0600\s*-\s*[\u0600-\u08FF]/,
  ];

  function collect(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full, acc);
      else if (/\.tsx?$/.test(entry.name)) acc.push(full);
    }
    return acc;
  }

  it("يفحص ملفات فعلًا (حتى لا يمرّ الحارس بلا شيء ليفحصه)", () => {
    const files = ROOTS.flatMap((r) => collect(path.join(ROOT, r)));
    expect(files.length).toBeGreaterThan(50);
  });

  it("لا ملف إنتاج يعيد كتابة طبقة الحروف العربية بيده", () => {
    const offenders: string[] = [];
    for (const file of ROOTS.flatMap((r) => collect(path.join(ROOT, r)))) {
      const rel = path.relative(ROOT, file);
      if (ALLOWED.includes(rel)) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
        if (SCRIPT_CLASS_SIGNATURES.some((re) => re.test(code))) {
          offenders.push(`${rel}:${i + 1}: ${code.trim().slice(0, 80)}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
