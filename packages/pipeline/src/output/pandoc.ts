import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import type { CleanedText } from "../types";

/**
 * Zip provenance (specs/012-amazing-merge US3 / T030, FR-003): the
 * pdf-to-word converter's markdown chain (`src/utils/documentConverter.ts`)
 * and DOCX builder (`src/utils/docxExporter.ts`, `docx` library + per-run
 * `rightToLeft` / `ar-SA` / cs-font) are integrated here as DATA — meaning
 * the behaviors they encode, not their code. Mapping:
 *  - documentConverter's chunk → Markdown → cleanup chain is the Markdown
 *    handed to `pandocConvert` (pandoc stays the engine; Express + `server.ts`
 *    are deliberately not ported).
 *  - docxExporter's Arabic runs information (bidi flags, complex-script
 *    fonts) is applied post-conversion by `applyRtlOoxml` (docx-rtl.ts):
 *    `w:bidi` per Arabic paragraph, `w:bidiVisual` for tables, `w:cs` /
 *    `w:lang w:bidi` per run — the same output contract, no `docx` runtime.
 *  - Quranic verification is applied upstream by the pipeline's
 *    `AZHAR_CORRECTION_RULES` (quranic.ts); توحيد القواعد في
 *    `docs/correction-rule-divergence.md` (درجة قصوى واحدة).
 */
import { embedAmiriFonts } from "./embed-fonts";
import { applyRtlOoxml } from "./docx-rtl";
import { applyRtlEpub } from "./epub-rtl";
import type { PageGeometry } from "./page-geometry";

const execFileAsync = promisify(execFile);

type DocxInput = CleanedText | { markdown?: string; cleaned?: string };

/**
 * Optional Pandoc rendering options. All fields are optional and additive:
 * omitting them reproduces the historical default behaviour, so existing callers
 * (and snapshots) are unaffected.
 */
export interface PandocOptions {
  /** Path to a Pandoc template (--template). Use an Arabic/RTL template to set
   *  bidi paragraph direction and complex-script fonts instead of manual docx. */
  template?: string;
  /** Path to a reference docx (--reference-doc) carrying RTL styles/fonts. */
  referenceDoc?: string;
  /** Whether to emit RTL metadata (`dir=rtl`). Defaults to true for docx. */
  rtl?: boolean;
  /** لغة المستند (ar/en) — تُمرَّر -M lang= في وضع OMML. */
  lang?: "ar" | "en";
  /**
   * وضع OMML (من build_book.py --math pandoc): معادلات Word أصلية عبر
   * `-f markdown-yaml_metadata_block --reference-doc <reference_rtl.docx>`.
   * "off" (افتراضي) = السلوك التاريخي (تسطيح الرياضيات نصيًا).
   */
  math?: "off" | "pandoc";
  /** فهرس تلقائي --toc (وضع pandoc فقط). */
  toc?: boolean;
  /** تضمين Amiri داخل DOCX بعد البناء (embed_fonts.py). افتراضي false. */
  embedAmiri?: boolean;
  /** مجلد خطوط Amiri بديل (AMIRI_FONT_DIR أو الافتراضيات النظامية). */
  amiriFontDir?: string;
  /**
   * طبقة تصحيح OOXML العربية (docx-rtl.ts): `w:bidi` لكل فقرة عربية وإزالته عن
   * اللاتينية، `w:bidiVisual` للجداول، `w:bidi` للمقاطع والترقيم، و`w:cs`/`w:szCs`/
   * `w:lang w:bidi` للـ runs. افتراضي true للـ docx؛ يُتخطّى تلقائيًا في وضع OMML
   * لأنّ `reference_rtl.docx` يتولّى الاتجاه هناك (لا regressing للمعادلات).
   */
  rtlOoxml?: boolean;
  /** خط العربية المعقّد البديل في `w:cs` (افتراضيًا ARABIC_COMPLEX_FONT = Amiri). */
  csFont?: string;
  /**
   * طبقة اتجاه الـ EPUB (epub-rtl.ts): `dir="rtl"` على جذر كل XHTML و
   * `page-progression-direction="rtl"` على الـ spine. افتراضي true للـ epub لأن
   * pandoc لا يكتب شيئًا منهما؛ يُتخطّى فقط للمقارنة والتشخيص.
   */
  rtlEpub?: boolean;
  /**
   * هندسةُ صفحات الأصل المقيسةُ عند الاستقبال. تُكتب `w:pgSz`/`w:pgMar` في المقاطع
   * فتخرج الورقةُ وهوامشُها من الأصل لا من `reference_rtl.docx` — المرجعُ واحدٌ ثابت
   * لكل المستندات، فكان تصديرُ صفحة مخطوطٍ ضيّقة يخرج A4 بهامش ٢ سم.
   */
  geometry?: PageGeometry;
}

/**
 * RTL reference doc for pandoc, vendored into `packages/pipeline/assets/`
 * (MIT, see `LICENSE.reference_rtl.docx` beside it). It used to be resolved from a
 * developer's home directory, which silently disabled Arabic DOCX rendering in
 * Docker, CI, and every real deployment — so no personal path may ever return here.
 * Both layouts are probed because the package runs from `src/` in the workspace and
 * from `dist/` in built images.
 *
 * `import.meta.url` rather than `import.meta.dirname`: the latter is undefined once
 * Next bundles this package and crashed module evaluation for every importer.
 */
export function findReferenceRtlDocx(): string | null {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.REFERENCE_RTL_DOCX,
    path.resolve(moduleDir, "../../assets/reference_rtl.docx"),
    path.resolve(moduleDir, "../assets/reference_rtl.docx"),
  ].filter((c): c is string => Boolean(c));
  return candidates.find((c) => existsSync(c)) ?? null;
}

