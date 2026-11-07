/**
 * هندسةُ صفحات الأصل — المقيسُ من `page-geometry.py` إلى `@page` و`w:pgSz`/`w:pgMar`.
 *
 * السبب قاعدةُ «المُنتَج نسخةٌ طبق الأصل من الأصل في كل شيء»: كان `pdf.ts` يكتب
 * `@page { size: A4; margin: 2cm }` حرفيًا، وكان الـ DOCX يرث ورقته من مرجعٍ واحد ثابت
 * (`reference_rtl.docx`)، فمخطوطٌ بصفحة ١٢×١٩ سم يخرج A4 بهامش ٢ سم — ملفٌ يطابق الأصلَ
 * في نصّه ولا يطابقه في ورقته. هذه البوابةُ تقيس ذلك، وتقيس معه وجهَ الترقّي: من بلا
 * قياسٍ يحصل على نفس البايتات التي كان يحصل عليها، لا على هامشٍ مُختلَق.
 *
 * الوسيطُ لا المتوسّطُ هو المطلوب: الكتابُ الواحد تُخالطه ورقةُ إقحام بحجمٍ مختلف،
 * والمتوسّطُ الحسابي كان يخرّج مقاسًا لا تشبه أيَّ صفحةٍ من الكتاب.
 */

import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, chmod, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_MARGIN_PT,
  geometryToPageCss,
  geometryToSectPrPageXml,
  measurePdfPageGeometry,
  pageGeometryFromStoredJson,
  parsePageGeometrySamples,
  ptToTwips,
  runPageGeometryScript,
  summarizePageGeometry,
  type PageGeometrySample,
} from "@ibn-al-azhar-docs/pipeline/output/page-geometry";
import { buildPdfHtml } from "@ibn-al-azhar-docs/pipeline/output/pdf";
import { applyRtlOoxml, transformDocumentXml } from "@ibn-al-azhar-docs/pipeline/output/docx-rtl";
import { readZip, writeZip, type ZipEntry } from "@ibn-al-azhar-docs/pipeline/output/embed-fonts";
import { HAS_FITZ, PDF_PYTHON } from "./pdf-engine";

const execFileAsync = promisify(execFile);

const SCRIPT = fileURLToPath(
  new URL("../../packages/pipeline/scripts/page-geometry.py", import.meta.url),
);

/** سمْتُ القياس: الحافةُ تُقاس من مربعٍ معلوم على ورقةٍ معلومة. */
const A4: PageGeometrySample = { widthPt: 595.28, heightPt: 841.89 };
const MANUSCRIPT_W = 340.16; // ١٢ سم
const MANUSCRIPT_H = 538.58; // ١٩ سم

function boxed(
  widthPt: number,
  heightPt: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): PageGeometrySample {
  return {
    widthPt,
    heightPt,
    text: { x0: left, y0: top, x1: widthPt - right, y1: heightPt - bottom },
  };
}

// ─────────────────────────── summarizePageGeometry ───────────────────────────

