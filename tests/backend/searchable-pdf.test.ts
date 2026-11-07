/**
 * بوابة أمانة طبقة النصّ في «الPDF القابل للبحث» الناتج من صورة OCR
 * (`packages/pipeline/scripts/generate-searchable-pdf.py`).
 *
 * المُنتَج القديم كان ملفًا بلا طبقةٍ نصّية أصلًا: `insert_textbox` بخطّ `helv` لا يملك
 * حرفًا عربيًا، ويرجع عددًا سالبًا ولا يكتب شيئًا حين لا يسعَ النصُّ الصندوق (قيس: حجم
 * ٢٠ في صندوق ٤٠ ⇒ ‎-17.4)، فكانت الصفحة الممسوحة تُسلَّم بطبقةٍ فارغة بصمت. والكتابة
 * المباشرة بـ Amiri نفسه لا تُنقذها: استخراج MuPDF يرجع ترتيبًا بصريًا محارفَ معروضة
 * (U+FE70–U+FEFF) لأن ToUnicode تُبنى بالبحث العكسي في cmap الخطّ وهو يحوي الأشكال السياقية.
 * الطبقة الصحيحة تُبنى بـ WeasyPrint (Pango/HarfBuzz) ثم تُلصَق على صفحة الصورة.
 *
 * كلُّ رقمٍ هنا مقيسٌ على المخرج الفعلي لا على التوقّع: صورةٌ من الأصل الممسوح في
 * `test-data/source/…حامد.pdf` صفحتُه الأولى عند ١٥٠dpi ⇒ ٨٤٠ بكسلًا على صفحة ٤٠٣٫٢ نقطة،
 * فمقياسُها ٠٫٤٨ نقطة/بكسل — والعيبُ القديم كان يضرب في ١ فينزل كلَّ سطرٍ عند بكسلاته
 * (٤/٣ من موضعه على ورقة ٩٦dpi). التصيير: PyMuPDF 1.28.2 + WeasyPrint 70.0 + Amiri المودَع
 * في `packages/pipeline/assets/fonts`. والقراءة بـ PyMuPDF من ملفٍّ مؤقت لا من stdout لأن
 * fitz يطبع تحذيراتٍ على نفس القناة (نفس علّة `pdf-engine.ts`).
 */

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { orderShaddaFirst } from "@ibn-al-azhar-docs/pipeline/output/pdf";
import { findAmiriFonts } from "@ibn-al-azhar-docs/pipeline/output/embed-fonts";
import { HAS_PDF_ENGINE, PDF_PYTHON } from "./pdf-engine";

const SCRIPT = fileURLToPath(
  new URL("../../packages/pipeline/scripts/generate-searchable-pdf.py", import.meta.url),
);
const FONT_DIR = path.dirname(findAmiriFonts().regular);
const SOURCE_PDF = fileURLToPath(
  new URL(
    "../../test-data/source/لا_أعلم_هويتي_حوار_بين_متشكك_ومتيقن_حسام_الدين_حامد.pdf",
    import.meta.url,
  ),
);

/**
 * الدمجُ في نهاية المسار يعمل بـ pdf-lib كما في `workers/ocr-worker/src/helpers.ts`؛
 * والحزمة اعتماديةُ pipeline والعامل لا جذرِ الاختبارات، فتُحمَّل من مواضعها بـ
 * createRequire. الوجه مُعرَّفٌ هنا بقدر ما يُستخدم منه فقط — لا any على المُنتَج.
 */
interface PdfLibDocumentLike {
  getPageIndices(): number[];
  copyPages(source: PdfLibDocumentLike, pageIndices: number[]): Promise<object[]>;
  addPage(page: object): unknown;
  save(): Promise<Uint8Array>;
}

interface PdfLibModule {
  PDFDocument: {
    create(): Promise<PdfLibDocumentLike>;
    load(bytes: Uint8Array): Promise<PdfLibDocumentLike>;
  };
}

const pdfLib = createRequire(path.join(process.cwd(), "packages/pipeline/package.json"))(
  "pdf-lib",
) as PdfLibModule;

// ─────────────────────────── المدخلات ───────────────────────────

const PLAIN = "الحمد لله رب العالمين";
const PROSE = "وقال ابن كثير رحمه الله في تفسيره";
const MIXED = "Page 12 رقم الصفحة 34 ABC";
const ESCAPED = 'سطرٌ فيه "اقتباس" و <وسم> و & رمز';