async function pandocConvert(
  markdownText: string,
  format: string,
  options?: PandocOptions,
): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(tmpdir(), `pandoc-${format}-`));
  try {
    const mdPath = path.join(tempDir, "input.md");
    const outPath = path.join(tempDir, `output.${format}`);

    await writeFile(mdPath, markdownText, "utf8");

    // Build argv. RTL metadata is on by default for docx so Arabic documents
    // keep their direction; callers may disable it explicitly.
    const rtl = options?.rtl ?? format === "docx";
    // EPUB لا يعرف `-M dir=rtl` إطلاقًا (قياسًا: لا `dir` في أي ملف من الحزمة)،
    // فالطبقة تُبنى بعد التحويل. لكن `-M lang=ar` يعمل ويصل إلى `<html lang>`
    // و`<dc:language>` — وبلاها يخرجان `en-US` على نصّ عربي بالكامل.
    const epubRtl = format === "epub" && (options?.rtl ?? true);
    const mathPandoc = format === "docx" && options?.math === "pandoc";
    const args: string[] = [mdPath, "-o", outPath];
    if (mathPandoc) {
      // وضع OMML — نفس أمر build_book.py: معادلات Word أصلية، لا تسطيح.
      const referenceDoc = options?.referenceDoc ?? findReferenceRtlDocx() ?? undefined;
      if (!referenceDoc) {
        throw new Error(
          "EXPORT_FORMAT_FAILED: مرجع pandoc غير موجود (reference_rtl.docx) — مرّر referenceDoc أو REFERENCE_RTL_DOCX",
        );
      }
      const lang = options?.lang ?? (rtl ? "ar" : "en");
      args.push("-f", "markdown-yaml_metadata_block", "--reference-doc", referenceDoc);
      args.push("-M", `dir=${rtl ? "rtl" : "ltr"}`, "-M", `lang=${lang}`);
      if (options?.toc) args.push("--toc");
    } else {
      if (rtl) args.push("-M", "dir=rtl");
      if (epubRtl) args.push("-M", `lang=${options?.lang ?? "ar"}`);
      // بلا `-M title`: قياس pandoc 3.1.3 على نفس المستند أدخل فقرة `Title` نصّها
      // "Document" في أول word/document.xml (٢٨٤٦ بايت مقابل ٢٧٠٩ بدونها) — عنوان
      // لاتيني وهمي في صدر كل مُنتَج، أي فرق عن الأصل بلا سبب.
      // bidi/fonts عبر template/reference doc الممرَّر من المستدعي (لا post-processing يدوي).
      if (options?.template) args.push("--template", options.template);
      if (options?.referenceDoc) args.push("--reference-doc", options.referenceDoc);
    }

    await execFileAsync("pandoc", args, { timeout: 30000 }).catch((err: unknown) => {
      const code = (err as { code?: string }).code;
      const msg = err instanceof Error ? err.message : String(err);
      // A missing pandoc binary is a permanent, non-retryable environment fault.
      // Throw a marker the failure classifier maps to EXPORT_GENERATION_FAILED
      // so BullMQ does NOT waste 3 retries on a broken install.
      if (code === "ENOENT" || /spawn .* ENOENT/.test(msg)) {
        throw new Error(`EXPORT_PANDOC_MISSING: pandoc binary not found (${msg})`);
      }
      throw new Error(`EXPORT_FORMAT_FAILED: ${msg}`);
    });

    let out: Buffer = await readFile(outPath);
    if (format === "epub" && epubRtl && options?.rtlEpub !== false) {
      // `dir` على جذر كل XHTML + `page-progression-direction="rtl"` على الـ spine:
      // بلاهما الكتاب العربي يُقرأ ويُقلَّب من اليسار، ولا شيء في pandoc يكتبهما.
      out = applyRtlEpub(out, { rtl: true });
    }
    if (
      format === "docx" &&
      !mathPandoc &&
      options?.rtlOoxml !== false &&
      (rtl || options?.geometry)
    ) {
      // bidi/fonts على مستوى OOXML (docx-rtl.ts): `-M dir=rtl` وحدها أعمى — تُbidis
      // الفقرات اللاتينية، وتترك الجداول بلا bidiVisual والمقاطع بلا bidi، ولا تضبط
      // فتحة الخط المعقّد (a:cs فارغ في theme1.xml) فتُعرض العربية بخط لاتيني.
      // وضع OMML (mathPandoc) مستثنى: reference_rtl.docx يتولّى الاتجاه هناك — وبه
      // تُترك الورقةُ للمرجع لا يُناقضه قياسٌ نصفُه في المرجع ونصفُه في الأصل.
      out = applyRtlOoxml(out, { rtl, csFont: options?.csFont, geometry: options?.geometry });
    }
    if (format === "docx" && options?.embedAmiri) {
      // تضمين Amiri (embed_fonts.py) — فشل التضمين لا يُسقط البناء هنا؛
      // المستدعي (book-factory) يقرّر. نرمي خطأ واضحًا ليُسجَّل.
      try {
        out = embedAmiriFonts(out, {
          fontDir: options.amiriFontDir ?? process.env.AMIRI_FONT_DIR,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`EXPORT_FORMAT_FAILED: تعذّر تضمين خط Amiri: ${msg}`);
      }
    }
    return out;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function generateDocx(input: DocxInput, options?: PandocOptions): Promise<Buffer> {
  const markdownText = input.markdown || input.cleaned || "";
  return pandocConvert(markdownText, "docx", options);
}

export async function generateEpub(input: DocxInput, options?: PandocOptions): Promise<Buffer> {
  const markdownText = input.markdown || input.cleaned || "";
  return pandocConvert(markdownText, "epub", options);
}
