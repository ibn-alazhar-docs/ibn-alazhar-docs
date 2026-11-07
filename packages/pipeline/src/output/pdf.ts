import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CleanedText } from "../types";
import { findAmiriFonts } from "./embed-fonts";
import { isRtlText } from "./docx-rtl";
import { geometryToPageCss, type PageGeometry } from "./page-geometry";
import { getPythonCommand } from "../ocr-providers/types";

const execFileAsync = promisify(execFile);

/**
 * pdf.ts — تصدير PDF من الماركداون عبر HTML + WeasyPrint.
 *
 * القياس على المخرَج الفعلي (pymupdf استخراجًا وPNG على ١٥٠dpi عرضًا) كشف أن كل محرّك
 * جرّبناه يُخطئ في مكان مختلف، والخطأ في الاتجاه ينقض «المُنتَج نسخة طبق الأصل»:
 *
 *  1. **pdfmake + Cairo WOFF**: صيغة WOFF تفقد GSUB داخل pdfkit/fontkit ⇒ حروف غير
 *     موصولة ومسافات مزاحة (`عنوان الكتاب` ⇒ `الكتابعنوان`)، وكل لاتيني يخرج مربعات
 *     فارغة ويُستَخرج `NUL`.
 *  2. **pdfmake + Amiri TTF**: التوصيل صحّ، لكن pdfmake/pdfkit لا يطبّقان خوارزمية bidi
 *     إطلاقًا (لا أثر لها في مصدرهما)، فتُعرض الكلمات بترتيبها المنطقي من اليسار:
 *     «كتاب التكملة في الأدب» تُطبع «الأدب في التكملة كتاب»، و«» تنعكس، وعلامات القوائم
 *     وأعمدة الجداول تبقى على اليسار — أي مستند معكوس.
 *  3. **WeasyPrint (Pango/HarfBuzz)**: اتجاه صحيح داخل كل سطر، علامات قوائم في جهة
 *     البداية، أعمدة الجدول بترتيب RTL، والاقتباس مزاح من جهة البداية، والاستخراج يرجع
 *     النص **المنطقي** بحركاته كما كُتب — بشرطين قياسا هنا لا افتراضًا:
 *     - خط واحد فقط (Amiri). فمتى سمح CSS بالرجوع إلى خطوط النظام (serif/monospace) سقطت
 *       الهمزات من ToUnicode («أول» ⇒ «3ول»). لذلك يثبّت كل عنصر — حتى `pre` — Amiri صراحةً.
 *     - الشدّة **قبل** الحركة التي تسبقها في الأصل. قيس على Amiri وNoto Naskh وScheherazade:
 *       ترتيب النص لا يتأثر، لكن علامة ToUnicode للعنقود المركّب (فتحة ثم شدّة) تخرج
 *       محرفة — «الرَّحمن» ⇒ «الرaَّمن» بحرف لاتيني داخل الكلمة في Amiri، و«الله» ⇒ «اЦَِّ»
 *       بالسيريلية في Noto. بنفس النص بترتيب شدّة-أول خرج مطابقًا تمامًا في الخطّين،
 *       وهو ترتيب الإدخال الموصى به للعربية في Unicode، والرسم لا يتغيّر — انظر
 *       `orderShaddaFirst`.
 *     يبقى معلومًا: آخر حركة في الفقرة قد ينزاح موضعها عند الاستخراج، فلا تُقاس البوابة
 *     على نهاية السطر بل على الكلمات الداخلية (الترتيب والحروف لا تتأثر).
 *
 * المبدأ: لا إعادة تدفق للنص، ولا تطبيع، ولا إزالة تشكيل. البنية (عناوين/قوائم متداخلة/
 * جداول/اقتباس/شفرة/فاصل) تُقرأ من الماركداون وتُبنى عناصر HTML حقيقية، والاتجاه يُحسب من
 * مصدر القرار المشترك (`isRtlText` ← `inferAlignment`) بالخاصية `dir` لا بالمحاذاة وحدها،
 * فيبقى صحيحًا في المستندات المختلطة.
 */

// ─────────────────────────── بلوكات الماركداون ───────────────────────────

export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: ListItem[] }
  | { kind: "table"; rows: string[][]; header: boolean }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }
  | { kind: "rule" };

