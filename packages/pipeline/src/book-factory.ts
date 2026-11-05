/**
 * book-factory.ts — مصنع الكتب: ربط QA gates + verify_quotes + OMML + booklet.
 *
 * خط الأنابيب (كل خطوة قابلة للاختبار منفردة):
 *   1. cleanStructure (S1–S8) — إصلاح بنيوي آمن للنصّ
 *   2. verifyQuotes (Q/H/T) — تدقيق اقتباسات قرآنية/حديثية + سلامة نصّية
 *      (يُتخطّى إن لم تُمرَّر corpus — لا تنزيل شبكة هنا)
 *   3. بناء DOCX:
 *      - profile=booklet: parseBooklet (هرمية س٢:) + explode() ثم Markdown موسوم → pandoc
 *      - profile=book + math=pandoc: OMML عبر pandoc + reference_rtl.docx
 *      - profile=book + math=off: pandoc عادي (السلوك التاريخي)
 *      - embedAmiri اختياري في أي وضع (تضمين Amiri في DOCX)
 *   4. QA gates (ربط): evaluateQaGates على الناتج مع docxDocumentXml
 *      لعدّ OMML الحقيقي، وdocx metrics (فقرات/عربي/وسوم) من document.xml.
 *      الحكم: pass = QA pass && لا أخطاء verify من نوع error.
 *
 * ملاحظة أمانة: بوابة QA لا تُسقط البناء هنا؛ تُرجع الحكم ويقرّر المستدعي
 * (كما في الأصل: fail = !ok && !warn).
 */

import { cleanStructureText } from "./clean-structure";
import {
  QuranIndex,
  HadithIndex,
  QuoteChecker,
  type QuranCorpus,
  type HadithItem,
  type QuoteFinding,
  quoteExitCode,
} from "./verify-quotes";
import { parseBooklet, renderBookletMarkdown, type ParsedBooklet } from "./booklet";
import { evaluateQaGates, type QaReport, type QaGatesOptions } from "./qa-gates";
import { generateDocx } from "./output/pandoc";
import { readZip, readDocxDocumentXml, countOmml } from "./output/embed-fonts";

export interface BookFactoryOptions {
  profile?: "book" | "booklet";
  title?: string;
  header?: string;
  math?: "off" | "pandoc";
  toc?: boolean;
  embedAmiri?: boolean;
  referenceDoc?: string;
  amiriFontDir?: string;
  /** قاعدة بيانات المصحف (quran-simple.json) — بلا corpus تُتخطّى Q/H. */
  quranCorpus?: QuranCorpus;
  hadithItems?: HadithItem[];
  skipVerify?: boolean;
  skipBuild?: boolean; // للاختبارات: QA + verify بلا pandoc
  fileName?: string;
  qaOptions?: QaGatesOptions;
}

export interface BookFactoryInput {
  md: string;
  raw?: string;
  inputPages: number;
  outputPages?: number;
}

export interface BookFactoryResult {
  cleanedMd: string;
  structureStats: Record<string, number>;
  booklet?: ParsedBooklet;
  bookletMd?: string;
  findings: QuoteFinding[];
  quoteExitCode: 0 | 1;
  docx?: Buffer;
  docxDocumentXml?: string;
  ommlCount: number;
  qa: QaReport;
  pass: boolean;
}

function docxMetricsFromXml(xml: string): {
  paragraphs: number;
  chars: number;
  arabic: boolean;
  badMarkup: boolean;
} {
  const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => {
    const texts = [...m[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]!);
    return texts.join("");
  });
  const nonEmpty = paras.filter((p) => p.trim());
  const text = nonEmpty.join("\n");
  return {
    paragraphs: nonEmpty.length,
    chars: text.length,
    arabic: /[\u0600-\u06FF]/.test(text),
    badMarkup: /(```|<br\s*\/?>)/i.test(text),
  };
}

export async function runBookFactory(
  input: BookFactoryInput,
  opts: BookFactoryOptions = {},
): Promise<BookFactoryResult> {
  const profile = opts.profile ?? "book";
  const fileName = opts.fileName ?? "book.md";

  // 1) إصلاح بنيوي
  const { md: cleanedMd, stats: structureStats } = cleanStructureText(input.md);

  // 2) تدقيق الاقتباسات Q/H/T
  const findings: QuoteFinding[] = [];
  let quoteExit: 0 | 1 = 0;
  if (!opts.skipVerify && opts.quranCorpus) {
    const quran = new QuranIndex(opts.quranCorpus);
    const hadith = opts.hadithItems ? new HadithIndex(opts.hadithItems) : null;
    const checker = new QuoteChecker(quran, hadith, false);
    const result = checker.checkText(fileName, cleanedMd);
    findings.push(...result.findings);
    quoteExit = quoteExitCode(result.findings);
  }

  // 3) بناء DOCX
  let booklet: ParsedBooklet | undefined;
  let bookletMd: string | undefined;
  let buildMd = cleanedMd;
  let reflow = false;
  if (profile === "booklet") {
    booklet = parseBooklet(cleanedMd, { title: opts.title, header: opts.header });
    bookletMd = renderBookletMarkdown(booklet);
    buildMd = bookletMd;
    reflow = true; // البوكليت معاد تدفقه: QA يُحكم بالحروف/التغطية
  }

  let docx: Buffer | undefined;
  let docxXml: string | undefined;
  let ommlCount = 0;
  if (!opts.skipBuild) {
    docx = await generateDocx(
      { markdown: buildMd },
      {
        math: opts.math ?? "off",
        toc: opts.toc,
        embedAmiri: opts.embedAmiri,
        referenceDoc: opts.referenceDoc,
        amiriFontDir: opts.amiriFontDir,
      },
    );
    docxXml = readDocxDocumentXml(docx);
    ommlCount = countOmml(docxXml);
    // تحقق: إن طُلب OMML ولم ينتج، فالبناء مرفوض (نفس بوابة equations-count)
    if ((opts.math ?? "off") === "pandoc") {
      const mathSpans = (buildMd.match(/\$[^$]+\$/g) ?? []).length;
      if (mathSpans > 0 && ommlCount === 0) {
        throw new Error(
          `EXPORT_FORMAT_FAILED: وضع OMML لم ينتج معادلات Word (${mathSpans} تعبيرًا، 0 OMML)`,
        );
      }
    }
  }

  // 4) QA gates (ربط) — تُغذّى بناتج البناء الفعلي
  const qa = evaluateQaGates({
    md: cleanedMd,
    raw: input.raw,
    inputPages: input.inputPages,
    outputPages: input.outputPages,
    docx: docxXml ? docxMetricsFromXml(docxXml) : null,
    docxDocumentXml: docxXml,
    options: { ...opts.qaOptions, reflow: opts.qaOptions?.reflow ?? reflow },
  });

  const pass = qa.pass && quoteExit === 0;
  return {
    cleanedMd,
    structureStats,
    booklet,
    bookletMd,
    findings,
    quoteExitCode: quoteExit,
    docx,
    docxDocumentXml: docxXml,
    ommlCount,
    qa,
    pass,
  };
}

/** إعادة تصدير مريحة للاختبارات والطبقات العليا. */
export { readZip };