// السطورُ المشكَّلة تُبنى بالنقاط الرمزية صراحةً: لا يُترك ترتيبُ المحارف المركَّبة لمحرّر
// النص. الحركةُ قبل الشدّة هي الترتيب الذي يخرج «الرَّحْمَنِ» مستخرَجة «الرaَّحْمَنِ»
// بحرفٍ لاتيني داخل الكلمة إن لم تُقدَّم الشدّة على حركات عنقودها.
const FATHA = "\u064E";
const KASRA = "\u0650";
const SUKUN = "\u0652";
const SHADDA = "\u0651";
const VOWELED = [
  `\u0628${KASRA}\u0633${SUKUN}\u0645${KASRA}`,
  `\u0627\u0644\u0644${FATHA}${SHADDA}\u0647${KASRA}`,
  `\u0627\u0644\u0631${FATHA}${SHADDA}\u062D${SUKUN}\u0645${FATHA}\u0646${KASRA}`,
  `\u0627\u0644\u0631${FATHA}${SHADDA}\u062D${KASRA}\u064A\u0645${KASRA}`,
].join(" ");

interface OcrLine {
  text: string;
  bbox: number[];
}

// بكسلاتٌ في ورقةٍ عرضُها ٨٤٠ بكسلًا: كلُّ سطرٍ في موضعٍ مختلف ليُقاس المقياسُ لا الحظّ.
const LINES: OcrLine[] = [
  { text: PLAIN, bbox: [80, 200, 600, 250] },
  { text: VOWELED, bbox: [60, 400, 780, 460] },
  { text: MIXED, bbox: [80, 600, 700, 645] },
  { text: PROSE, bbox: [70, 800, 760, 850] },
  { text: ESCAPED, bbox: [70, 950, 780, 990] },
];

const ARABIC_ONLY_LINES: OcrLine[] = [
  { text: PLAIN, bbox: [80, 200, 600, 250] },
  { text: VOWELED, bbox: [60, 400, 780, 460] },
  { text: PROSE, bbox: [70, 800, 760, 850] },
];

// ─────────────────────────── أدوات القياس ───────────────────────────

/**
 * صفحةُ الأصل الممسوح ⇒ PNG ببكسلاتها، مع مقاسِ البكسل ومقاسِ الصفحة بالنقطة مقيسَين معًا:
 * المقياس (نقطة/بكسل) يُحسب من الرقمين لا من ثابت، وتلك عينُ العِلّة التي تُقاس هنا.
 */
const RENDER_PAGE = `import json, sys, fitz
doc = fitz.open(sys.argv[1])
page = doc[int(sys.argv[2])]
pm = page.get_pixmap(dpi=int(sys.argv[3]))
pm.save(sys.argv[4])
with open(sys.argv[5], "w", encoding="utf-8") as out:
    out.write(json.dumps({"width": pm.width, "height": pm.height,
                          "pageRect": [page.rect.x0, page.rect.y0,
                                       page.rect.x1, page.rect.y1]}))`;

/** النصُّ المستخرَج لكل صفحة مع صناديق أسطرها وخطوطها: الكتابة إلى ملفٍّ لا stdout. */
const INSPECT = `import json, sys, fitz
doc = fitz.open(sys.argv[1])
pages = []
for page in doc:
    lines = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"])
            if text.strip():
                lines.append({"text": text, "bbox": list(line["bbox"])})
    pages.append({
        "text": page.get_text(),
        "lines": lines,
        "rect": [page.rect.x0, page.rect.y0, page.rect.x1, page.rect.y1],
        "fonts": [row[3] for row in page.get_fonts()],
    })
with open(sys.argv[2], "w", encoding="utf-8") as out:
    out.write(json.dumps({"pages": pages}, ensure_ascii=False))`;

/** عدَدُ البكسلات المختلفة بين تصييرِ ورقتين: الصفر يعني طبقةً بلا أي حبرٍ مرئي. */
const DIFF_PAGE_PIXELS = `import json, sys, fitz
dpi = int(sys.argv[3])
a = fitz.open(sys.argv[1])[0].get_pixmap(dpi=dpi)
b = fitz.open(sys.argv[2])[0].get_pixmap(dpi=dpi)
differing = sum(1 for x, y in zip(a.samples, b.samples) if x != y)
with open(sys.argv[4], "w", encoding="utf-8") as out:
    out.write(json.dumps({"same": a.samples == b.samples, "bytes": len(a.samples),
                          "differing": differing}))`;