export interface ListItem {
  text: string;
  ordered: boolean;
  children: ListItem[];
}

export interface InlineToken {
  text: string;
  bold?: boolean;
  italics?: boolean;
  decoration?: "underline" | "lineThrough";
  link?: string;
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^(\s*)[-*+]\s+(.*)$/;
const ORDERED_RE = /^(\s*)\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^(\s*)>\s?(.*)$/;
const RULE_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEP_RE = /^\s*\|?[\s:|-]+-[\s:|-]*\|?\s*$/;

function indentLevel(spaces: string): number {
  return Math.floor(spaces.replace(/\t/g, "  ").length / 2);
}

/** شجرة عناصر قائمة من سطور متتالية؛ التعشيش بالمسافة البادئة، وol/ul لكل مستوى. */
function buildList(lines: string[]): ListItem[] {
  const root: ListItem[] = [];
  const stack: Array<{ level: number; item: ListItem }> = [];
  for (const line of lines) {
    const bullet = BULLET_RE.exec(line);
    const ordered = ORDERED_RE.exec(line);
    const match = bullet ?? ordered;
    if (!match) continue;
    const item: ListItem = { text: match[2] ?? "", ordered: Boolean(ordered), children: [] };
    const level = indentLevel(match[1] ?? "");
    while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.item.children.push(item);
    else root.push(item);
    stack.push({ level, item });
  }
  return root;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** قارئ بلوكات الماركداون: عنوان/فقرة/قائمة/جدول/اقتباس/شفرة/فاصل. */
export function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const takeWhile = (pred: (line: string) => boolean): string[] => {
    const out: string[] = [];
    while (i < lines.length && pred(lines[i]!)) out.push(lines[i++]!);
    return out;
  };

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^```/.test(line.trim())) {
      i++;
      const body = takeWhile((l) => !/^```/.test(l.trim()));
      if (/^```/.test(lines[i]?.trim() ?? "")) i++;
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    if (RULE_RE.test(line)) {
      i++;
      blocks.push({ kind: "rule" });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      i++;
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2] ?? "" });
      continue;
    }

    if (TABLE_ROW_RE.test(line)) {
      const rows: string[][] = [];
      let header = false;
      while (i < lines.length && TABLE_ROW_RE.test(lines[i]!)) {
        const row = lines[i]!;
        i++;
        if (TABLE_SEP_RE.test(row)) {
          header = true;
          continue;
        }
        rows.push(splitRow(row));
      }
      if (rows.length) blocks.push({ kind: "table", rows, header });
      continue;
    }

    if (BULLET_RE.test(line) || ORDERED_RE.test(line)) {
      const isItem = (l: string) => BULLET_RE.test(l) || ORDERED_RE.test(l) || /^\s+\S/.test(l);
      blocks.push({ kind: "list", items: buildList(takeWhile(isItem)) });
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quoted = takeWhile((l) => QUOTE_RE.test(l));
      blocks.push({
        kind: "quote",
        text: quoted.map((l) => (QUOTE_RE.exec(l)?.[2] ?? l).trim()).join("\n"),
      });
      continue;
    }

    const paragraph = takeWhile(
      (l) =>
        Boolean(l.trim()) &&
        !HEADING_RE.test(l) &&
        !BULLET_RE.test(l) &&
        !ORDERED_RE.test(l) &&
        !QUOTE_RE.test(l) &&
        !TABLE_ROW_RE.test(l) &&
        !RULE_RE.test(l) &&
        !/^```/.test(l.trim()),
    );
    // سطور الفقرة تُحفظ بفاصلها الأصلي (<br>): لا إعادة تدفق تُخفي مواضع قطع الأصل.
    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
}

// ─────────────────────────── نصّ ماركداون ⇒ inlines ───────────────────────────

function unescapeMarkdown(input: string): string {
  return input.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, "$1");
}

/**
 * قراءة التضمينات (عريض/مائل/شطب/شفرة/رابط/صورة) مع إبقاء المحارف كما هي: لا تطبيع،
 * لا إزالة تشكيل، لا استبدال همزات — المُنتَج يحمل نصّ الأصل حرفيًا.
 */
