import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import type { CleanedText } from "../types";
import { embedAmiriFonts } from "./embed-fonts";

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
}

/** مرجع pandoc RTL من المصدر arabic-pdf-to-book إن وُجد (scripts/reference_rtl.docx). */
export function findReferenceRtlDocx(): string | null {
  const candidates = [
    process.env.REFERENCE_RTL_DOCX,
    "/home/abed/projects/SKILLS/arabic-pdf-to-book/scripts/reference_rtl.docx",
    "/home/abed/Projects/SKILLS/arabic-pdf-to-book/scripts/reference_rtl.docx",
    path.join(homedir(), "projects/SKILLS/arabic-pdf-to-book/scripts/reference_rtl.docx"),
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
      args.push("-M", "title=Document");
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