/** استدعاء `order_shadda_first` من السكربت نفسه على قائمة نصوص — بوابة التكافؤ. */
const PY_SHADDA = `import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("gsp", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
texts = json.loads(open(sys.argv[2], encoding="utf-8").read())
out = [mod.order_shadda_first(t) for t in texts]
open(sys.argv[3], "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False))`;

interface ExtractedLine {
  text: string;
  bbox: [number, number, number, number];
}

interface InspectedPage {
  text: string;
  lines: ExtractedLine[];
  rect: [number, number, number, number];
  fonts: string[];
}

interface Inspected {
  pages: InspectedPage[];
}

interface PageImage {
  png: string;
  width: number;
  height: number;
  rect: [number, number, number, number];
  /** نقطةً لكل بكسل، مقيسةً من الصفحة لا مفترضةً. */
  scale: number;
}

/**
 * `-B` لأن تحميل السكربت بـ importlib يترك `__pycache__` داخل `scripts/`: أثرٌ من
 * الاختبار لا من الإنتاج (العامل ينفّذ الملفّ مباشرةً فلا بايت كود)، فلا يُخلَّف في
 * المستودع. وتجاهلُ قنوات الإخراج مقصود: القراءة تُتمُّ من ملفٍّ مؤقت.
 */
function runPython(code: string, args: string[]): void {
  execFileSync(PDF_PYTHON, ["-B", "-c", code, ...args], { stdio: "ignore", maxBuffer: 64e6 });
}

async function sourcePage(dir: string, pageNo = 0): Promise<PageImage> {
  const png = `page-${pageNo}.png`;
  const report = path.join(dir, `page-${pageNo}.json`);
  runPython(RENDER_PAGE, [SOURCE_PDF, String(pageNo), "150", path.join(dir, png), report]);
  const m = JSON.parse(await readFile(report, "utf8")) as {
    width: number;
    height: number;
    pageRect: [number, number, number, number];
  };
  return {
    png,
    width: m.width,
    height: m.height,
    rect: m.pageRect,
    scale: m.pageRect[2] / m.width,
  };
}

/** تنفيذُ السكربت بنفس عقد argv الذي يستدعيه العامل: صورةٌ + JSON + مخرجٌ + دليل الخطّ. */
async function runScript(
  dir: string,
  page: PageImage,
  lines: OcrLine[],
  name: string,
  text?: string,
) {
  const jsonPath = path.join(dir, `${name}.json`);
  const outPath = path.join(dir, `${name}.pdf`);
  await writeFile(
    jsonPath,
    JSON.stringify(text === undefined ? { lines } : { lines, text }),
    "utf8",
  );
  execFileSync(PDF_PYTHON, [SCRIPT, path.join(dir, page.png), jsonPath, outPath, FONT_DIR], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 16e6,
  });
  return outPath;
}

/** stderr حين يفشل السكربت، و"" حين ينجح: بوابةُ الفشل الصريح تُقاس على الرسالة نفسها. */
async function runScriptStderr(
  dir: string,
  page: PageImage,
  lines: OcrLine[],
  name: string,
  text?: string,
) {
  try {
    await runScript(dir, page, lines, name, text);
    return "";
  } catch (err) {
    return (err as { stderr?: string }).stderr ?? "";
  }
}

async function inspect(dir: string, pdfPath: string, tag: string): Promise<Inspected> {
  const report = path.join(dir, `inspect-${tag}.json`);
  runPython(INSPECT, [pdfPath, report]);
  return JSON.parse(await readFile(report, "utf8")) as Inspected;
}

/** أقربُ سطرٍ مستخرَج إلى مركزِ سطرٍ متوقَّع رأسيًا: الازدواجُ بالتحديد لا بترتيب الكتل. */
function lineAtCenter(lines: ExtractedLine[], bbox: number[], scale: number) {
  const center = ((bbox[1] + bbox[3]) / 2) * scale;
  const nearest = lines.reduce((best, line) => {
    const d = Math.abs((line.bbox[1] + line.bbox[3]) / 2 - center);
    return d < Math.abs((best.bbox[1] + best.bbox[3]) / 2 - center) ? line : best;
  }, lines[0]!);
  return { line: nearest, center };
}

