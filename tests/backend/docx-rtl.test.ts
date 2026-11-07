/**
 * طبقة تصحيح OOXML العربية (packages/pipeline/src/output/docx-rtl.ts).
 *
 * هذه الطبقة هي ما يجعل ملف .docx عربيًّا فعلًا: بلاها يبقى كل ما يكتبه pandoc
 * `-M dir=rtl` — أي bidi أعمى على كل فقرة (بما فيها الإنجليزية)، وجداول بأعمدة
 * LTR، ومقاطع فارغة، وفتحة خط معقّد (`a:cs`) خالية ⇒ عربية بخط لاتيني.
 *
 * القياس لا التخمين: كل توكيد هنا مقابل مخرج pandoc 3.1.3 الحقيقي على نفس
 * المستند (انظر مجموعة "نهاية إلى نهاية")، لا مقابل XML من تأليف الاختبار فقط.
 */

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARABIC_COMPLEX_FONT,
  ARABIC_LANGUAGE_TAG,
  applyRtlOoxml,
  decodeXmlText,
  hasArabic,
  isRtlText,
  transformDocumentXml,
  transformFontTableXml,
  transformNumberingXml,
  transformSettingsXml,
  transformStylesXml,
} from "@ibn-al-azhar-docs/pipeline/output/docx-rtl";
import { generateDocx, readDocxDocumentXml, readZip, writeZip } from "@ibn-al-azhar-docs/pipeline";
import type { ZipEntry } from "@ibn-al-azhar-docs/pipeline/output/embed-fonts";

const AR = "الحمد لله رب العالمين والصلاة والسلام على رسول الله";
const EN = "This is an English paragraph that must stay Latin.";

function para(inner: string): string {
  return `<w:p>${inner}</w:p>`;
}

function run(text: string, rPr = ""): string {
  return `<w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r>`;
}

