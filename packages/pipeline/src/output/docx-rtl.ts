/**
 * docx-rtl.ts — طبقة تصحيح OOXML للاتجاه العربي (bidi) والخط المعقّد (cs) في ملفات .docx.
 *
 * السبب: العقبة الأخيرة من `TODO(bidi/fonts)` في docx-generator.ts (بند P0 في
 * docs/MERGE_PLAN.md). القياس على ناتج pandoc الفعلي في هذا المستودع (pandoc 3.1.3):
 *
 *  1. بلا `-M dir=rtl` لا يكتب pandoc أي `w:bidi` (٠ عنصر في word/document.xml).
 *     والمسار الافتراضي للـ docx يمرّر `dir=rtl` لكل مستند مهما كانت لغته، فيكون أعمى:
 *  2. فقرة إنجليزية خالصة تحصل على `<w:pPr><w:bidi/></w:pPr>` + `<w:rPr><w:rtl/></w:rPr>`
 *     ⇒ انعكاس المحايثة والمسافات بلا سبب (force-bidisation).
 *  3. خلايا الجدول: `<w:bidi/><w:jc w:val="left"/>` و`w:tblPr` بلا `w:bidiVisual`
 *     ⇒ العمود الأول يبقى أقصى اليسار (ترتيب أعمدة LTR) والعربية محاذاة يسارًا.
 *  4. `<w:sectPr />` فارغ، و`w:lvl` في numbering.xml بلا bidi ⇒ المقطع ورمز الترقيم يبقيان LTR.
 *  5. الخط المعقّد غير مضبوط: `docDefaults` تشير إلى `w:cstheme="minorBidi"` وسمة `a:cs`
 *     في theme1.xml فارغة (`<a:cs typeface=""/>`)، ولا `w:cs`/`w:szCs`/`w:lang w:bidi` على
 *     مستوى الـ run ⇒ العربية تُعرض بخط لاتيني (خطة الخطوط ترسل `Arab → Arial`).
 *
 * التصميم additive: لا يبدّل المحرك ولا يزيل مسار pandoc/OMML — يأخذ buffer الناتج (ZIP)
 * ويعيد كتابة أجزائه النصية فقط. بلا اعتمادية جديدة: فكّ/إعادة الضغط عبر `readZip`/
 * `writeZip` الموجودين في embed-fonts.ts؛ ولا أجزاء جديدة ⇒ لا مساس بـ`[Content_Types].xml`
 * ولا بالـ rels.
 *
 * كشف العربية مُعاد استخدامه لا مكرَر:
 *  - الفقرة/الجدول/المستند: `inferAlignment()` من ir/detection/paragraph-detector.ts
 *    («predominantly Arabic ⇒ right») — لا عتبة جديدة في هذا الملف.
 *  - الـ run: `analyzeText().arabicRatio` من text/analyze.ts (موجب = يحوي عربية).
 *
 * حدود معروفة: معالجة XML نصّية (بلا DOM)؛ الجداول المتداخلة (tbl داخل tbl) لم تُختبر؛
 * لا يمسّ `<m:t>` ولا `<m:r>` ⇒ لا أثر على المعادلات (OMML).
 */

import { analyzeText } from "../text";
import { inferAlignment } from "../ir/detection/paragraph-detector";
import { readZip, writeZip, type ZipEntry } from "./embed-fonts";
import { geometryToSectPrPageXml, type PageGeometry } from "./page-geometry";

/**
 * خط العربية المعقّد المرجعي: يجب أن يكون خطًا يضمّنه المشروع فعلًا. embed-fonts.ts يعرف
 * Amiri وحده (`fonts-hosny-amiri`)، وdocs/MERGE_PLAN.md نصّ على أن ملفات الخطوط
 * Gilroy/Thmanyah/Kitab غائبة ⇒ لا تُذكر أسماء غير المضمون.
 */
export const ARABIC_COMPLEX_FONT = "Amiri";

/** وسم لغة العربية في `w:lang` — الفتحة المعقّدة في ECMA-376 هي `w:lang/@bidi`. */
export const ARABIC_LANGUAGE_TAG = "ar-SA";

