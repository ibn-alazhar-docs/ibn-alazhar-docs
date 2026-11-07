/**
 * طبقة اتجاه العربية في EPUB (packages/pipeline/src/output/epub-rtl.ts).
 *
 * بلا هذه الطبقة يبقى الكتاب العربي في قارئ عربي يقلب من اليسار إلى اليمين:
 * قياس pandoc 3.1.3 على مخرج `epub` الحقيقي لا يكتب `dir` في أي ملف من الحزمة
 * ولو مُرِّرت `-M dir=rtl`، ويكتب `<spine>` بلا `page-progression-direction`،
 * و`<dc:language>` على `en-US`. مجموعة "الضوابط المقيسة" تثبّت هذه الادعاءات على
 * المخرج الخام، ومجموعة "نهاية إلى نهاية" تثبّت أن الطبقة تصلحها في الملف النهائي.
 */

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyRtlEpub,
  setRootDirection,
  setSpineProgression,
} from "@ibn-al-azhar-docs/pipeline/output/epub-rtl";
import { generateEpub, readZip, writeZip } from "@ibn-al-azhar-docs/pipeline";
import type { ZipEntry } from "@ibn-al-azhar-docs/pipeline/output/embed-fonts";

const AR = "الحمد لله رب العالمين والصلاة والسلام على رسول الله";

const XHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="ar" xml:lang="ar">
<head><title>كتاب التكملة</title></head>
<body epub:type="bodymatter"><h1>${AR}</h1></body>
</html>`;

const OPF = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="epub-id-1">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:language>ar</dc:language></metadata>
  <manifest><item id="ch1" href="text/ch001.xhtml" media-type="application/xhtml+xml" /></manifest>
  <spine toc="ncx"><itemref idref="ch1" /></spine>
</package>`;

/** حزمة EPUB مصغّرة في الذاكرة — بلا pandoc، لقياس الطبقة على مستوى ZIP. */
function fakeEpub(parts: Record<string, string>): Buffer {
  const entries: ZipEntry[] = Object.entries(parts).map(([name, content]) => ({
    name,
    data: Buffer.from(content, "utf8"),
  }));
  return writeZip([{ name: "mimetype", data: Buffer.from("application/epub+zip") }, ...entries]);
}

function textOf(buf: Buffer, name: string): string {
  const found = readZip(buf).find((entry) => entry.name === name);
  if (!found) throw new Error(`missing zip entry: ${name}`);
  return found.data.toString("utf8");
}

/** أول مدخل في الـ ZIP: اسمه وطريقة ضغطه — EPUB يفرض `mimetype` أول وبلا ضغط. */
function firstEntry(buf: Buffer): { name: string; method: number } {
  return {
    method: buf.readUInt16LE(8),
    name: buf.toString("utf8", 30, 30 + buf.readUInt16LE(26)),
  };
}

describe("الطبقة على مستوى الحزمة (بلا pandoc)", () => {
  it("تضع dir على جذر كل XHTML بلا أن تلمس النص", () => {
    const patched = applyRtlEpub(fakeEpub({ "EPUB/text/ch001.xhtml": XHTML }));
    const html = textOf(patched, "EPUB/text/ch001.xhtml");
    expect(html).toMatch(/<html\b[^>]*\bdir="rtl"/);
    expect(html).toContain(AR);
    expect(html).toContain('<body epub:type="bodymatter">');
  });

  it("تحل dir الموجود محل أن تُكرّره (مخرج قديم لا ينفجر)", () => {
    const withDir = XHTML.replace('lang="ar"', 'dir="ltr" lang="ar"');
    const html = setRootDirection(withDir, "rtl");
    expect(html).not.toContain('dir="ltr"');
    expect(html.match(/\bdir=/g)).toHaveLength(1);
  });

  it("تكتب page-progression-direction على الـ spine وتحفظ بقية سماته", () => {
    const opf = textOf(applyRtlEpub(fakeEpub({ "EPUB/content.opf": OPF })), "EPUB/content.opf");
    expect(opf).toContain('page-progression-direction="rtl"');
    expect(opf).toContain('toc="ncx"');
    expect(setSpineProgression(setSpineProgression(OPF, "rtl"), "rtl")).toBe(
      setSpineProgression(OPF, "rtl"),
    );
  });

  it("ltr خيارٌ لا كسر: rtl:false تكتب ltr صراحةً", () => {
    const patched = applyRtlEpub(fakeEpub({ "EPUB/text/ch001.xhtml": XHTML }), { rtl: false });
    expect(textOf(patched, "EPUB/text/ch001.xhtml")).toContain('dir="ltr"');
  });

  it("enabled:false يمرر الحزمة كما هي بايت ببايت", () => {
    const epub = fakeEpub({ "EPUB/text/ch001.xhtml": XHTML, "EPUB/content.opf": OPF });
    expect(applyRtlEpub(epub, { enabled: false })).toBe(epub);
  });

  it("mimetype يبقى أول المدخلات وبلا ضغط، والغريب يُمسّ بلا تغيير", () => {
    const epub = fakeEpub({
      "EPUB/content.opf": OPF,
      "EPUB/Images/cover.jpg": "\u0000\u0001\u0002 binary-ish",
    });
    const patched = applyRtlEpub(epub);
    expect(firstEntry(patched)).toEqual({ name: "mimetype", method: 0 });
    expect(textOf(patched, "EPUB/Images/cover.jpg")).toBe("\u0000\u0001\u0002 binary-ish");
    expect(readZip(patched).map((e) => e.name)).toEqual(readZip(epub).map((e) => e.name));
  });

  it("حزمة بلا XHTML ولا OPF تمرّ كما هي بدل اختراع بنية", () => {
    const odd = writeZip([{ name: "mimetype", data: Buffer.from("application/epub+zip") }]);
    expect(applyRtlEpub(odd)).toBe(odd);
  });
});

