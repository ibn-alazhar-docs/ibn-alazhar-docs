/**
 * بوابة أمانة مُخرَج الـ PDF النصي (packages/pipeline/src/output/pdf.ts).
 *
 * الاختبارات القديمة كانت تكتفي ببايتي `%PDF` وحجم المخزن — ولهذا مرّ مسار pdfmake+WOFF
 * المعطوب سنوات: pdfmake لا يطبّق bidi إطلاقًا فتُطبع الكلمات العربية بترتيبها المنطقي
 * معكوسة، والرجوع لخطوط النظام يُسقط الهمزات من ToUnicode («أول» ⇒ «3ول»). هذه الطبقة
 * تقيس المخرج نفسه: ترتيب الكلمات، بقاء التشكيل، الخط المضمَّن، والبنية كعناصر HTML.
 */

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPdfHtml,
  generatePdf,
  orderShaddaFirst,
  parseMarkdownBlocks,
} from "@ibn-al-azhar-docs/pipeline/output/pdf";
import type { CleanedText } from "@ibn-al-azhar-docs/pipeline";
import { HAS_FITZ, HAS_WEASYPRINT, PDF_PYTHON } from "./pdf-engine";

const AR_HEAD = "كتاب التكملة في الأدب";
const AR_BODY = "الحمد لله رب العالمين والصلاة والسلام على رسول الله";
const AR_TASHKEEL = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ";
const AR_GUARDED = "«شاهدٌ على الانعكاس»";
const EN_BODY = "This is an English paragraph that must stay Latin.";

const MD = [
  `# ${AR_HEAD}`,
  ``,
  `عنوانٌ يتبع العنوان`,
  ``,
  AR_BODY,
  ``,
  AR_TASHKEEL,
  ``,
  AR_GUARDED,
  ``,
  EN_BODY,
  ``,
  `- عنصرٌ أول في القائمة`,
  `  - عنصرٌ متداخل`,
  ``,
  `1. ترتيبٌ أول`,
  `2. ترتيبٌ ثانٍ`,
  ``,
  `| اسم | شرح |`,
  `|-----|-----|`,
  `| كتاب | مفيد |`,
  ``,
  `> اقتباسٌ ذو قيمة`,
  ``,
  "```",
  `printf("hello");`,
  "```",
  ``,
  `---`,
].join("\n");

function cleaned(markdown: string): CleanedText {
  return {
    raw: markdown,
    cleaned: markdown,
    markdown,
    metadata: {
      pageCount: 1,
      headingCount: 1,
      wordCount: markdown.split(/\s+/).length,
      charCount: markdown.length,
      confidence: 1,
      garbageRatio: 0,
      htmlFragmentCount: 0,
      paragraphCount: 1,
      qualityScore: 1,
    },
  };
}

/** إزالة الفراغات: قد يكسر PDF السطر عند الحافة، لكنه لا يُبدّل الترتيب. */
function squash(text: string): string {
  return text.replace(/\s+/g, "");
}

const describeReal = HAS_WEASYPRINT && HAS_FITZ ? describe : describe.skip;

const EXTRACT = `import json, sys, fitz
doc = fitz.open(sys.argv[1])
text = "".join(page.get_text() for page in doc)
fonts = [row[3] for page in doc for row in page.get_fonts()]
with open(sys.argv[2], "w", encoding="utf-8") as out:
    out.write(json.dumps({"text": text, "fonts": fonts}))`;

/**
 * قراءة المخرج بـ PyMuPDF: النص المستخرَج وأسماء الخطوط المضمَّنة.
 * الكتابة إلى ملف لا إلى stdout لأن PyMuPDF يطبع تحذيرات على نفس القناة.
 */