/** ترتيب أبناء `CT_PPrBase` (ECMA-376 §17.3.1): `bidi` قبل `spacing`/`ind`/`jc`. */
const PPR_ORDER = [
  "pStyle",
  "keepNext",
  "keepLines",
  "pageBreakBefore",
  "framePr",
  "widowControl",
  "numPr",
  "suppressLineNumbers",
  "pBdr",
  "shd",
  "tabs",
  "suppressAutoHyphens",
  "kinsoku",
  "wordWrap",
  "overflowPunct",
  "topLinePunct",
  "autoSpaceDE",
  "autoSpaceDN",
  "bidi",
  "adjustRightInd",
  "snapToGrid",
  "spacing",
  "ind",
  "contextualSpacing",
  "mirrorIndents",
  "suppressOverlap",
  "jc",
  "textDirection",
  "textAlignment",
  "textboxTightWrap",
  "outlineLvl",
  "divId",
  "cnfStyle",
  "rPr",
  "sectPr",
  "pPrChange",
];

/** ترتيب أبناء `CT_RPr`: `rFonts` ثانية، و`szCs` عقب `sz` مباشرة، و`rtl` قبل `lang`. */
const RPR_ORDER = [
  "rStyle",
  "rFonts",
  "b",
  "bCs",
  "i",
  "iCs",
  "caps",
  "smallCaps",
  "strike",
  "dstrike",
  "outline",
  "shadow",
  "emboss",
  "imprint",
  "noProof",
  "snapToGrid",
  "vanish",
  "webHidden",
  "color",
  "spacing",
  "w",
  "kern",
  "position",
  "sz",
  "szCs",
  "highlight",
  "u",
  "effect",
  "bdr",
  "shd",
  "fitText",
  "vertAlign",
  "rtl",
  "cs",
  "em",
  "lang",
  "eastAsianLayout",
  "specVanish",
  "oMath",
  "rPrChange",
];

/** ترتيب أبناء `CT_TblPr`: `bidiVisual` قبل `tblW`. */
const TBLPR_ORDER = [
  "tblStyle",
  "tblpPr",
  "tblOverlap",
  "bidiVisual",
  "tblW",
  "jc",
  "tblCellSpacing",
  "tblInd",
  "tblBorders",
  "shd",
  "tblLayout",
  "tblCellMar",
  "tblLook",
  "tblCaption",
  "tblDescription",
  "tblPrChange",
];

/** ترتيب أبناء `CT_SectPr`: `bidi` بعد `textDirection` وقبل `rtlGutter`/`docGrid`. */
const SECTPR_ORDER = [
  "headerReference",
  "footerReference",
  "footnotePr",
  "endnotePr",
  "type",
  "pgSz",
  "pgMar",
  "paperSrc",
  "pgBorders",
  "lnNumType",
  "pgNumType",
  "cols",
  "formProt",
  "vAlign",
  "noEndnote",
  "titlePg",
  "textDirection",
  "bidi",
  "rtlGutter",
  "docGrid",
  "printerSettings",
  "sectPrChange",
];

interface XmlElement {
  name: string;
  attrs: string;
  inner: string | null;
  start: number;
  end: number;
}

/**
 * أبناء العنصر مباشرةً (مستوى واحد): المطابقة تستهلك الشجرة كاملة، فلا يَنُدرّ حفيد
 * عن الأب. لا تعشيش متماثل الأسماء داخل pPr/rPr/tblPr/sectPr ⇒ الإغلاق غير المتسرّع آمن.
 */
function children(source: string): XmlElement[] {
  const out: XmlElement[] = [];
  const re = /<w:([A-Za-z][A-Za-z0-9]*)([^>]*?)(?:\/>|>([\s\S]*?)<\/w:\1>)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    out.push({
      name: match[1]!,
      attrs: match[2] ?? "",
      inner: match[3] ?? null,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return out;
}

function childOf(source: string, name: string): XmlElement | undefined {
  return children(source).find((el) => el.name === name);
}

function padAttrs(attrs: string): string {
  const normalized = attrs.trim().replace(/\s+/g, " ");
  return normalized ? ` ${normalized}` : "";
}

/** بناء عنصر؛ العديم الأبناء يُكتب مغلقًا ذاتيًا (لا `<w:bidi></w:bidi>`). */
function element(name: string, attrs: string, inner: string | null): string {
  const body = inner ?? "";
  if (body === "") return `<w:${name}${padAttrs(attrs)}/>`;
  return `<w:${name}${padAttrs(attrs)}>${body}</w:${name}>`;
}

function splice(source: string, el: XmlElement, xml: string): string {
  return source.slice(0, el.start) + xml + source.slice(el.end);
}

function attrOf(attrs: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return match ? match[1]! : null;
}

function hasAttr(attrs: string, name: string): boolean {
  return new RegExp(`(?:^|\\s)${name}="`).test(attrs);
}

function withAttr(attrs: string, name: string, value: string): string {
  if (hasAttr(attrs, name)) {
    return attrs.replace(new RegExp(`(\\s)${name}="[^"]*"`), `$1${name}="${value}"`);
  }
  return `${attrs} ${name}="${value}"`;
}

function withoutAttr(attrs: string, name: string): string {
  return attrs.replace(new RegExp(`\\s?${name}="[^"]*"`, "g"), "");
}

const ATTR_PAIR_RE = /(w:[A-Za-z]+)="([^"]*)"/g;