function doc(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><w:document>${body}</w:document>`;
}

/** بناء DOCX مصغّر في الذاكرة — بلا pandoc، لاختبار الطبقة على مستوى ZIP. */
function fakeDocx(parts: Record<string, string>): Buffer {
  const entries: ZipEntry[] = Object.entries(parts).map(([name, xml]) => ({
    name,
    data: Buffer.from(xml, "utf8"),
  }));
  return writeZip(entries);
}

function entryOf(buf: Buffer, name: string): string {
  const found = readZip(buf).find((entry) => entry.name === name);
  if (!found) throw new Error(`missing zip entry: ${name}`);
  return found.data.toString("utf8");
}

/**
 * وسم فارغ متسامح مع المسافة: pandoc يكتب `<w:bidi />` والطبقة تكتب `<w:bidi/>`.
 * التوكيدات المقيسة على مخرجه الحقيقي لا ينبغي أن تتعلق باللهجة لا بالمحتوى.
 */
function expectVoidTag(html: string, tag: string): void {
  expect(html).toMatch(new RegExp(`<w:${tag}\\s*\\/>`));
}

describe("اتجاه النصّ (المصادر المشتركة للقرار)", () => {
  it("يقرّر من inferAlignment لا من عتبة محلية", () => {
    expect(isRtlText(AR)).toBe(true);
    expect(isRtlText(EN)).toBe(false);
    // الحياد (أرقام/فراغ) ⇒ undefined لا false — فيَرِث اتجاه المستند.
    expect(isRtlText("123 456")).toBeUndefined();
  });

  it("يرى العربية خلف الكيانات الرقمية والاسمية", () => {
    expect(decodeXmlText("&#1575;&#1604;&#1604;&#1607;")).toBe("الله");
    expect(decodeXmlText("a&amp;b &lt;t&gt; &#x627;")).toBe("a&b <t> ا");
    expect(
      isRtlText(decodeXmlText("&#1575;&#1604;&#1604;&#1607; &#1587;&#1605;&#1575;&#1587;")),
    ).toBe(true);
    // كسر خارج مدى unicode لا يُسقط بقية النصّ ولا يرمي خطأ.
    expect(decodeXmlText("&#x110000;abc")).toBe("abc");
  });

  it("hasArabic فرقٌ بين «يحوي عربية» و«غالبه عربية»", () => {
    expect(hasArabic(`Page ${AR} 12`)).toBe(true);
    expect(hasArabic(EN)).toBe(false);
  });
});

describe("transformDocumentXml — الفقرات", () => {
  it("يضيف w:bidi للفقرة العربية بموضعه المخططى (قبل spacing/ind/jc)", () => {
    const out = transformDocumentXml(
      para(
        `<w:pPr><w:spacing w:after="120"/><w:ind w:left="0"/><w:jc w:val="left"/></w:pPr>${run(AR)}`,
      ),
    );
    const bidi = out.indexOf("<w:bidi/>");
    expect(bidi).toBeGreaterThan(-1);
    expect(bidi).toBeLessThan(out.indexOf("<w:spacing"));
    expect(bidi).toBeLessThan(out.indexOf("<w:jc"));
  });

  it("يحوّل jc=left إلى right تحت bidi، ويترك المنطقي (start/both)", () => {
    const left = transformDocumentXml(para(`<w:pPr><w:jc w:val="left"/></w:pPr>${run(AR)}`));
    expect(left).toContain('<w:jc w:val="right"/>');
    const start = transformDocumentXml(para(`<w:pPr><w:jc w:val="start"/></w:pPr>${run(AR)}`));
    expect(start).toContain('<w:jc w:val="start"/>');
  });

  it("يحذف bidi وrtl عن الفقرة اللاتينية — هذا هو force-bidisation الذي منعه", () => {
    const out = transformDocumentXml(
      para(
        `<w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rtl/></w:rPr><w:t>${EN}</w:t></w:r>`,
      ),
    );
    expect(out).not.toContain("<w:bidi");
    expect(out).not.toContain("<w:rtl");
    // المحاذاة الموضوعة يدويًا لفقرة إنجليزية لا تُقلَب (ليست عربية أصلًا).
    expect(out).toContain('<w:jc w:val="right"/>');
  });

  it("يبقي bidi على الفقرة المحايدة إذا كان اتجاه المستند عربيًا", () => {
    const out = transformDocumentXml(para(run("123 456")), { rtl: true });
    expect(out).toContain("<w:bidi/>");
  });
});

describe("transformDocumentXml — الـ runs والخط المعقّد", () => {
  it("يضبط cs وszCs وlang/@bidi وrtl للـ run العربي مرة واحدة لكل منها", () => {
    const out = transformDocumentXml(
      para(
        `<w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cstheme="minorBidi"/><w:sz w:val="28"/></w:rPr><w:t>${AR}</w:t></w:r>`,
      ),
    );
    expect(out).toContain(`w:cs="${ARABIC_COMPLEX_FONT}"`);
    expect(out).not.toContain("w:cstheme");
    expect(out).toContain('<w:szCs w:val="28"/>');
    expect(out).toContain(`w:bidi="${ARABIC_LANGUAGE_TAG}"`);
    expect(out.match(/<w:rtl\/>/g) ?? []).toHaveLength(1);
    expect(out.match(/<w:rFonts/g) ?? []).toHaveLength(1);
    // خط اللاتيني لم يُمسّ
    expect(out).toContain('w:ascii="Arial"');
  });

  it("لا يُرثِث عناصر موجودة: cs صريح يبقى كما هو ولا يُكرَّر rFonts", () => {
    const out = transformDocumentXml(
      para(
        `<w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:rFonts w:cs="Thuluth"/><w:sz w:val="20"/><w:szCs w:val="22"/></w:rPr><w:t>${AR}</w:t></w:r>`,
      ),
    );
    expect(out).toContain('w:cs="Thuluth"');
    expect(out).not.toContain(`w:cs="${ARABIC_COMPLEX_FONT}"`);
    expect(out.match(/<w:szCs/g) ?? []).toHaveLength(1);
    expect(out).toContain('<w:szCs w:val="22"/>');
  });

  it("الـ run اللاتيني داخل فقرة عربية لا يحصل على rtl ولا على خط معقّد", () => {
    const out = transformDocumentXml(
      para(`<w:pPr><w:bidi/></w:pPr>${run(AR)}${run("ISBN 1234567890")}`),
    );
    const enRun = out.slice(out.indexOf("ISBN"));
    expect(enRun).not.toContain("<w:rtl");
    expect(enRun).not.toContain(`w:cs=`);
  });

  it("المعادلات وحقول الصور خارج القرار: لا w:t ⇒ لا تعديل", () => {
    const math =
      `<w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:rFonts w:cstheme="minorBidi"/></w:rPr>` +
      `<m:oMath><m:r><m:t>²</m:t></m:r></m:oMath></w:r>${run(AR)}</w:p>`;
    const out = transformDocumentXml(math);
    expect(out).toContain('<w:rFonts w:cstheme="minorBidi"/>'); // run المعادلة لم يُمسّ
    expect(out.match(/<m:t>²<\/m:t>/g) ?? []).toHaveLength(1);
    expect(out).toContain(`w:cs="${ARABIC_COMPLEX_FONT}"`); // وrun النصّ صُحِّح
  });
});

describe("transformDocumentXml — الجداول والمقاطع", () => {
  it("الجدول العربي يحصل على bidiVisual بموضعه المخططى (قبل tblW)", () => {
    const out = transformDocumentXml(
      doc(
        `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tr><w:tc>${para(run(AR))}</w:tc></w:tr></w:tbl>`,
      ),
    );
    expect(out).toContain("<w:bidiVisual/>");
    expect(out.indexOf("<w:bidiVisual/>")).toBeLessThan(out.indexOf("<w:tblW"));
  });

  it("الجدول اللاتيني لا يُمسّ", () => {
    const out = transformDocumentXml(
      doc(
        `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tr><w:tc>${para(run(EN))}</w:tc></w:tr></w:tbl>`,
      ),
    );
    expect(out).not.toContain("bidiVisual");
  });

  it("<w:sectPr /> الفارغ يكتسب bidi بدل أن يبقى بلا اتجاه", () => {
    const out = transformDocumentXml(doc("<w:sectPr />"), { rtl: true });
    expect(out).toContain("<w:sectPr><w:bidi/></w:sectPr>");
  });
});

describe("تحويلات الأجزاء الأخرى", () => {
  it("styles.xml: cstheme ⇒ cs صريح، sz ⇒ szCs مثله، lang ⇒ bidi", () => {
    const out = transformStylesXml(
      `<w:styles><w:docDefaults><w:rPrDefault><w:rPr>` +
        `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cstheme="minorBidi"/><w:sz w:val="24"/><w:szCs w:val="24"/>` +
        `<w:lang w:val="en-US" w:eastAsia="en-US"/>` +
        `</w:rPr></w:rPrDefault></w:docDefaults></w:styles>`,
    );
    expect(out).not.toContain("cstheme");
    expect(out).toContain(`w:cs="${ARABIC_COMPLEX_FONT}"`);
    expect(out).toContain(
      `w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="${ARABIC_LANGUAGE_TAG}"`,
    );
    // szCs موجود أصلًا ⇒ لم يُكرَّر
    expect(out.match(/<w:szCs/g) ?? []).toHaveLength(1);
  });

  it("numbering.xml: bidi داخل pPr التعريف، وحين يغيب pPr يُدسّ بترتيبه", () => {
    const withPr = transformNumberingXml(
      `<w:numbering><w:lvl w:ilvl="0"><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:rFonts w:cs="X"/></w:rPr></w:lvl></w:numbering>`,
    );
    expect(withPr).toContain("<w:bidi/>");
    expect(withPr.indexOf("<w:bidi/>")).toBeLessThan(withPr.indexOf("<w:ind"));

    const withoutPr = transformNumberingXml(
      `<w:numbering><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:rPr><w:rFonts w:cs="X"/></w:rPr></w:lvl></w:numbering>`,
    );
    expect(withoutPr).toContain("<w:pPr><w:bidi/></w:pPr>");
    expect(withoutPr.indexOf("<w:pPr>")).toBeLessThan(withoutPr.indexOf("<w:rPr>"));
  });

  it("settings.xml: themeFontLang يكتسب bidi ولا يُكرَّر", () => {
    expect(transformSettingsXml(`<w:settings><w:zoom w:val="100"/></w:settings>`)).toContain(
      `<w:themeFontLang w:bidi="${ARABIC_LANGUAGE_TAG}"/>`,
    );
    const already = `<w:settings><w:themeFontLang w:val="en-US" w:bidi="ar-SA"/></w:settings>`;
    expect(transformSettingsXml(already)).toBe(already);
    // بلا أبناء يكتب pandoc `<w:settings/>` مغلقًا ذاتيًا — لا وسم إغلاق يُدرَج قبله.
    const empty = transformSettingsXml(`<w:settings xmlns:w="x"/>`);
    expect(empty).toContain(`<w:themeFontLang w:bidi="${ARABIC_LANGUAGE_TAG}"/>`);
    expect(empty).toMatch(/^<w:settings xmlns:w="x">.*<\/w:settings>$/);
  });

  it("fontTable.xml: قيد Amiri مرة واحدة، وإن وُجد لم يُضف", () => {
    const added = transformFontTableXml(`<w:fonts><w:font w:name="Arial"/></w:fonts>`);
    expect(added.match(/w:name="Amiri"/g) ?? []).toHaveLength(1);
    expect(added).not.toContain("<w:sig"); // لا توقيعات مختلَقة
    const present = `<w:fonts><w:font w:name="${ARABIC_COMPLEX_FONT}"/></w:fonts>`;
    expect(transformFontTableXml(present)).toBe(present);
    // القوائم الفارغة تُكتب `<w:fonts/>` — يُفتح الوسم ليُقيَّد لا يبقى بلا خط.
    expect(transformFontTableXml(`<w:fonts xmlns:w="x"/>`)).toMatch(
      /^<w:fonts xmlns:w="x"><w:font w:name="Amiri">[\s\S]*<\/w:font><\/w:fonts>$/,
    );
  });
});

describe("applyRtlOoxml — على مستوى الحزمة", () => {
  const parts = {
    "[Content_Types].xml": "<Types/>",
    "_rels/.rels": "<Relationships/>",
    "word/document.xml": doc(
      `<w:tbl><w:tblPr/><w:tr><w:tc>${para(run(AR))}</w:tc></w:tr></w:tbl>` +
        para(run(EN)) +
        para(run(AR)) +
        "<w:sectPr />",
    ),
    "word/styles.xml": `<w:styles><w:rPr><w:rFonts w:cstheme="minorBidi"/><w:sz w:val="24"/></w:rPr></w:styles>`,
    "word/numbering.xml":
      '<w:numbering><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:numbering>',
    "word/settings.xml": "<w:settings/>",
    "word/fontTable.xml": "<w:fonts/>",
    "docProps/core.xml": "<cp:coreProperties/>",
  };

  it("يصلّح الأجزاء الخمسة ويترك الباقي بايت ببايت", () => {
    const out = applyRtlOoxml(fakeDocx(parts));
    const names = readZip(out).map((e) => e.name);
    expect(names).toEqual(Object.keys(parts)); // لا أجزاء جديدة ⇒ لا مساس بالـ rels
    expect(entryOf(out, "word/document.xml")).toContain("<w:bidiVisual/>");
    expect(entryOf(out, "word/styles.xml")).toContain(`w:cs="${ARABIC_COMPLEX_FONT}"`);
    expect(entryOf(out, "word/numbering.xml")).toContain("<w:bidi/>");
    expect(entryOf(out, "word/settings.xml")).toContain(`w:bidi="${ARABIC_LANGUAGE_TAG}"`);
    expect(entryOf(out, "word/fontTable.xml")).toContain('w:name="Amiri"');
    expect(entryOf(out, "docProps/core.xml")).toBe(parts["docProps/core.xml"]);
  });

  it("المستند الخالي من العربية: تصحيح اتجاه فقط، بلا إعلان خط ولا ترقيم RTL", () => {
    const out = applyRtlOoxml(
      fakeDocx({ ...parts, "word/document.xml": doc(para(run(EN)) + para(run("12 34"))) }),
    );
    expect(entryOf(out, "word/document.xml")).not.toContain("<w:bidi/>");
    expect(entryOf(out, "word/styles.xml")).toBe(parts["word/styles.xml"]);
    expect(entryOf(out, "word/fontTable.xml")).not.toContain("Amiri");
  });

  it("قوابل الطوارئ: ZIP بلا word/document.xml أو enabled:false ⇒ بلا تغيير، وبلا ZIP ⇒ خطأ صريح", () => {
    // buffer ليس ZIP: readZip يرمي — لا نبتلعه ونُسلّم ملفًا فاسدًا كمُنتَج «سليم».
    expect(() => applyRtlOoxml(Buffer.from("this is not a zip file at all"))).toThrow(/ZIP/);
    const noDoc = fakeDocx({
      "[Content_Types].xml": "<Types/>",
      "word/settings.xml": "<w:settings/>",
    });
    expect(applyRtlOoxml(noDoc)).toBe(noDoc);
    const full = fakeDocx(parts);
    expect(applyRtlOoxml(full, { enabled: false })).toBe(full);
  });

  it("عملية على نفسها: تطبيق ثانٍ لا يغيّر حرفًا", () => {
    const once = applyRtlOoxml(fakeDocx(parts));
    const twice = applyRtlOoxml(once);
    const a = Object.fromEntries(readZip(once).map((e) => [e.name, e.data.toString("utf8")]));
    const b = Object.fromEntries(readZip(twice).map((e) => [e.name, e.data.toString("utf8")]));
    expect(b).toEqual(a);
  });
});

function toolAvailable(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const HAS_PANDOC = toolAvailable("pandoc", ["--version"]);
const HAS_PYTHON = toolAvailable("python3", ["--version"]);
const describeReal = HAS_PANDOC ? describe : describe.skip;

describeReal("نهاية إلى نهاية: pandoc 3.1.3 الحقيقي", () => {
  // نفس المستند الذي قِيس عليه السلوك: عنوان عربي، فقرة عربية، فقرة إنجليزية،
  // جدول عربي، قائمة عربية.
  const MD = [
    `# كتاب في الفقه`,
    ``,
    AR,
    ``,
    EN,
    ``,
    `| اسم | شرح |`,
    `|-----|-----|`,
    `| كتاب | مفيد |`,
    ``,
    `- عنصر أول في القائمة`,
    `- عنصر ثانٍ`,
  ].join("\n");

  it("مخرج pandoc الخام فعلاً معيب (والطبقة هي ما يصلحه)", async () => {
    const raw = await generateDocx({ markdown: MD, cleaned: MD }, { rtlOoxml: false });
    const xml = readDocxDocumentXml(raw);
    const englishPara =
      /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*English[\s\S]*?<\/w:p>/.exec(xml)?.[0] ?? "";
    expect(englishPara).toContain("<w:bidi"); // bidi أعمى على فقرة إنجليزية
    expect(xml).not.toContain("bidiVisual"); // والترتيب الأفقي للعربية لم يُضبط
  }, 60_000);

  it("بعد الطبقة: bidi للعربية فقط، jc يمين، جدول عكسي، ومقطع عربي", async () => {
    const buf = await generateDocx({ markdown: MD, cleaned: MD });
    const xml = readDocxDocumentXml(buf);

    const englishPara =
      /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*English[\s\S]*?<\/w:p>/.exec(xml)?.[0] ?? "";
    expect(englishPara).not.toContain("<w:bidi");
    expect(englishPara).not.toContain("<w:rtl");

    const arabicPara =
      /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*رب العالمين[\s\S]*?<\/w:p>/.exec(xml)?.[0] ?? "";
    expectVoidTag(arabicPara, "bidi");

    expect(xml).toContain("<w:bidiVisual/>");
    expect(xml).toMatch(/<w:sectPr[^>]*>\s*<w:bidi\s*\/>/);
    expect(xml.match(/<w:jc w:val="left"/g) ?? []).toHaveLength(0);
    expect(xml).toContain(`w:cs="${ARABIC_COMPLEX_FONT}"`);
    expect(entryOf(buf, "word/styles.xml")).not.toContain("w:cstheme");
    expectVoidTag(entryOf(buf, "word/numbering.xml"), "bidi");
  }, 60_000);

  it("لا عنوان وهمي: لا فقرة «Document» في المُنتَج", async () => {
    const buf = await generateDocx({ markdown: MD, cleaned: MD });
    const xml = readDocxDocumentXml(buf);
    expect(xml).not.toContain('w:val="Title"');
    expect(xml).not.toMatch(/<w:t[^>]*>Document<\/w:t>/);
  }, 60_000);

  it("المعادلات لا تُمسّ: OMML كما خرج من pandoc", async () => {
    const math = "معادلة في النصّ $$x^{2} + y^{2} = z^{2}$$ نهاية";
    const buf = await generateDocx({ markdown: math, cleaned: math });
    const xml = readDocxDocumentXml(buf);
    const omml = (xml.match(/<m:t\b[^>]*>[\s\S]*?<\/m:t>/g) ?? []).join("|");
    expect(omml).not.toBe("");
    // تطبيق ثانٍ (الطبقة تُشغَّل مرة أخرى على ناتجها) لا يغيّر رموز المعادلة
    const again = readDocxDocumentXml(applyRtlOoxml(buf));
    expect((again.match(/<m:t\b[^>]*>[\s\S]*?<\/m:t>/g) ?? []).join("|")).toBe(omml);
  }, 60_000);

  it.skipIf(!HAS_PYTHON)(
    "الحزمة الناتجة تفتح كملف OOXML سليم (CRC وأسماء الأجزاء)",
    async () => {
      const buf = await generateDocx({ markdown: MD, cleaned: MD });
      const dir = await mkdtemp(path.join(tmpdir(), "docx-rtl-"));
      const file = path.join(dir, "out.docx");
      try {
        await writeFile(file, buf);
        const report = execFileSync(
          "python3",
          [
            "-c",
            `import zipfile,sys
z = zipfile.ZipFile(${JSON.stringify(file)})
bad = z.testzip()
assert bad is None, "corrupt entry: " + str(bad)
names = set(z.namelist())
assert "word/document.xml" in names and "[Content_Types].xml" in names
print(len(names), z.getinfo("word/document.xml").file_size)`,
          ],
          { encoding: "utf8" },
        ).trim();
        const [count, docSize] = report.split(" ");
        expect(Number(count)).toBeGreaterThanOrEqual(10);
        expect(Number(docSize)).toBeGreaterThan(500);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
