import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { logger } from "@ibn-al-azhar-docs/shared";
import { getWeasyprintPython } from "./pdf";

const execFileAsync = promisify(execFile);

/**
 * page-geometry.ts — هندسةُ صفحات الأصل تُقرأ مرةً واحدة عند الاستقبال وتُستهلَك عند التصدير.
 *
 * السبب قاعدةُ «المُنتَج نسخةٌ طبق الأصل من الأصل في كل شيء»: المُصدِّرات كانت تُثبّت
 * الورقةَ ثابتةً — `@page { size: A4; margin: 2cm }` حرفيًا في pdf.ts، والـ DOCX يرث مقاسه
 * من مرجعٍ واحد ثابت (`reference_rtl.docx`). فمخطوطٌ بصفحة ١٢×١٩ سم كان يخرج A4 بهامش ٢ سم،
 * أي ملفًا لا يُطابق الأصلَ في هندسته ولو طابقه في نصّه.
 *
 * الوحدةُ النقاطُ (pt) لأنها وحدةُ القياس في `page.rect` و`get_text("blocks")` جميعًا،
 * وهي ما يخرج من `page-geometry.py`؛ والتحويل إلى twips للـ DOCX (`ptToTwips`) وحدُه
 * الزائد، لأن `w:pgSz`/`w:pgMar` تُقيَّم بالتوائب لا بالنقاط.
 *
 * لا هندسةَ مُختلَقة: كلُّ دالةٍ هنا تُرجع null عند غياب القياس، والمستهلكون يرتقون إلى
 * A4/٢سم نفسها التي كانوا عليها — فالترقّي لا يُخرِج مُنتَجًا أسوأ، ولا يُخرِج رقمًا
 * منسوبًا إلى أصلٍ لم يُقَس.
 */