/**
 * يُسقط سماتِ `overrides` من `base` ثم يكتبها: السماتُ التي لا تعرفها الهندسة
 * (`w:header`/`w:footer`/`w:gutter` في مرجع pandoc) اختيارٌ مقصود لا سبب لمحوه،
 * والسماتُ المقيسةُ يجب أن تُكتب لا أن تُترك للأرجحِ منها.
 */
function applyAttrOverrides(base: string, overrides: string): string {
  const pairs = [...overrides.matchAll(ATTR_PAIR_RE)];
  let next = base;
  // مجموعتا النمط إلزاميتان في كل مطابقة، فالاستخراجُ بلا undefined قياسًا لا افتراضًا.
  for (const [, name] of pairs) next = withoutAttr(next, name!);
  for (const [, name, value] of pairs) next = withAttr(next, name!, value!);
  return next;
}

/** إدراج محترم لترتيب المخطط، وواحد فقط لكل اسم (المخطط لا يسمح بتكرار `w:rFonts`). */
function insertOrdered(inner: string, order: readonly string[], name: string, xml: string): string {
  if (childOf(inner, name)) return inner;
  const rank = order.indexOf(name);
  for (const el of children(inner)) {
    const existing = order.indexOf(el.name);
    if (existing > rank) return inner.slice(0, el.start) + xml + inner.slice(el.start);
  }
  return inner + xml;
}

function ensureChild(inner: string, order: readonly string[], name: string, attrs = ""): string {
  return insertOrdered(inner, order, name, element(name, attrs, null));
}

function dropChild(inner: string, name: string): string {
  const el = childOf(inner, name);
  return el ? inner.slice(0, el.start) + inner.slice(el.end) : inner;
}

/** يكتب سمة على ابن موجود، أو يدسّ العنصر بترتيبه إن غاب. */
function ensureChildAttr(
  inner: string,
  order: readonly string[],
  name: string,
  attr: string,
  value: string,
): string {
  const el = childOf(inner, name);
  if (!el) return insertOrdered(inner, order, name, element(name, ` ${attr}="${value}"`, null));
  if (attrOf(el.attrs, attr) === value) return inner;
  return splice(inner, el, element(name, withAttr(el.attrs, attr, value), el.inner));
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** فكّ الكيانات حتى يُقاس الاتجاه على المحارف الحقيقية لا على `&#1575;`. */
export function decodeXmlText(raw: string): string {
  return raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/g, (whole, name: string) => NAMED_ENTITIES[name] ?? whole);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  return String.fromCodePoint(code);
}

/** النصّ المقروء في قطعة XML: كل `w:t` (لا `m:t` ⇒ المعادلات خارج القرار). */
function textOf(source: string): string {
  const parts: string[] = [];
  const re = /<w:t\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:t>)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) parts.push(match[1] ?? "");
  return decodeXmlText(parts.join(""));
}

/**
 * اتجاه النصّ: `true` عربي الغلبة، `false` لاتيني، `undefined` محايد (أرقام/فراغ) فيَرِث
 * اتجاه المستند. القرار كله من `inferAlignment` — لا عتبة جديدة هنا.
 */
export function isRtlText(text: string): boolean | undefined {
  const alignment = inferAlignment(text);
  if (alignment === "right") return true;
  if (alignment === "left") return false;
  return undefined;
}