async function inspect(pdf: Buffer): Promise<{ text: string; fonts: string[] }> {
  const dir = await mkdtemp(path.join(tmpdir(), "pdf-fidelity-"));
  const file = path.join(dir, "out.pdf");
  const report = path.join(dir, "report.json");
  try {
    await writeFile(file, pdf);
    execFileSync(PDF_PYTHON, ["-c", EXTRACT, file, report], { stdio: "ignore" });
    return JSON.parse(await readFile(report, "utf8")) as { text: string; fonts: string[] };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

describe("بنية HTML واتجاهه (طبقة القرار، بلا محرّك تصيير)", () => {
  const html = buildPdfHtml(MD);

  it("يقرّر dir لكل بلوك من مصدر القرار المشترك لا من عتبة محلية", () => {
    expect(html).toContain('<html lang="ar" dir="rtl"');
    expect(html).toContain(`<p dir="rtl">${AR_BODY}</p>`);
    expect(html).toContain(`<p dir="ltr">${EN_BODY}</p>`);
    expect(html).toContain(`<h1 dir="rtl">${AR_HEAD}</h1>`);
  });

  it("يبني عناصر حقيقية: قائمة متداخلة ومرقّمة وجدول واقتباس وشفرة وفاصل", () => {
    expect(html).toMatch(/<ul>[\s\S]*<li>[\s\S]*<ul>/);
    expect(html).toContain("<ol>");
    expect(html).toContain("<table>");
    expect(html).toContain("<th");
    expect(html).toContain("<blockquote");
    expect(html).toContain('<pre dir="ltr">');
    expect(html).toContain("<hr>");
  });

  it("لا يعيد تدفق النص: أسطر الفقرة المتتابعة تبقى أسطرًا بـ br", () => {
    expect(buildPdfHtml("سطرٌ أول\nوسطرٌ ثانٍ")).toContain("سطرٌ أول<br>");
  });

  it("يهربّ HTML ولا يمرّر مخططات الروابط الخطرة من نصّ المستند", () => {
    const evil = buildPdfHtml(
      "نصٌّ <script>alert(1)</script> و[اضغط](javascript:alert(1)) و[آمن](https://example.com/x)",
    );
    expect(evil).toContain("&lt;script&gt;");
    expect(evil).not.toContain("<script>");
    expect(evil).not.toContain("javascript:");
    expect(evil).toContain("https://example.com/x");
  });

  it("يثبّت Amiri على كل عنصر بلا رجوع لخطوط النظام وبلا WOFF", () => {
    expect(html).toContain('font-family: "Amiri"');
    expect(html).toMatch(/pre, code, a, em, strong, u, del/);
    expect(html).not.toContain(".woff");
    expect(html).not.toMatch(/font-family:[^;]*\b(serif|monospace)\b/);
  });

  it("يحوّل حجم الخط إلى pt ويضيف العلامة المائية هربًا من الحقن", () => {
    const big = buildPdfHtml(MD, { fontSize: 18, watermark: "نسخةٌ تجريبية <b>" });
    expect(big).toContain("font-size: 18pt");
    expect(big).toContain(".watermark");
    expect(big).toContain("نسخةٌ تجريبية &lt;b&gt;");
    expect(buildPdfHtml(MD)).not.toContain(".watermark");
  });

  // «الرَّحمن» حرفًا حرفًا: ا ل ر + فتحة U+064E + شدّة U+0651 + ح م ن.
  // الشدّة بعد الحركة — ترتيب غير موصى به، وهو الذي يُخرج الحرف الأجنبي في طبقة النص.
  const FATHA_THEN_SHADDA = "\u0627\u0644\u0631\u064E\u0651\u062D\u0645\u0646";
  // الشدّة قبل الحركة: ترتيب Unicode الموصى به للعربية، والرسم واحد لا يختلف.
  const SHADDA_THEN_FATHA = "\u0627\u0644\u0631\u0651\u064E\u062D\u0645\u0646";

  it("يقدّم الشدّة على الحركة السابقة لها ولا يمسّ شيئًا آخر", () => {
    expect(orderShaddaFirst(FATHA_THEN_SHADDA)).toBe(SHADDA_THEN_FATHA);
    // التحويل.idempotent والمحتوى غير المعني لا يتغيّر.
    expect(orderShaddaFirst(SHADDA_THEN_FATHA)).toBe(SHADDA_THEN_FATHA);
    expect(orderShaddaFirst("بِسْمِ")).toBe("بِسْمِ");
    expect(orderShaddaFirst(EN_BODY)).toBe(EN_BODY);
    // لا حذف ولا إضافة ولا تطبيع همزات: عدد المحارف وألوانها باقية كما هي.
    expect([...orderShaddaFirst(FATHA_THEN_SHADDA)].sort()).toEqual([...FATHA_THEN_SHADDA].sort());
  });

  it("يقرأ البلوكات بلا فقدان للبنية", () => {
    const kinds = parseMarkdownBlocks(MD).map((block) => block.kind);
    expect(kinds.filter((kind) => kind === "paragraph")).toHaveLength(5);
    expect(kinds.filter((kind) => kind === "list")).toHaveLength(2);
    for (const kind of ["heading", "table", "quote", "code", "rule"]) {
      expect(kinds.filter((k) => k === kind)).toHaveLength(1);
    }
  });
});

describeReal("نهاية إلى نهاية: WeasyPrint + Amiri على المخرج الفعلي", () => {
  // تصيير واحد لكل المجموعة: المحرّك عملية subprocess والقياس على نفس الملف.
  // لكن عند أول استعمال لا عند جمع الاختبارات: `describe.skip` يُنفّذ جسمَه أيضًا،
  // فإطلاقُ الوعد هنا كان يرفض بلا معالجٍ حين يغيب المحرّك (حالة CI بلا WeasyPrint)
  // ويُخرج «Unhandled Rejection» يُسقط تشغيلًا أخضرَ كلُّ اختباراته ناجحة.
  let rendered: Promise<Awaited<ReturnType<typeof inspect>>> | undefined;
  const render = () => (rendered ??= generatePdf(cleaned(MD)).then(inspect));

  it("مخرج صالح فيه Amiri مضمَّن لا WOFF ولا Helvetica", async () => {
    const { fonts } = await render();
    expect(fonts.some((name) => /amiri/i.test(name))).toBe(true);
    expect(fonts.some((name) => /woff/i.test(name))).toBe(false);
    expect(fonts.some((name) => /helv/i.test(name))).toBe(false);
  }, 180_000);

  // البوابة على الكلمات الداخلية: آخر حركة في الفقرة قد ينزاح موضعها عند الاستخراج
  // (قيس على PyMuPDF وعلى poppler معًا)، ولا يمسّ هذا الحروفَ ولا ترتيبَ الكلمات.
  it("يرجع النص بالترتيب المنطقي كما كُتب، بالتشكيل والهمزتين والسّاقين", async () => {
    const text = squash((await render()).text);
    expect(text).toContain(squash(AR_HEAD));
    expect(text).toContain(squash(AR_BODY));
    expect(text).toContain(squash(AR_GUARDED));
    for (const word of AR_TASHKEEL.split(" ").slice(0, -1)) {
      expect(text).toContain(squash(orderShaddaFirst(word)));
    }
    // انعكاس الترتيب كان يجعل آخر الكلمة أول مستخرَج: منع صريح لا تفادٍ بالصدفة.
    expect(text).not.toContain(squash("الحمد لله والصلاة والسلام"));
  }, 180_000);

  it("لا يُدرَج حرف لاتيني أو سيريلي داخل الكلام العربي في طبقة النص", async () => {
    const arabicOnly = await inspect(
      await generatePdf(cleaned(`# ${AR_HEAD}\n\n${AR_TASHKEEL}\n\n${AR_GUARDED}`)),
    );
    expect(/[A-Za-z\u0400-\u04FF]/u.test(arabicOnly.text)).toBe(false);
  }, 180_000);

  it("يبقي اللاتيني والشفرة كما كُتبا تمامًا", async () => {
    const text = (await render()).text;
    expect(squash(text)).toContain(squash(EN_BODY));
    expect(text).toContain("printf");
    expect(text).toContain("hello");
  }, 180_000);

  it("نفس المدخلات تعطي نفس المستخرج (لا حالة مخفية في المسار)", async () => {
    const again = await inspect(await generatePdf(cleaned(MD), { fontSize: 14, rtl: true }));
    expect(squash(again.text)).toBe(squash((await render()).text));
  }, 240_000);
});