// ─── الضوابط على مخرج pandoc الخام ────────────────────────────────────────────

/**
 * مخرج pandoc الخام مفكوكًا: مدخلات الحزمة مضغوطة deflate، فبحث نصّ داخل بايتات
 * الـ ZIP كان يمرّ بالكذب (لا يجد شيئًا لأن لا شيء مضغوطًا يُقرأ). هنا النصّ بعد
 * فكّ الضغط، أي نفس ما يقرأه القارئ.
 */
async function pandocEpubRaw(markdown: string, extraArgs: string[] = []): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "epub-probe-"));
  try {
    const md = path.join(dir, "in.md");
    const out = path.join(dir, "out.epub");
    await writeFile(md, markdown, "utf8");
    execFileSync("pandoc", [md, "-o", out, ...extraArgs], { timeout: 60_000 });
    const { readFile } = await import("node:fs/promises");
    const buf = await readFile(out);
    return readZip(buf)
      .filter((e) => e.name.endsWith(".xhtml") || e.name.endsWith(".opf"))
      .map((e) => e.data.toString("utf8"))
      .join("\n");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** هل pandoc نفسه يفعل هذا؟ إن تغيّر سلوكه يسقط هذا الاختبار لا الادعاء. */
describe("الضوابط المقيسة على مخرج pandoc الخام", () => {
  it("-M dir=rtl لا تكتب dir في أي ملف من حزمة EPUB", async () => {
    const raw = await pandocEpubRaw(`# ${AR}\n\n${AR}\n`, ["-M", "dir=rtl"]);
    expect(raw).not.toContain("dir=");
    expect(raw).not.toContain("page-progression-direction");
  }, 120_000);

  it("-M lang=ar وحدها تصل إلى <html lang> و <dc:language>", async () => {
    const raw = await pandocEpubRaw(`# ${AR}\n\n${AR}\n`, ["-M", "lang=ar"]);
    expect(raw).toContain('lang="ar"');
    expect(raw).toContain("<dc:language>ar</dc:language>");
  }, 120_000);
});

// ─── نهاية إلى نهاية ─────────────────────────────────────────────────────────

describe("نهاية إلى نهاية: generateEpub على المخرج الفعلي", () => {
  // تصيير واحد لكل المجموعة: pandoc عملية subprocess والقياس على نفس الملف.
  const rendered = generateEpub({
    markdown: `# كتاب التكملة\n\n${AR}\n\n- أول\n- ثاني\n`,
    cleaned: AR,
  }).then((buf) => ({
    buf,
    entries: readZip(buf),
    opf: readZip(buf)
      .filter((e) => e.name.endsWith(".opf"))
      .map((e) => e.data.toString("utf8"))
      .join(""),
    xhtml: readZip(buf)
      .filter((e) => e.name.endsWith(".xhtml"))
      .map((e) => e.data.toString("utf8")),
  }));

  it("كل XHTML عربي الجذر: dir=rtl و lang=ar", async () => {
    const { xhtml } = await rendered;
    expect(xhtml.length).toBeGreaterThan(0);
    for (const html of xhtml) {
      expect(html).toMatch(/<html\b[^>]*\bdir="rtl"/);
      expect(html).toMatch(/<html\b[^>]*\blang="ar"/);
    }
  }, 120_000);

  it("الـ spine يقلّب من اليمين والـ OPF يعرب اللغة", async () => {
    const { opf } = await rendered;
    expect(opf).toContain('page-progression-direction="rtl"');
    expect(opf).toContain("<dc:language>ar</dc:language>");
  }, 120_000);

  it("الحزمة تظل EPUB صالحًا: mimetype أولًا وبلا ضغط", async () => {
    const { buf } = await rendered;
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(firstEntry(buf)).toEqual({ name: "mimetype", method: 0 });
  }, 120_000);

  it("rtlEpub:false يلغي الطبقة في المخرج النهائي لا في الطبقة فقط", async () => {
    const buf = await generateEpub(
      { markdown: `# ${AR}\n\n${AR}\n`, cleaned: AR },
      {
        rtlEpub: false,
      },
    );
    const all = readZip(buf)
      .filter((e) => e.name.endsWith(".xhtml") || e.name.endsWith(".opf"))
      .map((e) => e.data.toString("utf8"))
      .join("");
    expect(all).not.toContain('dir="rtl"');
    expect(all).not.toContain("page-progression-direction");
  }, 120_000);
});