describe("summarizePageGeometry: الوسيطُ والحواشي", () => {
  it("يأخذ الوسيطَ فيقع مقاسُ الكتاب مع ورقةٍ معترضةٍ مقحمة", () => {
    const samples: PageGeometrySample[] = [
      { ...A4, text: { x0: 50, y0: 60, x1: 540, y1: 780 } },
      { ...A4, text: { x0: 52, y0: 58, x1: 542, y1: 782 } },
      { ...A4, text: { x0: 51, y0: 61, x1: 541, y1: 779 } },
      // ورقةُ إقحام صغيرةٌ ملزمةٌ بالكتاب: تحضر ولا تسحب المقاس.
      { widthPt: 300, heightPt: 400 },
    ];
    const geometry = summarizePageGeometry(samples);
    expect(geometry).not.toBeNull();
    expect(geometry!.widthPt).toBeCloseTo(595.28, 2);
    expect(geometry!.heightPt).toBeCloseTo(841.89, 2);
    // المتوسّطُ الحسابي كان يعطي 571.46 في العرض و625.45 في الطول — مقاسًا لا صفحة فيه.
    expect(geometry!.widthPt).not.toBeCloseTo((595.28 * 3 + 300) / 4, 1);
  });

  it("يسقط العيناتِ غيرَ المنتهية وغيرَ الموجبة ولا يبني عليها وسيطًا", () => {
    const samples: PageGeometrySample[] = [
      A4,
      { widthPt: 0, heightPt: 500 },
      { widthPt: 500, heightPt: Number.NaN },
      { widthPt: Number.POSITIVE_INFINITY, heightPt: 400 },
      A4,
    ];
    const geometry = summarizePageGeometry(samples);
    expect(geometry).toEqual({
      widthPt: 595.28,
      heightPt: 841.89,
      marginsPt: null,
    });
  });

  it("يرجع null حين لا صفحةَ صالحةَ البتّة", () => {
    expect(summarizePageGeometry([])).toBeNull();
    expect(summarizePageGeometry([{ widthPt: -1, heightPt: 200 }])).toBeNull();
  });

  it("يهمل الهوامشَ إذا لم يكن إلا صفحةٌ واحدةٌ ذاتُ نصّ: واحدةٌ مصادفةٌ لا مارجن", () => {
    const samples: PageGeometrySample[] = [
      boxed(600, 800, 50, 60, 60, 70),
      { widthPt: 600, heightPt: 800 }, // صفحةٌ ممسوحةٌ بلا نصّ مضمَّن
    ];
    expect(summarizePageGeometry(samples)).toEqual({
      widthPt: 600,
      heightPt: 800,
      marginsPt: null,
    });
  });

  it("يحسب الوسيطَ لكل حافةٍ على حِدة ولا يفرض تماثلًا", () => {
    const samples = [
      boxed(600, 800, 40, 60, 65, 30),
      boxed(600, 800, 50, 62, 60, 34),
      boxed(600, 800, 45, 61, 55, 32),
    ];
    expect(summarizePageGeometry(samples)!.marginsPt).toEqual({
      top: 61,
      right: 60,
      bottom: 32,
      left: 45,
    });
  });

  it("يُبطل الهوامشَ كلّها إن خرجت حافةٌ واحدةٌ عن المعقول (صِفرٌ أو سالب)", () => {
    // نصٌّ يلمس الحافّةَ اليسرى: يسارٌ ٠ ليس هامشًا بل كتلةٌ تملأ الورقة.
    const samples = [boxed(600, 800, 0, 60, 60, 60), boxed(600, 800, -4, 62, 58, 60)];
    expect(summarizePageGeometry(samples)!.marginsPt).toBeNull();
  });

  it("يُبطل الهوامشَ كلّها إن جاوزت حافةٌ ٤٠٪ من بُعد الصفحة", () => {
    // يمينٌ ٣٦٠ في ورقةٍ عرضُها ٦٠٠: أثرُ قياسٍ لا هامش — والترقيةُ إلى ٢سم أصدق.
    const samples = [boxed(600, 800, 50, 60, 360, 60), boxed(600, 800, 52, 62, 355, 62)];
    const geometry = summarizePageGeometry(samples)!;
    expect(geometry.widthPt).toBe(600);
    expect(geometry.marginsPt).toBeNull();
  });

  it("لا يخترع هامشًا نصفَ مقيسٍ ونصفِ مفقود: الحافةُ المفقودةُ تُبطل الكلّ", () => {
    const samples = [boxed(600, 800, 50, 60, 60, 800 * 0.9), boxed(600, 800, 50, 60, 60, 60)];
    expect(summarizePageGeometry(samples)!.marginsPt).toBeNull();
  });
});

// ─────────────────────────── التحويل إلى CSS وOOXML ───────────────────────────