/** هل يحوي هذا النصّ عربية؟ النسبة من `analyzeText` — مصدرها الوحيد هنا. */
export function hasArabic(text: string): boolean {
  return analyzeText(text).arabicRatio > 0;
}

// ─────────────────────────── word/document.xml ───────────────────────────

/** الفقرة العربية: `w:bidi` (بترتيبه) ومحاذاة `left` ⇒ `right`؛ اللاتينية: يُحذف bidi. */
function patchParagraphProps(inner: string, rtl: boolean): string {
  const el = childOf(inner, "pPr");
  if (!rtl) {
    if (!el || !el.inner) return inner;
    const stripped = dropChild(el.inner, "bidi");
    return stripped.trim() === ""
      ? dropChild(inner, "pPr")
      : splice(inner, el, element("pPr", el.attrs, stripped));
  }

  let props = el?.inner ?? "";
  props = ensureChild(props, PPR_ORDER, "bidi");
  const jc = childOf(props, "jc");
  if (jc && attrOf(jc.attrs, "w:val") === "left") {
    // تحت `w:bidi` تعني `left` يسارًا فيزيائيًا — خطأ للعربية. `start`/`both` منطقيتان فتُترَكان.
    props = splice(props, jc, element("jc", withAttr(jc.attrs, "w:val", "right"), null));
  }

  if (!el) return `<w:pPr>${props}</w:pPr>${inner}`;
  return splice(inner, el, element("pPr", el.attrs, props));
}

/** run عربي: `w:rFonts w:cs` (عنصر واحد)، `w:szCs` معادلًا `w:sz`، `w:lang w:bidi`، ثم `w:rtl`. */
function patchArabicRunProps(props: string, csFont: string): string {
  const fonts = childOf(props, "rFonts");
  // الخط المعقّد المعلن صراحةً في المصدر يُترك: الاستبدال بـ Amiri يُلغي اختيارًا مقصودًا
  // (مثل `Thuluth`) — وهو نفس الحارس الذي في transformStylesXml.
  if (!fonts) {
    props = ensureChild(props, RPR_ORDER, "rFonts", ` w:cs="${csFont}"`);
  } else if (!attrOf(fonts.attrs, "w:cs")) {
    // cstheme تُحيل إلى `a:cs` الفارغة في theme1.xml ⇒ تُلغى ويُثبَّت cs صراحةً.
    const attrs = withoutAttr(withoutAttr(fonts.attrs, "w:cstheme"), "w:csTheme");
    props = splice(props, fonts, element("rFonts", withAttr(attrs, "w:cs", csFont), null));
  }

  const sz = childOf(props, "sz");
  if (sz && !childOf(props, "szCs")) {
    props = ensureChild(props, RPR_ORDER, "szCs", ` w:val="${attrOf(sz.attrs, "w:val") ?? "24"}"`);
  }

  props = ensureChildAttr(props, RPR_ORDER, "lang", "w:bidi", ARABIC_LANGUAGE_TAG);
  return ensureChild(props, RPR_ORDER, "rtl");
}

/**
 * ضبط الـ runs بلا force-bidi: الـ run اللاتيني داخل فقرة عربية يبقى بلا `w:rtl` وبلا خط
 * معقّد، و`w:rtl` الذي أضافه pandoc أعمى يُحذف في الفقرات اللاتينية.
 */
function patchRuns(inner: string, rtl: boolean, csFont: string): string {
  return inner.replace(
    /<w:r\b([^>]*?)>([\s\S]*?)<\/w:r>/g,
    (whole, rawAttrs: string, body: string) => {
      const runText = textOf(body);
      if (!runText) return whole; // معادلات وحقول وصور: لا تُمسّ
      const rPr = childOf(body, "rPr");
      const open = `<w:r${padAttrs(rawAttrs)}>`;
      if (!rtl) {
        if (!rPr?.inner || !childOf(rPr.inner, "rtl")) return whole;
        const stripped = dropChild(rPr.inner, "rtl");
        const nextPr = element("rPr", rPr.attrs, stripped.trim() === "" ? null : stripped);
        return `${open}${splice(body, rPr, nextPr)}</w:r>`;
      }
      if (!hasArabic(runText)) return whole;
      const patched = element(
        "rPr",
        rPr?.attrs ?? "",
        patchArabicRunProps(rPr?.inner ?? "", csFont),
      );
      return `${open}${rPr ? splice(body, rPr, patched) : patched + body}</w:r>`;
    },
  );
}

