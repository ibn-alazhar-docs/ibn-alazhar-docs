/**
 * طبقة تصحيح الاتجاه العربية لملفات EPUB (مخرج pandoc `epub`).
 *
 * القياس على pandoc 3.1.3 (نفس المستند العربي، مخرج حقيقي مفكوك بالـ ZIP):
 *
 * - `-M dir=rtl` لا تكتب `dir` في أي مكان من الـ EPUB: لا في `<html>` ولا في `<body>`
 *   ولا في الـ OPF. أي أن الصيغة التي «تدعم RTL» في الوثائق لا تحصل عليه إطلاقًا.
 * - `<spine>` تخرج بلا `page-progression-direction`، فتقلّب الصفحات كله LTR: القارئ
 *   يمشي في الكتاب من الغلاف الخلفي إلى الأمام.
 * - `-M lang=ar` (وحدها تنفع) تكتب `lang="ar" xml:lang="ar"` على `<html>` و
 *   `<dc:language>ar</dc:language>` في الـ OPF — فتُترك بلاها على `en-US`.
 *
 * لذلك تُبنى هنا الحلية التي لا يملكها pandoc: `dir` على جذر كل XHTML (يرثه كل عنصر
 * بحسب قواعد bidi في HTML، فلا حاجة إلى وسم كل فقرة) و
 * `page-progression-direction="rtl"` على الـ spine. لا تُلمس النصوص ولا البنية ولا
 * الملفات الأخرى — تحديدًا `mimetype` يبقى أول مدخل في الـ ZIP وبلا ضغط، وهو شرط صحة
 * EPUB يعيده `writeZip` بنفس ترتيب المدخلات.
 */

import { readZip, writeZip, type ZipEntry } from "./embed-fonts";

/** وسم `<html …>` الجذر: يُضيف `dir` إن غاب ويحلّ محله إن كان مخالفًا. */
export function setRootDirection(xhtml: string, dir: "rtl" | "ltr"): string {
  return xhtml.replace(/<html\b[^>]*>/i, (tag) => {
    if (/\bdir\s*=/.test(tag)) {
      return tag.replace(/\bdir\s*=\s*"[^"]*"/i, `dir="${dir}"`);
    }
    return `${tag.slice(0, -1)} dir="${dir}">`;
  });
}

/** `<spine …>` في content.opf: `page-progression-direction` هو وحده الذي يقلّب الكتاب. */
export function setSpineProgression(opf: string, dir: "rtl" | "ltr"): string {
  return opf.replace(/<spine\b[^>]*>/i, (tag) => {
    if (/page-progression-direction\s*=/.test(tag)) {
      return tag.replace(
        /page-progression-direction\s*=\s*"[^"]*"/i,
        `page-progression-direction="${dir}"`,
      );
    }
    const inner = tag.slice(0, -1).trimEnd();
    return `${inner} page-progression-direction="${dir}">`;
  });
}

export interface RtlEpubOptions {
  /** اتجاه الكتاب كله. لا استنتاج للمحايد: المُنتِج العربي يعرف لغة مُنتَجه. */
  rtl?: boolean;
  /** تعطيل الطبقة (للمقارنة/التشخيص). */
  enabled?: boolean;
}

/**
 * المداخل: EPUB buffer ⇒ `dir` على كل XHTML + spine RTL ⇒ ZIP صالح بنفس المدخلات
 * وبنفس الترتيب. ملف بلا `<html>` أو بلا OPF يمرّ بلا تغيير (لا اختراع بنية).
 */
export function applyRtlEpub(epub: Buffer, opts: RtlEpubOptions = {}): Buffer {
  if (opts.enabled === false) return epub;
  const dir = (opts.rtl ?? true) ? "rtl" : "ltr";

  const entries = readZip(epub);
  const touches = entries.some(
    (entry) => entry.name.endsWith(".xhtml") || entry.name.endsWith(".opf"),
  );
  if (!touches) return epub;

  const written: ZipEntry[] = entries.map((entry) => {
    const isOpf = entry.name.endsWith(".opf");
    if (!isOpf && !entry.name.endsWith(".xhtml")) return entry;
    const xml = entry.data.toString("utf8");
    const patched = isOpf ? setSpineProgression(xml, dir) : setRootDirection(xml, dir);
    if (patched === xml) return entry;
    return { name: entry.name, data: Buffer.from(patched, "utf8") };
  });
  return writeZip(written);
}