describe("geometryToPageCss / geometryToSectPrPageXml", () => {
  it("يكتب المقاسَ والحواشيَ الأربعة بترتيب CSS (أعلى/يمين/أسفل/يسار)", () => {
    const css = geometryToPageCss({
      widthPt: MANUSCRIPT_W,
      heightPt: MANUSCRIPT_H,
      marginsPt: { top: 28.35, right: 28.35, bottom: 42.52, left: 42.52 },
    });
    expect(css).toBe("size: 340.16pt 538.58pt; margin: 28.35pt 28.35pt 42.52pt 42.52pt;");
  });

  it("يبقى على هامش ٢ سم حين لا هوامشَ مقيسة، ولا يترك الصفحةَ بلا ورقة", () => {
    const css = geometryToPageCss({
      widthPt: MANUSCRIPT_W,
      heightPt: MANUSCRIPT_H,
      marginsPt: null,
    });
    expect(css).toBe(`size: 340.16pt 538.58pt; margin: ${DEFAULT_PAGE_MARGIN_PT}pt;`);
    expect(DEFAULT_PAGE_MARGIN_PT).toBeCloseTo(2 * 28.3465, 2);
  });

  it("يحوّل النقاطَ إلى توائب: A4 = 11906×16838 و٢ سم = 1134", () => {
    expect(ptToTwips(595.28)).toBe(11906);
    expect(ptToTwips(841.89)).toBe(16838);
    expect(ptToTwips(DEFAULT_PAGE_MARGIN_PT)).toBe(1134);
  });

  it("يكتب sectPr بصفحة ١٢×١٩ سم مقيسةٍ هوامشُها، لا بصفحة المرجع", () => {
    const { pgSz, pgMar } = geometryToSectPrPageXml({
      widthPt: MANUSCRIPT_W,
      heightPt: MANUSCRIPT_H,
      marginsPt: { top: 28.35, right: 28.35, bottom: 42.52, left: 42.52 },
    });
    expect(pgSz).toBe('<w:pgSz w:w="6803" w:h="10772" w:orient="portrait"/>');
    expect(pgMar).toBe('<w:pgMar w:top="567" w:right="567" w:bottom="850" w:left="850"/>');
  });

  it("يعتبر الصفحةَ الأعرضَ من طولها landscape كما يراها القارئ", () => {
    const { pgSz } = geometryToSectPrPageXml({
      widthPt: 841.89,
      heightPt: 595.28,
      marginsPt: null,
    });
    expect(pgSz).toContain('w:orient="landscape"');
    // بلا هوامشَ مقيسة: لا اختراع — هامشُ الاحتياط نفسه الذي في CSS.
    expect(ptToTwips(DEFAULT_PAGE_MARGIN_PT)).toBe(1134);
  });
});

// ─────────────────────────── استهلاك PDF ───────────────────────────

describe("buildPdfHtml و@page", () => {
  const MD = "# كتابُ التكملة\n\nالحمد لله رب العالمين";

  function pageRuleOf(html: string): string {
    const match = /@page \{([^}]*)\}/.exec(html);
    if (!match) throw new Error(`لا @page في المخرج: ${html.slice(0, 200)}`);
    return match[0];
  }

  it("بلا هندسةٍ مقيسة: السطرُ مطابقٌ بايتًا ببايت لسطر اليوم", () => {
    // ضمانُ الانحدار: من لا يقيس يحصل على ما كان عليه المُنتَجُ دائمًا، حرفيًا.
    expect(pageRuleOf(buildPdfHtml(MD))).toBe("@page { size: A4; margin: 2cm; }");
    expect(pageRuleOf(buildPdfHtml(MD, { rtl: true }))).toBe("@page { size: A4; margin: 2cm; }");
    expect(buildPdfHtml(MD)).toContain("@page { size: A4; margin: 2cm; }");
  });

  it("بالهندسة المقيسة: ورقةُ الأصل تحلّ محلَّ A4 في نفس الموضع", () => {
    const html = buildPdfHtml(MD, {
      geometry: {
        widthPt: MANUSCRIPT_W,
        heightPt: MANUSCRIPT_H,
        marginsPt: { top: 28.35, right: 28.35, bottom: 42.52, left: 42.52 },
      },
    });
    expect(pageRuleOf(html)).toBe(
      "@page { size: 340.16pt 538.58pt; margin: 28.35pt 28.35pt 42.52pt 42.52pt; }",
    );
    expect(html).not.toContain("size: A4");
  });

  it("هندسةٌ بلا هوامشَ مقيسة: مقاسُها وهوامشُ ٢ سم الاحتياطية", () => {
    const html = buildPdfHtml(MD, {
      geometry: { widthPt: MANUSCRIPT_W, heightPt: MANUSCRIPT_H, marginsPt: null },
    });
    expect(pageRuleOf(html)).toBe("@page { size: 340.16pt 538.58pt; margin: 56.69pt; }");
  });
});