function transformParagraph(paraXml: string, rtlDefault: boolean, csFont: string): string {
  const match = /^<w:p\b([^>]*?)>([\s\S]*?)<\/w:p>$/.exec(paraXml);
  if (!match) return paraXml;
  const body = match[2]!;
  const rtl = isRtlText(textOf(body)) ?? rtlDefault;
  const next = patchRuns(patchParagraphProps(body, rtl), rtl, csFont);
  return `<w:p${padAttrs(match[1] ?? "")}>${next}</w:p>`;
}

/** الجدول العربي: `w:bidiVisual` على `w:tblPr` — موضعه المخططى، وهو ما يعكس ترتيب الأعمدة. */
function transformTables(xml: string, rtlDefault: boolean): string {
  return xml.replace(
    /<w:tbl\b([^>]*?)>([\s\S]*?)<\/w:tbl>/g,
    (whole, attrs: string, body: string) => {
      if ((isRtlText(textOf(body)) ?? rtlDefault) === false) return whole;
      const tblPr = childOf(body, "tblPr");
      const nextBody = tblPr
        ? splice(
            body,
            tblPr,
            element(
              "tblPr",
              tblPr.attrs,
              ensureChild(tblPr.inner ?? "", TBLPR_ORDER, "bidiVisual"),
            ),
          )
        : `<w:tblPr><w:bidiVisual/></w:tblPr>${body}`;
      return `<w:tbl${padAttrs(attrs)}>${nextBody}</w:tbl>`;
    },
  );
}

/** يكتب ابنًا بمضمونه الكامل، محلَّ الموجود إن كان (مع دمج سماته) أو بترتيبه إن غاب. */
function replaceOrInsertChild(inner: string, order: readonly string[], xml: string): string {
  const fragment = children(xml)[0];
  if (!fragment) return inner;
  const existing = childOf(inner, fragment.name);
  if (!existing) return insertOrdered(inner, order, fragment.name, xml);
  const attrs = applyAttrOverrides(existing.attrs, fragment.attrs);
  return splice(inner, existing, element(fragment.name, attrs, fragment.inner));
}

/**
 * ورقَةُ الـ DOCX تُكتب من الأصل لا من المرجع: `reference_rtl.docx` يمثّل ورقةً واحدة
 * ثابتة، فمخطوطٌ بصفحة ١٢×١٩ سم كان يرث A4. الحدفُ هنا على `w:pgSz`/`w:pgMar` لا على
 * المرجع كلّه: الأنماطُ والخطوطُ التي يبقيها المرجعُ صحيحةٌ والقصدُ في الهندسة وحدها.
 */
function applySectPrPageGeometry(inner: string, geometry: PageGeometry): string {
  const { pgSz, pgMar } = geometryToSectPrPageXml(geometry);
  return replaceOrInsertChild(replaceOrInsertChild(inner, SECTPR_ORDER, pgSz), SECTPR_ORDER, pgMar);
}

/**
 * المقاطع: `w:bidi` فيَرِثه اتجاهُ الصفحة والترقيم، و`w:pgSz`/`w:pgMar` من هندسة الأصل.
 * الهندسةُ تُكتب حتى في المستند اللاتيني — الورقةُ صفةُ الأصل لا صفةُ اللغة.
 */
function transformSections(xml: string, rtl: boolean, geometry?: PageGeometry): string {
  if (!rtl && !geometry) return xml;
  return xml.replace(
    /<w:sectPr\b([^>]*?)(?:\/>|>([\s\S]*?)<\/w:sectPr>)/g,
    (_, attrs: string, inner?: string) => {
      let body = inner ?? "";
      if (rtl) body = ensureChild(body, SECTPR_ORDER, "bidi");
      if (geometry) body = applySectPrPageGeometry(body, geometry);
      return element("sectPr", attrs, body);
    },
  );
}

/** يحوّل word/document.xml: bidi لكل فقرة عربية، وإزالته عن اللاتينية، وcs لكل run عربي. */
export function transformDocumentXml(
  xml: string,
  opts: { rtl?: boolean; csFont?: string; geometry?: PageGeometry } = {},
): string {
  const csFont = opts.csFont ?? ARABIC_COMPLEX_FONT;
  const rtl = opts.rtl ?? isRtlText(textOf(xml)) ?? true;
  const sectioned = transformSections(xml, rtl, opts.geometry);
  const tabled = transformTables(sectioned, rtl);
  return tabled.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (para) =>
    transformParagraph(para, rtl, csFont),
  );
}