/**
 * تجريدُ الفراغات والحركات: البوابةُ على الحروفِ وترتيبها. أوّلَ حركةٍ في السطر وآخرها قد
 * ينزاح موضعُهما عند الاستخراج (قيسٌ في pdf.ts وعلى هذا السكربت معًا)، فلا تُقاس عليهما.
 */
function skeleton(text: string): string {
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/\s+/g, "");
}

const describeReal = HAS_PDF_ENGINE ? describe : describe.skip;

describeReal("تكافؤ ترتيب الشدّة: السكربت وorderShaddaFirst مصدرٌ واحد للدلالة", () => {
  const corpus = [
    VOWELED,
    PLAIN,
    MIXED,
    `\u0627\u0644\u0631${FATHA}${SHADDA}\u062D\u0645\u0646`,
    `\u0627\u0644\u0631${SHADDA}${FATHA}\u062D\u0645\u0646`,
  ];

  // الدالةُ تُستدعى من ملفّ السكربت نفسه بـ importlib — لا من نسخةٍ منها في الاختبار.
  it("نفسُ ما ترجعه الدالةُ في TypeScript يرجعه السكربت على نفس المدخلات", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "shadda-parity-"));
    try {
      const inPath = path.join(dir, "in.json");
      const outPath = path.join(dir, "out.json");
      await writeFile(inPath, JSON.stringify(corpus), "utf8");
      runPython(PY_SHADDA, [SCRIPT, inPath, outPath]);
      const py = JSON.parse(await readFile(outPath, "utf8")) as string[];
      expect(py).toEqual(corpus.map((text) => orderShaddaFirst(text)));
      // عنقودُ حركة-ثم-شدّة يصبح شدّة-ثم-حركة، والمدخلُ المرتَّب أصلًا لا يتغيّر.
      expect(py[3]).toBe(`\u0627\u0644\u0631${SHADDA}${FATHA}\u062D\u0645\u0646`);
      expect(py[4]).toBe(`\u0627\u0644\u0631${SHADDA}${FATHA}\u062D\u0645\u0646`);
      // لا حذفٌ ولا إضافةٌ ولا تطبيعُ همزات: عددُ المحارفِ وألوانُها باقية كما هي.
      expect([...py[0]].sort()).toEqual([...corpus[0]].sort());
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 60_000);

  it("لا يمسّ التحويلُ نصًّا بلا عناقيدِ شدّة: اللاتينيُّ والمجرّدُ كما كُتبا", () => {
    expect(orderShaddaFirst(MIXED)).toBe(MIXED);
    expect(orderShaddaFirst(PLAIN)).toBe(PLAIN);
  });
});