// ─────────────────────────── استهلاك DOCX ───────────────────────────

describe("sectPr في word/document.xml", () => {
  const DOC = (sectPr: string): string =>
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<w:document><w:body><w:p><w:r><w:t>الحمد لله رب العالمين</w:t></w:r></w:p>${sectPr}</w:body></w:document>`;

  // pandoc 3.1.3 يكتب المقطعَ فارغًا، فالورقةُ كلها إرثُ المرجع الثابت.
  const EMPTY_SECT = "<w:sectPr />";

  const manuscript = {
    widthPt: MANUSCRIPT_W,
    heightPt: MANUSCRIPT_H,
    marginsPt: { top: 28.35, right: 28.35, bottom: 42.52, left: 42.52 },
  };

  it("لا هندسةَ ⇒ لا pgSz ولا pgMar: يبقى المقطعُ على ما كان عليه", () => {
    const xml = transformDocumentXml(DOC(EMPTY_SECT), { rtl: true });
    expect(xml).toContain("<w:bidi/>");
    expect(xml).not.toContain("w:pgSz");
    expect(xml).not.toContain("w:pgMar");
  });

  it("الهندسةُ المقيسةُ تكتب pgSz/pgMar بالتوائب مع بقاء bidi", () => {
    const xml = transformDocumentXml(DOC(EMPTY_SECT), { rtl: true, geometry: manuscript });
    expect(xml).toContain('<w:pgSz w:w="6803" w:h="10772" w:orient="portrait"/>');
    expect(xml).toContain('<w:pgMar w:top="567" w:right="567" w:bottom="850" w:left="850"/>');
    expect(xml).toContain("<w:bidi/>");
    // ترتيبُ المخطط: pgSz ثم pgMar قبل bidi (CT_SectPr).
    const body = /<w:sectPr>([\s\S]*?)<\/w:sectPr>/.exec(xml)![1]!;
    expect(body.indexOf("w:pgSz")).toBeLessThan(body.indexOf("w:pgMar"));
    expect(body.indexOf("w:pgMar")).toBeLessThan(body.indexOf("w:bidi"));
  });

  it("يرث المقطعُ الهوامشَ الافتراضيةَ مع المقاسِ المقيس حين تُبطل المحصنةُ الحواشيَ", () => {
    const xml = transformDocumentXml(DOC(EMPTY_SECT), {
      rtl: true,
      geometry: { widthPt: MANUSCRIPT_W, heightPt: MANUSCRIPT_H, marginsPt: null },
    });
    expect(xml).toContain('<w:pgSz w:w="6803" w:h="10772" w:orient="portrait"/>');
    expect(xml).toContain('<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>');
  });

  it("يحلّ المقاسُ المقيس محلَّ pgSz الموجود ولا يمحو السماتِ التي لا تعرفها الهندسة", () => {
    const existing =
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" ' +
      'w:footer="720" w:gutter="0"/></w:sectPr>';
    const xml = transformDocumentXml(DOC(existing), { rtl: true, geometry: manuscript });
    expect(xml).toContain('w:w="6803"');
    expect(xml).toContain('w:top="567"');
    expect(xml).not.toContain("11906");
    expect(xml).not.toContain('w:top="1440"');
    // رأسُ المرجع وتذييلُه ومجرىه اختيارٌ لا سببَ لمحوه: لا تحملها الهندسةُ فتُترك.
    expect(xml).toContain('w:header="720"');
    expect(xml).toContain('w:footer="720"');
    expect(xml).toContain('w:gutter="0"');
  });

  it("الهندسةُ تُكتب في المستند اللاتيني أيضًا: الورقةُ صفةُ الأصل لا صفةُ اللغة", () => {
    const en = DOC(EMPTY_SECT).replace("الحمد لله رب العالمين", "An English paragraph only.");
    const xml = transformDocumentXml(en, { rtl: false, geometry: manuscript });
    expect(xml).toContain('<w:pgSz w:w="6803" w:h="10772" w:orient="portrait"/>');
    expect(xml).not.toContain("<w:bidi/>");
  });

  it("على حزمة ZIP فعلية: document.xml الناتج يحمل sectPr المقيس بعد applyRtlOoxml", () => {
    const entries: ZipEntry[] = [
      { name: "[Content_Types].xml", data: Buffer.from("<Types/>", "utf8") },
      { name: "word/document.xml", data: Buffer.from(DOC(EMPTY_SECT), "utf8") },
    ];
    const patched = applyRtlOoxml(writeZip(entries), { rtl: true, geometry: manuscript });
    const document = readZip(patched).find((entry) => entry.name === "word/document.xml");
    expect(document).toBeDefined();
    const xml = document!.data.toString("utf8");
    expect(xml).toContain("<w:pgSz ");
    expect(xml).toContain("<w:pgMar ");
    expect(xml).toContain('w:h="10772"');
  });
});

// ─────────────────────────── قراءة geometry.json ───────────────────────────

describe("pageGeometryFromStoredJson وparsePageGeometrySamples", () => {
  it("يقرأ أثرًا مخزَّنًا كما يقرؤه عاملُ التصدير", () => {
    const stored = JSON.stringify({
      source: "pdf",
      pageCount: 2,
      pages: [
        { number: 1, widthPt: 600, heightPt: 800, text: { x0: 50, y0: 60, x1: 550, y1: 740 } },
        { number: 2, widthPt: 600, heightPt: 800, text: { x0: 52, y0: 62, x1: 548, y1: 738 } },
      ],
    });
    expect(pageGeometryFromStoredJson(stored)).toEqual({
      widthPt: 600,
      heightPt: 800,
      marginsPt: { top: 61, right: 51, bottom: 61, left: 51 },
    });
  });

  it("نصٌّ تالف أو كائنٌ بلا صفحات ⇒ null لا استثناء: التصديرُ لا يسقط لأجل أثر", () => {
    expect(pageGeometryFromStoredJson("{ليس json")).toBeNull();
    expect(pageGeometryFromStoredJson(JSON.stringify({ source: "pdf", pages: [] }))).toBeNull();
    expect(pageGeometryFromStoredJson(JSON.stringify({ source: "pdf" }))).toBeNull();
    expect(pageGeometryFromStoredJson(null)).toBeNull();
  });

  it("يسقط السجلاتِ البائسة ويستثني المربعَ غيرَ المكتمل إلى null", () => {
    const samples = parsePageGeometrySamples({
      pages: [
        { widthPt: 600, heightPt: 800, text: { x0: 50, y0: 60, x1: 550, y1: 740 } },
        { widthPt: 0, heightPt: 800 },
        { widthPt: 600, heightPt: "800" },
        "ليس كائنًا",
        { widthPt: 600, heightPt: 800, text: { x0: 50, y0: 60 } },
      ],
    });
    expect(samples).toHaveLength(2);
    expect(samples[1]!.text).toBeNull();
  });
});

// ─────────────────────────── السكربت: الفشلُ لا يُسقط شيئًا ───────────────────

describe("فشلُ القياس يرتقي ولا يرمي", () => {
  async function failingInterpreter(exitCode: number): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), "geometry-fail-"));
    const script = path.join(dir, "fake-python.sh");
    await writeFile(script, `#!/bin/sh\nexit ${String(exitCode)}\n`, "utf8");
    await chmod(script, 0o755);
    return script;
  }

  it("خروجٌ غيرُ صفر ⇒ null ولا استثناء", async () => {
    const python = await failingInterpreter(3);
    try {
      await expect(
        measurePdfPageGeometry(Buffer.from("%PDF-1.4 لا شيء"), python),
      ).resolves.toBeNull();
      await expect(
        runPageGeometryScript(Buffer.from("%PDF-1.4 لا شيء"), python),
      ).resolves.toBeNull();
    } finally {
      await rm(path.dirname(python), { recursive: true, force: true });
    }
  });

  it("مفسّرٌ غيرُ موجود ⇒ null (لا مفسّر Python على هذه الآلة مثلًا)", async () => {
    await expect(
      measurePdfPageGeometry(Buffer.from("PDF"), "/nonexistent/qq/python-not-here"),
    ).resolves.toBeNull();
  });

  it("ملفٌ ليس PDF ⇒ null: لا هندسةَ من ملفٍ لا يُفتح", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "geometry-bad-"));
    try {
      const bogus = path.join(dir, "bogus.pdf");
      await writeFile(bogus, Buffer.from("ليست ملف PDF على الإطلاق"));
      await expect(measurePdfPageGeometry(bogus, PDF_PYTHON)).resolves.toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

// ─────────────────────────── السكربت على PDF حقيقي ───────────────────────────

// النصُّ لاتيني في هذا النموذج عمدًا: المُقايَمُ هنا المربَّعُ لا المحارف — السكربتُ لا
// يعرف لغةً، و`helv` يعطي صندوقًا معلومَ الحافّة اليسرى بلا اعتماديةٍ على ملفّ خطّ.
// الأسطرُ مُوزَّعةٌ بين أعلى الصفحة وأسفلها كي يقع كلُّ هامشٍ في نطاق المعقول فتُحصِّنَه
// المحصنةُ لا تُبطِله: هامشٌ ٦٠٪ من العرض أثرُ قياسٍ لا مارجن (انظر اختبار المحصنة فوق).
const BUILD_FIXTURE = `
import pymupdf, sys
path = sys.argv[1]
doc = pymupdf.open()
for _ in range(2):
    page = doc.new_page(width=340.16, height=538.58)
    page.insert_text((42.5, 60), "Bismi llahi rabbi al alamin wa salatu wa salam", fontsize=9)
    page.insert_text((42.5, 120), "ala nabiyyina muhammadin sallallahu alaihi wa", fontsize=9)
    page.insert_text((42.5, 480), "sallam", fontsize=9)
# صفحةٌ ممسوحةٌ بلا نصٍّ مضمَّن: لا يُختلق لها مربعٌ ولا هامش.
doc.new_page(width=340.16, height=538.58)
doc.save(path)
doc.close()
`;

describe.skipIf(!HAS_FITZ)("page-geometry.py على PDF حقيقي مقيس", () => {
  it("يطبع الصفحاتِ والمقاساتِ ومربعَ النصّ ثم يدور إلى هندسةٍ صالحة", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "geometry-real-"));
    const pdfPath = path.join(dir, "manuscript.pdf");
    try {
      await execFileAsync(PDF_PYTHON, ["-c", BUILD_FIXTURE, pdfPath]);

      const stdout = await runPageGeometryScript(pdfPath, PDF_PYTHON);
      expect(stdout).toBeTruthy();
      const payload = JSON.parse(stdout!) as {
        pageCount: number;
        pages: {
          number: number;
          widthPt: number;
          heightPt: number;
          text: { x0: number; y0: number; x1: number; y1: number } | null;
        }[];
      };

      expect(payload.pageCount).toBe(3);
      expect(payload.pages.map((page) => page.number)).toEqual([1, 2, 3]);
      // المقاسُ بالنقاط كما يقرؤه القارئ، لا بكسلاتُ صورةِ التقسيم.
      expect(payload.pages[0]!.widthPt).toBeCloseTo(340.16, 1);
      expect(payload.pages[0]!.heightPt).toBeCloseTo(538.58, 1);
      // لا اختلاق: صفحةٌ بلا نصّ مضمَّن مربعُها null صراحةً.
      expect(payload.pages[2]!.text).toBeNull();
      const box = payload.pages[0]!.text!;
      const widthPt = payload.pages[0]!.widthPt;
      const heightPt = payload.pages[0]!.heightPt;
      // الحافّةُ اليسرى معلومةٌ مستقلاً: موضعُ الإدخال نفسُه، فهو قياسٌ لا توقّع.
      expect(box.x0).toBeCloseTo(42.5, 2);
      expect(box.x1).toBeLessThanOrEqual(widthPt);
      expect(box.y1).toBeLessThanOrEqual(heightPt);

      const geometry = summarizePageGeometry(parsePageGeometrySamples(payload))!;
      expect(geometry.widthPt).toBeCloseTo(340.16, 1);
      expect(geometry.heightPt).toBeCloseTo(538.58, 1);
      expect(geometry.marginsPt).not.toBeNull();
      // حسابُ الحواشي الأربعة على المربَّع المقيس نفسه، لا على تقديرٍ من الاختبار.
      const margins = geometry.marginsPt!;
      expect(margins.left).toBeCloseTo(box.x0, 2);
      expect(margins.top).toBeCloseTo(box.y0, 2);
      expect(margins.right).toBeCloseTo(widthPt - box.x1, 2);
      expect(margins.bottom).toBeCloseTo(heightPt - box.y1, 2);
      // المحصنةُ تعمل على قياسٍ سليم: كلُّ حافةٍ موجبةٌ ولا تجاوز ٤٠٪ من بُعد صفحتها.
      for (const [edge, value] of Object.entries(margins)) {
        expect(value, edge).toBeGreaterThan(0);
      }
      expect(margins.left).toBeLessThanOrEqual(0.4 * widthPt);
      expect(margins.right).toBeLessThanOrEqual(0.4 * widthPt);
      expect(margins.top).toBeLessThanOrEqual(0.4 * heightPt);
      expect(margins.bottom).toBeLessThanOrEqual(0.4 * heightPt);
      // الحبرُ بين الحافتين: لا تُختلق هوامشُ أكبرُ من الصفحة ولا يُفقَد منها عرضٌ.
      expect(margins.left + margins.right).toBeLessThan(widthPt);
      expect(margins.top + margins.bottom).toBeLessThan(heightPt);

      await expect(measurePdfPageGeometry(pdfPath, PDF_PYTHON)).resolves.toEqual(geometry);

      // أثرُ العامل: نفسُ المقاس من الملف الخام ومن هندسةٍ جُمِّدت في JSON.
      const stored = JSON.stringify({ source: "pdf", ...payload });
      expect(pageGeometryFromStoredJson(stored)).toEqual(geometry);
      // المُنتَجُ بورقةِ الأصل لا بورقةِ الافتراض.
      expect(geometryToPageCss(geometry)).toContain("size: 340.16pt 538.58pt");
      expect(geometryToPageCss(geometry)).not.toContain("A4");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("السقفُ يقلّص العيّنةَ ولا يكذب على عددِ الصفحات المقاسة", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "geometry-cap-"));
    const pdfPath = path.join(dir, "book.pdf");
    try {
      await execFileAsync(PDF_PYTHON, ["-c", BUILD_FIXTURE, pdfPath]);
      const stdout = await runPageGeometryScript(pdfPath, PDF_PYTHON, 1);
      const payload = JSON.parse(stdout!) as { pageCount: number; pages: unknown[] };
      expect(payload.pageCount).toBe(1);
      expect(payload.pages).toHaveLength(1);
      // عيّنةٌ واحدة: لا هامشَ يُدَّعى على كتابٍ لم تُقرأ إلا صفحةٌ واحدة منه.
      expect(summarizePageGeometry(parsePageGeometrySamples(payload))!.marginsPt).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

const COMPILE_CHECK =
  "import sys; compile(open(sys.argv[1], encoding='utf-8').read(), sys.argv[1], 'exec')";

describe("الفحص النحوي للسكربت", () => {
  it("يُترجَم بلا خطأ نحوي على مفسّر الآلة", () => {
    // `compile()` لا `py_compile`: هذا يفحص النحوَ وذاك يكتب `__pycache__` بجوار
    // السكربت، والمسارُ غيرُ مستثنًى في .gitignore فيُخلِّف أثرًا في المستودع.
    execFileSync(PDF_PYTHON, ["-c", COMPILE_CHECK, SCRIPT], { stdio: "ignore" });
  });
});