// ─────────────────────────── word/styles.xml ───────────────────────────

/**
 * ضبط فتحة الخط المعقّد في الأنماط: `w:cstheme` (التي تُحيل إلى `a:cs` الفارغة في
 * theme1.xml) تُستبدل بـ`w:cs="Amiri"` صراحةً، وكل `w:sz` يكتسب `w:szCs` مثله، و`w:lang`
 * القائمة تكتسب `w:bidi`. يشمل `docDefaults/rPrDefault` لأنّه `w:rPr` أيضًا.
 */
export function transformStylesXml(xml: string, opts: { csFont?: string } = {}): string {
  const csFont = opts.csFont ?? ARABIC_COMPLEX_FONT;
  const withCsFont = xml.replace(/<w:rFonts\b([^>]*?)\/>/g, (_, rawAttrs: string) => {
    if (attrOf(rawAttrs, "w:cs")) return `<w:rFonts${padAttrs(rawAttrs)}/>`;
    const cleaned = withoutAttr(withoutAttr(rawAttrs, "w:cstheme"), "w:csTheme");
    return `<w:rFonts${padAttrs(withAttr(cleaned, "w:cs", csFont))}/>`;
  });

  return withCsFont.replace(
    /<w:rPr\b([^>]*?)>([\s\S]*?)<\/w:rPr>/g,
    (whole, rawAttrs: string, inner: string) => {
      let props = inner;
      const sz = childOf(props, "sz");
      if (sz && !childOf(props, "szCs")) {
        props = ensureChild(
          props,
          RPR_ORDER,
          "szCs",
          ` w:val="${attrOf(sz.attrs, "w:val") ?? "24"}"`,
        );
      }
      const lang = childOf(props, "lang");
      if (lang) props = ensureChildAttr(props, RPR_ORDER, "lang", "w:bidi", ARABIC_LANGUAGE_TAG);
      if (props === inner) return whole;
      return `<w:rPr${padAttrs(rawAttrs)}>${props}</w:rPr>`;
    },
  );
}

// ─────────────────────────── word/numbering.xml ───────────────────────────

/** تمرير bidi إلى تعريفات الترقيم: رقم/رمز القائمة يظهر يمينًا لا يسارًا. */
export function transformNumberingXml(xml: string): string {
  return xml.replace(/<w:lvl\b([^>]*?)>([\s\S]*?)<\/w:lvl>/g, (_, attrs: string, inner: string) => {
    const pPr = childOf(inner, "pPr");
    if (pPr) {
      const props = ensureChild(pPr.inner ?? "", PPR_ORDER, "bidi");
      return `<w:lvl${padAttrs(attrs)}>${splice(inner, pPr, element("pPr", pPr.attrs, props))}</w:lvl>`;
    }
    // `w:pPr` في `CT_Lvl` بعد `lvlJc` وقبل `rPr`.
    const injected = "<w:pPr><w:bidi/></w:pPr>";
    const rPr = childOf(inner, "rPr");
    const body = rPr
      ? inner.slice(0, rPr.start) + injected + inner.slice(rPr.start)
      : inner + injected;
    return `<w:lvl${padAttrs(attrs)}>${body}</w:lvl>`;
  });
}

// ─────────────────────────── أجزاء أخرى ───────────────────────────

/** `w:themeFontLang w:bidi="ar-SA"` — يجعل فتحة Bidi في خطة الخطوط قابلة للحلّ. */
export function transformSettingsXml(xml: string): string {
  const existing = /<w:themeFontLang\b([^>]*?)\/>/.exec(xml);
  if (existing) {
    if (attrOf(existing[1] ?? "", "w:bidi")) return xml;
    return xml.replace(
      existing[0],
      `<w:themeFontLang${padAttrs(withAttr(existing[1] ?? "", "w:bidi", ARABIC_LANGUAGE_TAG))}/>`,
    );
  }
  const injected = `<w:themeFontLang w:bidi="${ARABIC_LANGUAGE_TAG}"/>`;
  if (xml.includes("</w:settings>"))
    return xml.replace("</w:settings>", `${injected}</w:settings>`);
  // `<w:settings/>` مغلق ذاتيًا (pandoc يكتبه بلا أبناء أحيانًا): لا وسم إغلاق، فيُفتح من جديد.
  const selfClosing = /<w:settings\b([^>]*?)\/>/.exec(xml);
  if (!selfClosing) return xml;
  return xml.replace(
    selfClosing[0],
    `<w:settings${padAttrs(selfClosing[1] ?? "")}>${injected}</w:settings>`,
  );
}