describeReal("نهاية إلى نهاية: صورةٌ ممسوحة ⇒ طبقةٌ منطقيةٌ بموضعها", () => {
  // تصييرٌ واحد لكل المجموعة: المحرّك subprocess، والقياساتُ كلُّها على نفس الملف.
  const built = (async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-pdf-"));
    try {
      const page = await sourcePage(dir);
      const pdf = await runScript(dir, page, LINES, "searchable");
      const report = await inspect(dir, pdf, "main");
      return { dir, page, pdf, report };
    } catch (err) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
  })();

  it.skipIf(!HAS_PDF_ENGINE)(
    "يكتب طبقةً غير فارغة بخطّ Amiri مضمَّنٍ وحيدًا بلا Helvetica",
    async () => {
      const { report } = await built;
      const page = report.pages[0]!;
      expect(page.text.trim().length).toBeGreaterThan(0);
      expect(page.fonts.some((name) => /amiri/i.test(name))).toBe(true);
      expect(page.fonts.some((name) => /helv/i.test(name))).toBe(false);
    },
    180_000,
  );

  it("يرجع الكلمات بترتيبها المنطقي بالمحارف الأساسية: لا أشكالَ عرضية ولا انعكاس", async () => {
    const { report } = await built;
    const text = report.pages[0]!.text;
    // الأشكالُ المعروضة هي عينُ العطب: «الحمد لله رب العالمين» ⇒ «ﻥﻱﻡﻝﺍﻉﻝﺍ ﺏﺭ…» (U+FEE1).
    expect(/[\uFB50-\uFDFF\uFE70-\uFEFF]/u.test(text)).toBe(false);
    const skel = skeleton(text);
    for (const word of `${PLAIN} ${PROSE}`.split(" ")) {
      expect(skel).toContain(skeleton(word));
    }
    // الترتيبُ المنطقي: لو كان العرضُ بصريًا معكوسًا لكانت آخرُ الكلمة أولَ المستخرَج.
    expect(skel.indexOf(skeleton("الحمد"))).toBeLessThan(skel.indexOf(skeleton("العالمين")));
    expect(skel).not.toContain(skeleton("العالمين رب لله الحمد"));
    // القياسُ على السطر المختلط (قيسٌ على ثلاث دقات: ٠٫٤٨ و٠٫٣٢٧ و٠٫٢٤ نقطة/بكسل): كلماتُه
    // تنجو محارفَ وترتيبًا داخل كل كلمة، لكن MuPDF يرجع عناوينَ الاتجاه الأُحادي بالترتيب
    // البصري («Page 12 رقم 34 ABC» ⇒ «ABC 34 رقم Page 12»)، فالبحثُ على مستوى الكلمة لا
    // على مستوى السطرِ المختلط. لا يُصلَح بإخفاءِ الحقيقة: التوثيقُ هنا هو البوابة.
    const mixedLine = report.pages[0]!.lines.find((l) => skeleton(l.text).includes("ABC"));
    expect(mixedLine).toBeDefined();
    for (const token of ["Page", "12", "34", "ABC", "رقم"]) {
      expect(skeleton(mixedLine!.text)).toContain(skeleton(token));
    }
  }, 180_000);

  it("لا يحقن حرفًا لاتينيًا أو سيريليًا داخل الكلام العربي (عناقيدُ الشدّة)", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-shadda-"));
    try {
      const page = await sourcePage(dir);
      const pdf = await runScript(dir, page, ARABIC_ONLY_LINES, "arabic-only");
      const text = (await inspect(dir, pdf, "arabic")).pages[0]!.text;
      // بلا تقديمِ الشدّة: «الرَّحْمَنِ» ⇒ «الرaَّحْمَنِ» بحرفٍ لاتيني في جوف الكلمة.
      expect(/[A-Za-z\u0400-\u04FF\u0E00-\u0E7F]/u.test(text)).toBe(false);
      // البوابةُ على الكلمات الداخلية لا على حافّتَي السطر.
      for (const word of VOWELED.split(" ").slice(0, -1)) {
        expect(skeleton(text)).toContain(skeleton(orderShaddaFirst(word)));
      }
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 180_000);

  it("يهربّ علامات HTML من نصّ السطر ولا يمرّرها وسومًا ولا إلى CSS", async () => {
    const { report } = await built;
    const skel = skeleton(report.pages[0]!.text);
    expect(skel).toContain(skeleton('اقتباس"'));
    expect(skel).toContain(skeleton("<وسم>"));
    expect(skel).toContain(skeleton("& رمز"));
  }, 180_000);

  it("يضع كل سطرٍ عند مقياس الصفحة (٠٫٤٨ نقطة/بكسل) لا عند بكسلاته", async () => {
    const { report, page } = await built;
    expect(page.width).toBe(840);
    expect(Number(page.scale.toFixed(2))).toBe(0.48);
    const lines = report.pages[0]!.lines;
    // سطرٌ واحد لكل سطرِ OCR: لا التفافُ ينقل نصًّا إلى أسفل الصفحة.
    expect(lines).toHaveLength(LINES.length);
    for (const expected of LINES) {
      const { line, center } = lineAtCenter(lines, expected.bbox, page.scale);
      const [bx0, by0, bx1, by1] = line.bbox;
      // الرأسيُّ مركزًا: صندوقُ السطر المستخرَج على منتصفِ صندوق OCR بعد المقياس.
      expect(Math.abs((by0 + by1) / 2 - center)).toBeLessThanOrEqual(3);
      // والرأسيُّ حرفيًا: علْوُ الصندوق هنا ٢٤ نقطة، والمستخرَجُ في حدود ٤٪ منه.
      expect(Math.abs(by0 - expected.bbox[1] * page.scale)).toBeLessThanOrEqual(3);
      // RTL: الحافةُ اليمنى للنصّ عند x1 مقيسةً، فالسطرُ مثبتٌ من طرفه الصحيح لا من أيسره.
      expect(Math.abs(bx1 - expected.bbox[2] * page.scale)).toBeLessThanOrEqual(3);
      expect(bx0).toBeGreaterThanOrEqual(0);
      expect(by1).toBeLessThanOrEqual(page.rect[3] + 3);
      // إثباتُ العلة القديمة: بلا مقياسٍ يستقرّ السطرُ عند بكسلاته (٢٠٠ بدل ٩٦ نقطة هنا).
      if (expected.bbox[1] > 100) expect(Math.abs(by0 - expected.bbox[1])).toBeGreaterThan(40);
    }
  }, 180_000);

  it("لا يترك أي حبرٍ مرئي فوق الأصل: المخرجُ يطابق صورةَ الصفحة بكسلًا", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-invisible-"));
    try {
      const page = await sourcePage(dir);
      const composed = await runScript(dir, page, LINES, "with-layer");
      // المرجعُ السكربتُ نفسُه بلا سطور: صفحةُ الصورة وحدها، فالفارقُ هو الطبقةُ فقط.
      const bare = await runScript(dir, page, [], "image-only");
      const report = path.join(dir, "diff.json");
      runPython(DIFF_PAGE_PIXELS, [bare, composed, "110", report]);
      const diff = JSON.parse(await readFile(report, "utf8")) as {
        same: boolean;
        bytes: number;
        differing: number;
      };
      expect(diff.same).toBe(true);
      expect(diff.differing).toBe(0);
      expect(diff.bytes).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 180_000);

  it("يفشل بصوتٍ عالٍ بدل أن يكتب طبقةً فارغةً بصمت", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-fail-"));
    try {
      const page = await sourcePage(dir);
      // سطرٌ بعُلُوٍّ صفر: لا موضعَ له فلا طبقة — المطلوبُ خروجٌ غيرُ صفر برسالةٍ عربية.
      expect(
        await runScriptStderr(dir, page, [{ text: PLAIN, bbox: [10, 10, 10, 10] }], "degen"),
      ).toContain("طبقة النص");
      // bbox ليس أرقامًا: خطأٌ في المُدخَل لا حالةٌ تُمرَّر بصمت.
      expect(
        await runScriptStderr(dir, page, [{ text: PLAIN, bbox: ["0", "0", 9, 9] }], "str"),
      ).toContain("bbox");
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 180_000);

  it("دمجُ الورقات بـ pdf-lib copyPages يُبقي الطبقةَ ومواضعَها", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-merge-"));
    try {
      const first = await sourcePage(dir, 0);
      const second = await sourcePage(dir, 1);
      // نفسُ ما يعمل به العامل: تنفيذٌ للسكربت لكل صفحة ثم دمجٌ بـ copyPages.
      const single = [
        await runScript(dir, first, LINES, "p1"),
        await runScript(dir, second, LINES, "p2"),
      ];
      const merged = await pdfLib.PDFDocument.create();
      for (const file of single) {
        const doc = await pdfLib.PDFDocument.load(new Uint8Array(await readFile(file)));
        for (const p of await merged.copyPages(doc, doc.getPageIndices())) merged.addPage(p);
      }
      const mergedPath = path.join(dir, "merged.pdf");
      await writeFile(mergedPath, await merged.save());

      const before = await inspect(dir, single[0]!, "before");
      const after = await inspect(dir, mergedPath, "after");
      expect(after.pages).toHaveLength(2);
      // ToUnicode تنجو من نسخ pdf-lib: نفسُ المستخرَج في الورقة الأولى، وغيرُ فارغة الثانية.
      expect(after.pages[0]!.text).toBe(before.pages[0]!.text);
      expect(after.pages[1]!.text.trim().length).toBeGreaterThan(0);
      expect(after.pages[1]!.fonts.some((name) => /amiri/i.test(name))).toBe(true);
      expect(after.pages[1]!.fonts.some((name) => /helv/i.test(name))).toBe(false);
      const lines = after.pages[1]!.lines;
      for (const expected of LINES.slice(0, 3)) {
        const { line, center } = lineAtCenter(lines, expected.bbox, second.scale);
        expect(Math.abs((line.bbox[1] + line.bbox[3]) / 2 - center)).toBeLessThanOrEqual(3);
        expect(Math.abs(line.bbox[2] - expected.bbox[2] * second.scale)).toBeLessThanOrEqual(3);
      }
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 300_000);
});

// ─────────────── وضع الانسياب: مزوّدٌ بلا هندسة لا يُسلَّم ملفٌ أعمى بحثًا ───────────────

describeReal("وضع الانسياب: لا سطورَ بمواضع ⇒ طبقةٌ منطقيةٌ تقريبية لا تسليمٌ أصمّ", () => {
  const FLOW_TEXT = `${PLAIN}\n${VOWELED}\n${PROSE}\n${ESCAPED}`;

  it("يبني طبقةً من نصّ الصفحة ويصرّح على stderr بأنها تقريبية الموضع", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-flow-"));
    try {
      const page = await sourcePage(dir);
      const jsonPath = path.join(dir, "flow.json");
      const outPath = path.join(dir, "flow.pdf");
      await writeFile(jsonPath, JSON.stringify({ lines: [], text: FLOW_TEXT }), "utf8");
      const { spawnSync } = await import("node:child_process");
      const res = spawnSync(
        PDF_PYTHON,
        [SCRIPT, path.join(dir, page.png), jsonPath, outPath, FONT_DIR],
        { encoding: "utf8", maxBuffer: 16e6 },
      );
      expect(res.status).toBe(0);
      // التصريحُ مطلوب: لا تُسلَّم طبقةٌ تقريبية كأنها مطابقةٌ للسطور الأصلية.
      expect(res.stderr).toContain("تقريبي");
      expect(res.stderr).toContain("انسيابية");
      const report = await inspect(dir, outPath, "flow");
      const text = report.pages[0]!.text;
      expect(text.trim().length).toBeGreaterThan(0);
      expect(/[\uFB50-\uFDFF\uFE70-\uFEFF]/u.test(text)).toBe(false);
      expect(/[A-Za-z\u0400-\u04FF]/u.test(text)).toBe(false);
      const skel = skeleton(text);
      for (const word of `${PLAIN} ${PROSE}`.split(" ")) {
        expect(skel).toContain(skeleton(word));
      }
      // الترتيبُ المنطقي باقٍ حتى في الكتلة الانسيابية: أولُ السطر قبل آخره.
      expect(skel.indexOf(skeleton("الحمد"))).toBeLessThan(skel.indexOf(skeleton("العالمين")));
      expect(skel).toContain(skeleton("<وسم>"));
      // الموضعُ تقريبي بالتعريف: لا يُطلب مطابقةُ سطر OCR، لكن يجب أن يبقى داخل الصفحة.
      for (const line of report.pages[0]!.lines) {
        expect(line.bbox[1]).toBeGreaterThanOrEqual(-1);
        expect(line.bbox[3]).toBeLessThanOrEqual(report.pages[0]!.rect[3] + 4);
      }
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 180_000);

  it("سطورٌ كلها فاسدةٌ مع نصّ صفحة ⇒ انسيابٌ بحثيٌّ بدل الفشل الصامت أو التسليم الأعمى", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-flow-degenerate-"));
    try {
      const page = await sourcePage(dir);
      const stderr = await runScriptStderr(
        dir,
        page,
        [{ text: PLAIN, bbox: [10, 10, 10, 10] }],
        "degen-flow",
        FLOW_TEXT,
      );
      expect(stderr).toBe(""); // خرجٌ ناجح: الانسيابُ بديلٌ مشروع لا خطأ
      const report = await inspect(dir, path.join(dir, "degen-flow.pdf"), "degen-flow");
      expect(report.pages[0]!.text.trim().length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 180_000);

  it("بلا سطورٍ وبلا نصّ: صفحةٌ بيضاء تُسلَّم صورةً فقط بصمتٍ لا يُدّعى فيه بحث", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-flow-empty-"));
    try {
      const page = await sourcePage(dir);
      const stderr = await runScriptStderr(dir, page, [], "no-text", "   ");
      expect(stderr).toBe("");
      const report = await inspect(dir, path.join(dir, "no-text.pdf"), "no-text");
      expect(report.pages[0]!.text.trim()).toBe("");
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 180_000);

  it("الطبقةُ الانسيابيةُ لا تترك حبرًا مرئيًا: المخرجُ يطابق الصورةَ بكسلًا", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "searchable-flow-invisible-"));
    try {
      const page = await sourcePage(dir);
      const composed = await runScript(dir, page, [], "flow-layer", FLOW_TEXT);
      const bare = await runScript(dir, page, [], "flow-bare");
      const report = path.join(dir, "flow-diff.json");
      runPython(DIFF_PAGE_PIXELS, [bare, composed, "110", report]);
      const diff = JSON.parse(await readFile(report, "utf8")) as {
        same: boolean;
        differing: number;
      };
      expect(diff.same).toBe(true);
      expect(diff.differing).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }, 180_000);
});