export function parseInlineMarkdown(input: string): string | InlineToken[] {
  const tokens: InlineToken[] = [];
  const re =
    /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|~~([^~]+)~~|`([^`]+)`|!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\(([^)\s]+)[^)]*\))/g;
  let last = 0;
  let tail = "";

  for (let m = re.exec(input); m; m = re.exec(input)) {
    const before = tail + input.slice(last, m.index);
    if (before) tokens.push({ text: unescapeMarkdown(before) });
    tail = "";
    last = m.index + m[0].length;
    const [, , strong, strongAlt, em, emAlt, del, code, imgAlt, linkText, linkUrl] = m;
    if (strong || strongAlt)
      tokens.push({ text: unescapeMarkdown(strong ?? strongAlt!), bold: true });
    else if (em || emAlt) tokens.push({ text: unescapeMarkdown(em ?? emAlt!), italics: true });
    else if (del) tokens.push({ text: unescapeMarkdown(del), decoration: "lineThrough" });
    else if (code) tokens.push({ text: code });
    else if (imgAlt !== undefined) tokens.push({ text: unescapeMarkdown(imgAlt) });
    else if (linkText)
      tokens.push({ text: unescapeMarkdown(linkText), decoration: "underline", link: linkUrl });
  }
  tail += input.slice(last);
  if (tail) tokens.push({ text: unescapeMarkdown(tail) });

  if (tokens.length === 0) return "";
  if (tokens.length === 1 && !tokens[0]!.bold && !tokens[0]!.italics && !tokens[0]!.decoration) {
    return tokens[0]!.text;
  }
  return tokens;
}

// ─────────────────────────── HTML ───────────────────────────

export interface PdfOptions {
  fontSize?: number;
  watermark?: string;
  /** اتجاه المستند الافتراضي للبلوكات المحايدة؛ افتراضيًا عربي (المشروع عربي أولًا). */
  rtl?: boolean;
  /**
   * هندسةُ صفحات الأصل المقيسة عند الاستقبال. تُكتب `@page` منها فيخرج المُنتَج بورقة
   * الأصل وهوامشِه؛ وundefined ترجع السطرَ القديم حرفيًا (لا A4 مُشتَقًّا من أرقام).
   */
  geometry?: PageGeometry;
}

const DEFAULT_FONT_SIZE = 14;

/**
 * إعلانُ `@page` بلا هندسةٍ مقيسة: حرفيًا ما كان مكتوبًا قبل قياسِ الهندسة، لا رقمًا
 * يُحسب ثم يُنسَب إلى «افتراضي». ضمانُ انحدار: من لا يقيس يحصل على نفس البايتات.
 */
const DEFAULT_PAGE_CSS = "size: A4; margin: 2cm;";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** روابط الماركداون تأتي من نصّ المستند: لا يُسمح إلا ببروتوكولات العرض الآمنة. */
function safeHref(url: string): string {
  return /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : "";
}

/** أسطر الأصل تبقى أسطرًا: `\n` ⇒ `<br>` بدل الدمج الذي يُخفي مواضع القطع. */
function breakLines(escaped: string): string {
  return escaped.includes("\n") ? escaped.split("\n").join("<br>\n") : escaped;
}

/**
 * تقديم الشدّة على الحركة التي تسبقها — ترتيب الإدخال الموصى به للعربية في Unicode،
 * والرسم واحد قياسًا على المخرج. لا يُحذف تشكيل ولا تُمسّ الهمزات والمدّ ولا أي حرف:
 * السبب أن ToUnicode للعنقود المركّب تنحرف مع الترتيب المعكوس فتُخرج حرفًا أجنبيًا
 * داخل الكلمة («الرَّحمن» ⇒ «الرaَّمن»)، وهو نصّ يُقرأ ويُبحث ويُقتبس في المصحف والحديث.
 */
export function orderShaddaFirst(text: string): string {
  // الحركات \u064B-\u0650 و\u0652؛ \u0651 هي الشدّة المستهدفة بالتقديم.
  return text.replace(/[\u064B-\u0650\u0652]+\u0651+/g, (cluster) => {
    const marks = [...cluster];
    const shadda = marks.filter((mark) => mark === "\u0651");
    const vowels = marks.filter((mark) => mark !== "\u0651");
    return [...shadda, ...vowels].join("");
  });
}

function renderInline(input: string): string {
  const tokens = parseInlineMarkdown(input);
  if (typeof tokens === "string") return breakLines(escapeHtml(tokens));
  return tokens
    .map((token) => {
      let html = breakLines(escapeHtml(token.text));
      if (token.bold) html = `<strong>${html}</strong>`;
      if (token.italics) html = `<em>${html}</em>`;
      if (token.decoration === "lineThrough") html = `<del>${html}</del>`;
      if (token.decoration === "underline") html = `<u>${html}</u>`;
      const href = token.link ? safeHref(token.link) : "";
      if (href) html = `<a href="${escapeHtml(href)}">${html}</a>`;
      return html;
    })
    .join("");
}

/** قرار الاتجاه من مصدره المشترك — لا عتبة جديدة ولا افتراض لغة. */
function dirFor(text: string, rtl: boolean): "rtl" | "ltr" {
  return (isRtlText(text) ?? rtl) ? "rtl" : "ltr";
}

function renderList(items: ListItem[]): string {
  if (!items.length) return "";
  const tag = items[0]!.ordered ? "ol" : "ul";
  const body = items
    .map((item) => {
      const nested = renderList(item.children);
      return `<li>${renderInline(item.text)}${nested ? `\n${nested}` : ""}</li>`;
    })
    .join("\n");
  return `<${tag}>\n${body}\n</${tag}>`;
}

function renderTable(rows: string[][], header: boolean, rtl: boolean): string {
  const columns = Math.max(...rows.map((row) => row.length));
  const cellRows = rows.map((row, r) =>
    Array.from({ length: columns }, (_, c) => {
      const text = row[c] ?? "";
      const tag = header && r === 0 ? "th" : "td";
      return `<${tag} dir="${dirFor(text, rtl)}">${renderInline(text)}</${tag}>`;
    }).join(""),
  );
  const head = header ? `<thead><tr>${cellRows[0]}</tr></thead>` : "";
  const bodyRows = header ? cellRows.slice(1) : cellRows;
  return `<table>\n${head}\n<tbody>\n${bodyRows
    .map((row) => `<tr>${row}</tr>`)
    .join("\n")}\n</tbody>\n</table>`;
}

export function buildPdfHtml(markdown: string, options: PdfOptions = {}): string {
  const base = options.fontSize && options.fontSize > 0 ? options.fontSize : DEFAULT_FONT_SIZE;
  const rtl = options.rtl ?? true;
  const pageRule = options.geometry ? geometryToPageCss(options.geometry) : DEFAULT_PAGE_CSS;

  const body = parseMarkdownBlocks(orderShaddaFirst(markdown))
    .map((block): string => {
      switch (block.kind) {
        case "heading": {
          const level = Math.min(6, Math.max(1, block.level));
          return `<h${level} dir="${dirFor(block.text, rtl)}">${renderInline(block.text)}</h${level}>`;
        }
        case "list": {
          const dir = dirFor(block.items.map((item) => item.text).join(" "), rtl);
          return `<div dir="${dir}">\n${renderList(block.items)}\n</div>`;
        }
        case "table":
          return `<div dir="${rtl ? "rtl" : "ltr"}">\n${renderTable(block.rows, block.header, rtl)}\n</div>`;
        case "quote":
          return `<blockquote dir="${dirFor(block.text, rtl)}">${renderInline(block.text)}</blockquote>`;
        case "code":
          // الشفرة لاتينية بطبيعتها: اتجاه صريح يسارًا يمنع انعكاس الأقواس والعلامات.
          return `<pre dir="ltr"><code>${escapeHtml(block.text)}</code></pre>`;
        case "rule":
          return "<hr>";
        case "paragraph":
        default:
          return `<p dir="${dirFor(block.text, rtl)}">${renderInline(block.text)}</p>`;
      }
    })
    .join("\n");

  const { regular, bold } = findAmiriFonts();
  const boldPath = bold ?? regular;
  const watermark = options.watermark
    ? `<div class="watermark">${escapeHtml(options.watermark)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<style>
/* خط واحد لكل عنصر: الرجوع لخط النظام يُسقط الهمزات من ToUnicode عند الاستخراج. */
@font-face { font-family: "Amiri"; src: url("${pathToFileURL(regular).href}"); }
@font-face { font-family: "Amiri"; src: url("${pathToFileURL(boldPath).href}"); font-weight: bold; }
html, body, h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre, code, a, em, strong, u, del {
  font-family: "Amiri";
}
@page { ${pageRule} }
body { font-size: ${base}pt; line-height: 1.6; margin: 0; }
h1 { font-size: 1.85em; }
h2 { font-size: 1.55em; }
h3 { font-size: 1.35em; }
h4 { font-size: 1.18em; }
h5 { font-size: 1.08em; }
h6 { font-size: 1em; }
h1, h2, h3, h4, h5, h6 { margin: 0.7em 0 0.35em; }
p, ul, ol, blockquote, table, pre, div { margin: 0 0 0.7em; }
ul, ol { padding-inline-start: 1.6em; }
li { margin: 0 0 0.25em; }
blockquote { padding-inline-start: 0.8em; border-inline-start: 2pt solid #999999; }
pre { direction: ltr; text-align: left; white-space: pre-wrap; background: #f5f5f5; padding: 0.5em; }
code { unicode-bidi: plaintext; }
table { border-collapse: collapse; }
th, td { border: 0.6pt solid #999999; padding: 0.25em 0.5em; text-align: start; }
hr { border: 0; border-top: 0.6pt solid #999999; margin: 1em 0; }
a { color: inherit; }
${
  options.watermark
    ? `.watermark { position: fixed; top: 40%; left: 0; right: 0; text-align: center;
  font-size: 56pt; color: #999999; opacity: 0.3; transform: rotate(-30deg); }`
    : ""
}
</style>
</head>
<body>
${watermark}
${body}
</body>
</html>
`;
}

// ─────────────────────────── المحرّك ───────────────────────────

/**
 * WeasyPrint يُنفَّذ بنفس مفسّر Python الذي تستخدمه طبقة OCR (`getPythonCommand`):
 * `WEASYPRINT_PYTHON` ثم `SURYA_PYTHON_PATH` ثم بيئات venv المعروفة. لا مسار شخصي هنا،
 * كما هو الحال في pandoc.ts وembed-fonts.ts.
 */
export function getWeasyprintPython(): string {
  return process.env.WEASYPRINT_PYTHON ?? getPythonCommand();
}

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "pdf-weasyprint-"));
  const htmlPath = path.join(tempDir, "input.html");
  const pdfPath = path.join(tempDir, "output.pdf");
  // خارج try: رسالة الفشل تُسمّي المفسّر الذي جرّبه، وهي لا تُبنى من متحرك محجوز داخله.
  const python = getWeasyprintPython();
  try {
    await writeFile(htmlPath, html, "utf8");
    await execFileAsync(python, ["-m", "weasyprint", htmlPath, pdfPath], {
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return await readFile(pdfPath);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const msg = err instanceof Error ? err.message : String(err);
    if (code === "ENOENT" || /No module named ['"]?weasyprint/.test(msg)) {
      throw new Error(
        `EXPORT_FORMAT_FAILED: محرّك PDF (WeasyPrint) غير متوفر على هذا المفسّر (${python}) — ثبّته بـ pip install weasyprint أو اضبط WEASYPRINT_PYTHON`,
      );
    }
    throw new Error(`EXPORT_FORMAT_FAILED: فشل توليد PDF: ${msg}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function generatePdf(
  cleanedText: CleanedText,
  options: PdfOptions = {},
): Promise<Buffer> {
  const markdownText = cleanedText.markdown || cleanedText.cleaned || "";
  let html: string;
  try {
    html = buildPdfHtml(markdownText, options);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // خطأ بيئة دائم (خط مفقود) — نفس علامة pandoc حتى لا يهدّر الطابور ثلاث محاولات.
    throw new Error(`EXPORT_FORMAT_FAILED: تعذّر تحميل خط Amiri للتصدير: ${msg}`);
  }
  const pdf = await renderHtmlToPdf(html);
  if (pdf.length === 0) throw new Error("EXPORT_FORMAT_FAILED: فشل توليد PDF: مخرج فارغ");
  return pdf;
}