/** قيد خط العربية في fontTable (بلا `w:sig` مختلَق) إن لم يكن مقيَّدًا أصلًا. */
export function transformFontTableXml(xml: string, csFont = ARABIC_COMPLEX_FONT): string {
  if (xml.includes(`w:name="${csFont}"`)) return xml;
  const entry =
    `<w:font w:name="${csFont}"><w:altName w:val="Times New Roman"/>` +
    `<w:family w:val="roman"/><w:pitch w:val="variable"/></w:font>`;
  if (xml.includes("</w:fonts>")) return xml.replace("</w:fonts>", `${entry}</w:fonts>`);
  // `<w:fonts/>` مغلق ذاتيًا (لا قيد عند pandoc أحيانًا): يُفتح ليُقيَّد.
  const selfClosing = /<w:fonts\b([^>]*?)\/>/.exec(xml);
  if (!selfClosing) return xml;
  return xml.replace(
    selfClosing[0],
    `<w:fonts${padAttrs(selfClosing[1] ?? "")}>${entry}</w:fonts>`,
  );
}

// ─────────────────────────── الواجهة على buffer ───────────────────────────

export interface RtlOoxmlOptions {
  /** اتجاه المستند الافتراضي (للفقرات المحايدة)؛ افتراضيًا يُشتَقّ من المحتوى وإلا `true`. */
  rtl?: boolean;
  /** خط العربية المعقّد؛ افتراضيًا `ARABIC_COMPLEX_FONT` (Amiri — المضمَّن فعلًا). */
  csFont?: string;
  /** تعطيل الطبقة (للمقارنة/التشخيص). */
  enabled?: boolean;
  /**
   * هندسةُ صفحات الأصل: تُكتب `w:pgSz`/`w:pgMar` في كل مقطع فتمرّ الورقةُ وهوامشُها
   * كما في الأصل بدل أن يرثا مقاسَ المرجع الثابت. غائبةً يبقى المقطعُ كما كان.
   */
  geometry?: PageGeometry;
}

/**
 * المداخل: DOCX buffer ⇒ تصحيح أجزائه ⇒ ZIP صالح. لا يضيف أجزاء، ولا يغيّر شيئًا إن
 * غاب `word/document.xml`، ولا يمسّ المعادلات.
 */
export function applyRtlOoxml(docx: Buffer, opts: RtlOoxmlOptions = {}): Buffer {
  if (opts.enabled === false) return docx;
  const entries = readZip(docx);
  const document = entries.find((entry) => entry.name === "word/document.xml");
  if (!document) return docx;

  const xml = document.data.toString("utf8");
  const bodyText = textOf(xml);
  const rtl = opts.rtl ?? isRtlText(bodyText) ?? true;
  const csFont = opts.csFont ?? ARABIC_COMPLEX_FONT;

  const patches: Record<string, (input: string) => string> = {
    "word/document.xml": (input) =>
      transformDocumentXml(input, { rtl, csFont, geometry: opts.geometry }),
  };
  // بلا أي عربية لا معنى لإعلان Amiri ولا لترقيم RTL — نكتفي بتصحيح الاتجاه.
  if (hasArabic(bodyText)) {
    patches["word/styles.xml"] = (input) => transformStylesXml(input, { csFont });
    patches["word/numbering.xml"] = transformNumberingXml;
    patches["word/settings.xml"] = transformSettingsXml;
    patches["word/fontTable.xml"] = (input) => transformFontTableXml(input, csFont);
  }

  const written: ZipEntry[] = entries.map((entry) => {
    const patch = patches[entry.name];
    if (!patch) return entry;
    return { name: entry.name, data: Buffer.from(patch(entry.data.toString("utf8")), "utf8") };
  });
  return writeZip(written);
}