/** مربعُ النصّ المقيس على الصفحة، بالنقاط ومنشأً من أعلى اليسار كما في PDF. */
export interface PageBoxPt {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** قياسُ صفحةٍ واحدة من الأصل: مقاسُها كما يراه القارئ ومربعُ نصّها إن كان لها نصّ. */
export interface PageGeometrySample {
  widthPt: number;
  heightPt: number;
  /** null صريحةٌ عند انتفاء النصّ المضمَّن (صفحةٌ ممسوحة) — لا يُربَع هوامش من فراغ. */
  text?: PageBoxPt | null;
}

/** الهندسةُ الوحيدة الممثِّلة للكتاب كلّه: مقاسٌ وهوامشُ بأربع جهات، أو لا هوامش. */
export interface PageGeometry {
  widthPt: number;
  heightPt: number;
  marginsPt: { top: number; right: number; bottom: number; left: number } | null;
}

/** ورقةُ الاحتياط نفسها التي كانت مكتوبةً حرفيًا في pdf.ts: لا رقمٌ يُشتَقّ منها. */
export const DEFAULT_PAGE_MARGIN_PT = 56.69; // ٢ سم

/**
 * أقصى نسبةٍ من بُعد الصفحة يُعقل أن تكون هامشًا. ما جاوزها ليس هامشًا بل أثرُ قياس:
 * كتلةٌ تملأ الورقة (خلفيةٌ مرقَّمة، أو صفحةُ عنوانٍ مطبوعةً على الحافّة) أو نصٌّ
 * خرجَ من الصفحة. والوسيطُ على أربع جِهاتٍ لا يُقال «هامشٌ ٦٠٪ من العرض» بثقة.
 */
const MAX_MARGIN_RATIO = 0.4;

/** أقلُّ عددٍ من الصفحات ذات النصّ يجعل الهامشَ قياسًا لا مصادفة: واحدةٌ coincidence. */
const MIN_TEXT_BOXED_PAGES = 2;

/** سقفُ العيّنة المُقاسة لكل مستند: الوسيطُ لا يحتاج الكتابَ كلَّه، والقراءةُ ليست مجانًا. */
export const GEOMETRY_MAX_PAGES = 200;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finitePositive(value: unknown): number | null {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  // العددُ زوجي: وسطُ القيمتين لا أقصرهما — الكتبُ تُخالطها ورقةٌ معترضة ولا تُحذف.
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/**
 * ملخّصُ عيّنةِ صفحات إلى هندسةٍ واحدة. الوسيطُ لكلٍّ من المقاس والحواشي الأربعة، لأن
 * الكتابَ الواحد تُخالطه ورقةُ إقحام (tipped-in) بحجمٍ مختلف، والمتوسّطُ كان يجرّه
 * المتوسطُ الحسابي إلى مقاسٍ لا تشبه أيَّ صفحةٍ فيه.
 *
 * هوامشُ null لها وجهان: إمّا صفحاتٌ قليلةٌ ذاتُ نصّ (اثنان هو الحدّ — واحدةٌ مصادفةٌ
 * لا مارجن)، أو حاشيةٌ خرجت عن المعقول. والأخيرة تُرجع null للكلّ لا null للحافة:
 * نصفُ هامشٍ مقاسٌ ونصفُه مخترَع ملفٌّ مضلِّل، والترقيةَ إلى ٢ سم معلَنةٌ أصدق.
 */
export function summarizePageGeometry(samples: PageGeometrySample[]): PageGeometry | null {
  const valid = samples.filter(
    (sample) =>
      Number.isFinite(sample.widthPt) &&
      Number.isFinite(sample.heightPt) &&
      sample.widthPt > 0 &&
      sample.heightPt > 0,
  );
  if (valid.length === 0) return null;

  const widthPt = median(valid.map((sample) => sample.widthPt));
  const heightPt = median(valid.map((sample) => sample.heightPt));
  if (widthPt === null || heightPt === null) return null;

  const geometry: PageGeometry = {
    widthPt: round2(widthPt),
    heightPt: round2(heightPt),
    marginsPt: null,
  };

  const boxed = valid.filter((sample): sample is PageGeometrySample & { text: PageBoxPt } =>
    Boolean(sample.text),
  );
  if (boxed.length < MIN_TEXT_BOXED_PAGES) return geometry;

  // كلُّ هوامشٍ تُنسب إلى مقاس صفحتِها هي: ورقةُ إقحامٍ أصغر لا يُحسب هامشُها على
  // وسطيِّ الكتاب، وإلا صار الفرقُ في المقاس فرقًا في الهامش.
  const left = median(boxed.map((sample) => sample.text.x0));
  const top = median(boxed.map((sample) => sample.text.y0));
  const right = median(boxed.map((sample) => sample.widthPt - sample.text.x1));
  const bottom = median(boxed.map((sample) => sample.heightPt - sample.text.y1));

  if (left === null || top === null || right === null || bottom === null) return geometry;

  const sane =
    left > 0 &&
    right > 0 &&
    left <= MAX_MARGIN_RATIO * widthPt &&
    right <= MAX_MARGIN_RATIO * widthPt &&
    top > 0 &&
    bottom > 0 &&
    top <= MAX_MARGIN_RATIO * heightPt &&
    bottom <= MAX_MARGIN_RATIO * heightPt;
  if (!sane) return geometry;

  // لا توازنَ مفروض: صفحاتُ الكتاب recto/verso متماثلةٌ غالبًا، لكن التماثلَ صفةُ الأصل
  // لا قاعدةُ نكتبها — الحافةُ المقاسة تُخرج كما قيسَت.
  geometry.marginsPt = {
    top: round2(top),
    right: round2(right),
    bottom: round2(bottom),
    left: round2(left),
  };
  return geometry;
}

/**
 * جسمُ إعلان `@page` من الهندسة. تُترك الفاصلةُ المنقوطة الأخيرة لأن المستدعي يكتب
 * `@page { … }` مباشرةً، فلا تُصنع مسافةٌ زائدةٌ تُغيّر البايتات بلا سبب.
 */
export function geometryToPageCss(geometry: PageGeometry): string {
  const size = `size: ${round2(geometry.widthPt)}pt ${round2(geometry.heightPt)}pt`;
  if (!geometry.marginsPt) {
    // المقاسُ مقيسٌ والهوامشُ غيرُ مقيسة: لا يُختلق هامشٌ منسوبٌ للأصل، فتبقى ٢ سم.
    return `${size}; margin: ${DEFAULT_PAGE_MARGIN_PT}pt;`;
  }
  const { top, right, bottom, left } = geometry.marginsPt;
  return `${size}; margin: ${round2(top)}pt ${round2(right)}pt ${round2(bottom)}pt ${round2(left)}pt;`;
}

/** نقطةٌ ⇒ توابة (twip): وحدةُ `w:pgSz`/`w:pgMar` في OOXML هي ١/٢٠ من النقطة. */
export function ptToTwips(pt: number): number {
  return Math.round(pt * 20);
}

/**
 * عنصرا `w:pgSz` و`w:pgMar` من الهندسة — بالتوائب كما تطلبهما OOXML، ومكتفيين ذاتيًا
 * كما يكتبهما Word. البناءُ هنا لا في docx-rtl لأن جدولَ التوائب ومقياسَ الاحتياط
 * ملكُ وحدةِ الهندسة وحدها، فيبقى DOCX وPDF يشتقيان الورقةَ من مصدرٍ واحد.
 *
 * لا `w:header` ولا `w:footer` ولا `w:gutter`: الأصلُ الممسوح لا يحمل رأسًا ولا تذييلًا
 * ولا مجرّدًا، فاختراعُ رقمٍ لها هو ما ترفضه القاعدة؛ والعنصرُ الموجود في المرجع تُترك
 * سماتُه الزائدةُ كما هي (انظر دمجَ السمات في docx-rtl).
 */
export function geometryToSectPrPageXml(geometry: PageGeometry): {
  pgSz: string;
  pgMar: string;
} {
  const width = ptToTwips(geometry.widthPt);
  const height = ptToTwips(geometry.heightPt);
  const orient = geometry.widthPt > geometry.heightPt ? "landscape" : "portrait";
  const margins = geometry.marginsPt;
  const top = ptToTwips(margins?.top ?? DEFAULT_PAGE_MARGIN_PT);
  const right = ptToTwips(margins?.right ?? DEFAULT_PAGE_MARGIN_PT);
  const bottom = ptToTwips(margins?.bottom ?? DEFAULT_PAGE_MARGIN_PT);
  const left = ptToTwips(margins?.left ?? DEFAULT_PAGE_MARGIN_PT);
  return {
    pgSz: `<w:pgSz w:w="${width}" w:h="${height}" w:orient="${orient}"/>`,
    pgMar:
      `<w:pgMar w:top="${top}" w:right="${right}" ` + `w:bottom="${bottom}" w:left="${left}"/>`,
  };
}

/**
 * تحليلُ ما يطبعه `page-geometry.py`: سجلاتٌ تملك مقاسًا صالحًا فقط. السجلُّ بلا
 * مقاسٍ موجب لا يُورَّث كعيّنة — لا وسيطَ على أصفار.
 */
export function parsePageGeometrySamples(raw: unknown): PageGeometrySample[] {
  if (!isRecord(raw) || !Array.isArray(raw.pages)) return [];
  const samples: PageGeometrySample[] = [];
  for (const item of raw.pages) {
    if (!isRecord(item)) continue;
    const widthPt = finitePositive(item.widthPt);
    const heightPt = finitePositive(item.heightPt);
    if (widthPt === null || heightPt === null) continue;
    samples.push({ widthPt, heightPt, text: item.text === null ? null : parseBox(item.text) });
  }
  return samples;
}

function parseBox(value: unknown): PageBoxPt | null {
  if (!isRecord(value)) return null;
  const x0 = finiteNumber(value.x0);
  const y0 = finiteNumber(value.y0);
  const x1 = finiteNumber(value.x1);
  const y1 = finiteNumber(value.y1);
  if (x0 === null || y0 === null || x1 === null || y1 === null) return null;
  return { x0, y0, x1, y1 };
}

export function pageGeometryScriptPath(): string {
  // src/output ⇒ ../../scripts، وdist/output ⇒ ../../scripts أيضًا: نفس سبب pandoc.ts
  // في بيع الأصل داخل الحزمة بدل المسار الشخصي.
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "../../scripts/page-geometry.py");
}

/**
 * يطبع السكربتُ هندستَه على stdout ويُرجع نصَّه الخام كما هو — geometry.json يُخزَّن
 * بهذا النصّ لا بتمثيلٍ مُعاد تأليفه، فيبقى الملفُّ الأثرَ الوحيد للقياس.
 */
export async function runPageGeometryScript(
  pdfPathOrBuffer: string | Buffer,
  python: string = getWeasyprintPython(),
  maxPages: number = GEOMETRY_MAX_PAGES,
): Promise<string | null> {
  let tempDir: string | null = null;
  let pdfPath: string;
  try {
    if (Buffer.isBuffer(pdfPathOrBuffer)) {
      tempDir = await mkdtemp(path.join(tmpdir(), "page-geometry-"));
      pdfPath = path.join(tempDir, "input.pdf");
      await writeFile(pdfPath, pdfPathOrBuffer);
    } else {
      pdfPath = pdfPathOrBuffer;
    }
  } catch (err) {
    logger.warn({ err }, "page-geometry: تعذّر تجهيز ملف الـ PDF للقياس — تُتخطّى الهندسة");
    if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return null;
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      python,
      [pageGeometryScriptPath(), pdfPath, String(maxPages)],
      {
        timeout: 180_000,
        maxBuffer: 16 * 1024 * 1024,
        encoding: "utf-8",
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );
    // السكربتُ لا يفشل على صفحةٍ واحدة: ما سقط من صفحاتٍ يُعلَن هنا لا يُدفن.
    if (stderr.trim().length > 0) {
      logger.warn({ stderr: stderr.slice(0, 2000) }, "page-geometry: تنبيه من السكربت");
    }
    return stdout.trim() === "" ? null : stdout;
  } catch (err) {
    // القياسُ تحسينٌ لا شرطُ نجاح: لا سبب يجعل مهمةَ تصديرٍ أو تقسيمٍ تفشل لأجله.
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn(
      { python, detail: detail.slice(0, 2000) },
      "page-geometry: فشل القياس — تُتخطّى الهندسة",
    );
    return null;
  } finally {
    if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * هندسةُ ملف PDF في استدعاءٍ واحد؛ null عند أيِّ فشل (لا python، لا سكربت، stdout
 * غيرُ مقروء، لا صفحة) مع تحذيرٍ يُسمّي السبب — لا صمتَ ولا استثناء.
 */
export async function measurePdfPageGeometry(
  pdfPathOrBuffer: string | Buffer,
  python: string = getWeasyprintPython(),
  maxPages: number = GEOMETRY_MAX_PAGES,
): Promise<PageGeometry | null> {
  const payload = await runPageGeometryScript(pdfPathOrBuffer, python, maxPages);
  if (payload === null) return null;
  return summarizeStoredPayload(payload, "measurePdfPageGeometry");
}

/**
 * من نصّ/كائن geometry.json المخزَّن إلى هندسةٍ تُستهلك عند التصدير. null بصمتٍ حسنِ
 * النية غيرِ مقبول: الترمّي إلى A4 قرارٌ يُسجَّل، فالمُنتَجُ الذي لا يُطابق أصلَه سبب
 * يستحقُّ سطرًا في اللوج.
 */
export function pageGeometryFromStoredJson(raw: unknown): PageGeometry | null {
  if (typeof raw === "string") {
    try {
      return summarizeStoredPayload(raw, "geometry.json");
    } catch {
      logger.warn("page-geometry: geometry.json غير قابل للقراءة — يُرتقى إلى A4/٢سم");
      return null;
    }
  }
  const geometry = summarizePageGeometry(parsePageGeometrySamples(raw));
  if (!geometry) logger.warn("page-geometry: geometry.json بلا صفحاتٍ مقاسة — يُرتقى إلى A4/٢سم");
  return geometry;
}

function summarizeStoredPayload(payload: string, label: string): PageGeometry | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    logger.warn({ label }, "page-geometry: stdout لم يُقرأ JSON — تُتخطّى الهندسة");
    return null;
  }
  const geometry = summarizePageGeometry(parsePageGeometrySamples(parsed));
  if (!geometry) logger.warn({ label }, "page-geometry: لا صفحة مقاسة — يُرتقى إلى A4/٢سم");
  return geometry;
}
