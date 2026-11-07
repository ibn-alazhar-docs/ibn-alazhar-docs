/**
 * embed-fonts.ts — تضمين خط Amiri داخل ملفات DOCX (OOXML font embedding).
 *
 * نقل من SKILLS/arabic-pdf-to-book/scripts/embed_fonts.py.
 * يطبّق مواصفة ECMA-376 (§17.8.1): تشويب أول ٣٢ بايت من ملف الخط بمفتاح GUID
 * (ترتيب OOXML: bytes معكوسة في المجموعات الثلاث الأولى)، ثم ربطه في
 * word/fontTable.xml + word/fonts/*.odttf + word/_rels/fontTable.xml.rels +
 * [Content_Types].xml + word/settings.xml (embedTrueTypeFonts).
 *
 * تنفيذ ZIP يدوي (لا اعتمادية جديدة): قراءة عبر central directory مع
 * inflateRawSync للمدخلات المضغوطة، وكتابة STORE (بلا ضغط) — صيغة ZIP صالحة
 * يقبلها Word/LibreOffice، والخطوط تُخزَّن كما هي أصلًا داخل DOCX.
 * CRC32 مُنفّذ هنا (جدول 256).
 */

import { inflateRawSync } from "node:zlib";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

/**
 * Vendored Amiri first (OFL 1.1 — see `assets/fonts/OFL.txt`). The system and home
 * paths are only fallbacks: resolving a font from a developer's `~/.fonts` made
 * DOCX font embedding silently no-op in Docker, CI, and every real deployment.
 * `../../assets` is correct from both `src/output` and a built `dist/output`.
 *
 * `import.meta.dirname` is undefined once Next bundles this package, which threw at
 * module evaluation and 500-ed every route importing it — hence the URL form, which
 * is already the convention in `ocr.ts`, `output/pdf.ts` and `text/clean/index.ts`.
 */
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const VENDORED_FONT_DIR = path.resolve(MODULE_DIR, "../../assets/fonts");

const FONT_REGULAR_CANDIDATES = [
  path.join(VENDORED_FONT_DIR, "Amiri-Regular.ttf"),
  "/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf",
  path.join(homedir(), ".fonts/Amiri-Regular.ttf"),
  path.join(homedir(), ".local/share/fonts/Amiri-Regular.ttf"),
];
const FONT_BOLD_CANDIDATES = [
  path.join(VENDORED_FONT_DIR, "Amiri-Bold.ttf"),
  "/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Bold.ttf",
  path.join(homedir(), ".fonts/Amiri-Bold.ttf"),
  path.join(homedir(), ".local/share/fonts/Amiri-Bold.ttf"),
];

export interface AmiriFontPaths {
  regular: string;
  bold?: string;
}

export function findAmiriFonts(fontDir?: string): AmiriFontPaths {
  const pick = (candidates: string[]): string | undefined => {
    if (fontDir) {
      const name = path.basename(candidates[0]!);
      const inDir = path.join(fontDir, name);
      if (existsSync(inDir)) return inDir;
    }
    return candidates.find((c) => existsSync(c));
  };
  const regular = pick(FONT_REGULAR_CANDIDATES);
  if (!regular) {
    throw new Error(
      "خط Amiri غير موجود (Amiri-Regular.ttf) — ثبّت fonts-hosny-amiri أو مرّر amiriFontDir",
    );
  }
  return { regular, bold: pick(FONT_BOLD_CANDIDATES) };
}

// ─────────────────────────── ZIP أدوات ───────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (CRC_TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

export function readZip(buf: Buffer): ZipEntry[] {
  // ابحث عن End Of Central Directory من النهاية
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ليس ملف ZIP صالحًا (لا يوجد End Of Central Directory)");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== CD_SIG) throw new Error("Central Directory تالف");
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    // رأس المحلي
    if (buf.readUInt32LE(localOff) !== LOCAL_SIG) throw new Error("Local header تالف");
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(comp);
    else if (method === 8) data = inflateRawSync(comp);
    else throw new Error(`طريقة ضغط ZIP غير مدعومة: ${method} (${name})`);
    entries.push({ name, data });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function writeZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 flag
    local.writeUInt16LE(0, 8); // STORE
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0, 12); // date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, e.data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(CD_SIG, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(e.data.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + e.data.length;
  }
  const cdSize = central.reduce((s, b) => s + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...central, eocd]);
}

// ─────────────────────────── تشويب الخط ───────────────────────────

/** يشوّب أول ٣٢ بايت بمفتاح GUID (ترتيب OOXML) — كما في الأصل. */
export function obfuscateFont(data: Buffer, key: string): Buffer {
  const bytes = Buffer.from(key.replace(/-/g, ""), "hex"); // 16 بايت
  // OOXML: kb = k[3..0] + k[5..4] + k[7..6] + k[8..15]
  const kb = Buffer.alloc(16);
  for (let i = 0; i < 4; i++) kb[i] = bytes[3 - i]!;
  for (let i = 0; i < 2; i++) kb[4 + i] = bytes[5 - i]!;
  for (let i = 0; i < 2; i++) kb[6 + i] = bytes[7 - i]!;
  for (let i = 8; i < 16; i++) kb[i] = bytes[i]!;
  const out = Buffer.from(data);
  for (let i = 0; i < Math.min(32, out.length); i++) {
    out[i] = out[i]! ^ kb[i % 16]!;
  }
  return out;
}

const CT_FONT = "application/vnd.openxmlformats-officedocument.obfuscatedFont";
const CT_FONTTABLE = "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml";
const REL_FONT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
const REL_FONTTABLE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";

/**
 * يضمّن Amiri في DOCX buffer ويعيد buffer جديدًا.
 * مطابقة embed_fonts.py خطوة بخطوة (①-⑦).
 */
export function embedAmiriFonts(
  docx: Buffer,
  opts: { fontDir?: string; regularPath?: string; boldPath?: string } = {},
): Buffer {
  const found = opts.regularPath
    ? { regular: opts.regularPath, bold: opts.boldPath }
    : findAmiriFonts(opts.fontDir);
  const regular = readFileSync(found.regular);
  const bold = found.bold && existsSync(found.bold) ? readFileSync(found.bold) : null;

  const keyR = randomUUID();
  const keyB = randomUUID();
  const parts = new Map<string, Buffer>();
  for (const e of readZip(docx)) parts.set(e.name, e.data);

  // ① ملفات الخطوط
  parts.set("word/fonts/font1.odttf", obfuscateFont(regular, keyR));
  if (bold) parts.set("word/fonts/font2.odttf", obfuscateFont(bold, keyB));

  // ② fontTable.xml
  let ft = parts.get("word/fontTable.xml")?.toString("utf8") ?? "";
  if (!ft) {
    ft =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      "</w:fonts>";
  }
  const embeds =
    `<w:embedRegular r:id="rIdFont1" w:fontKey="{${keyR.toUpperCase()}}"/>` +
    `<w:embedBold r:id="rIdFont2" w:fontKey="{${keyB.toUpperCase()}}"/>`;
  if (ft.includes('w:name="Amiri"')) {
    const i = ft.indexOf('w:name="Amiri"');
    const j = ft.indexOf("</w:font>", i);
    ft = ft.slice(0, j) + embeds + ft.slice(j);
  } else {
    ft = ft.replace("</w:fonts>", `<w:font w:name="Amiri">${embeds}</w:font></w:fonts>`);
  }
  parts.set("word/fontTable.xml", Buffer.from(ft, "utf8"));

  // ③ علاقات fontTable
  const relsName = "word/_rels/fontTable.xml.rels";
  let rels = parts.get(relsName)?.toString("utf8") ?? "";
  if (!rels) {
    rels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      "</Relationships>";
  }
  rels = rels.replace(
    "</Relationships>",
    `<Relationship Id="rIdFont1" Type="${REL_FONT}" Target="fonts/font1.odttf"/>` +
      `<Relationship Id="rIdFont2" Type="${REL_FONT}" Target="fonts/font2.odttf"/>` +
      "</Relationships>",
  );
  parts.set(relsName, Buffer.from(rels, "utf8"));

  // ④ علاقة document → fontTable (إن لم توجد)
  const drelsName = "word/_rels/document.xml.rels";
  const drelsBuf = parts.get(drelsName);
  if (!drelsBuf) throw new Error("word/_rels/document.xml.rels مفقود في DOCX");
  let drels = drelsBuf.toString("utf8");
  if (!drels.includes(REL_FONTTABLE)) {
    drels = drels.replace(
      "</Relationships>",
      `<Relationship Id="rIdFontTable" Type="${REL_FONTTABLE}" Target="fontTable.xml"/></Relationships>`,
    );
    parts.set(drelsName, Buffer.from(drels, "utf8"));
  }

  // ⑤ Content Types
  const ctBuf = parts.get("[Content_Types].xml");
  if (!ctBuf) throw new Error("[Content_Types].xml مفقود في DOCX");
  let ct = ctBuf.toString("utf8");
  if (!ct.includes('Extension="odttf"')) {
    ct = ct.replace("<Default ", `<Default Extension="odttf" ContentType="${CT_FONT}"/><Default `);
  }
  if (!ct.includes("/word/fontTable.xml")) {
    ct = ct.replace(
      "</Types>",
      `<Override PartName="/word/fontTable.xml" ContentType="${CT_FONTTABLE}"/></Types>`,
    );
  }
  parts.set("[Content_Types].xml", Buffer.from(ct, "utf8"));

  // ⑥ settings.xml
  const stBuf = parts.get("word/settings.xml");
  if (stBuf) {
    let st = stBuf.toString("utf8");
    if (!st.includes("embedTrueTypeFonts")) {
      const add = "<w:embedTrueTypeFonts/><w:saveSubsetFonts/>";
      if (st.includes("<w:defaultTabStop")) {
        st = st.replace("<w:defaultTabStop", add + "<w:defaultTabStop");
      } else {
        st = st.replace("</w:settings>", add + "</w:settings>");
      }
      parts.set("word/settings.xml", Buffer.from(st, "utf8"));
    }
  }

  // ⑦ إعادة الكتابة (نفس ترتيب المدخلات + الجديدة في النهاية)
  const ordered: ZipEntry[] = [];
  for (const e of readZip(docx)) {
    const data = parts.get(e.name);
    if (data) ordered.push({ name: e.name, data });
  }
  for (const [name, data] of parts) {
    if (!ordered.some((e) => e.name === name)) ordered.push({ name, data });
  }
  return writeZip(ordered);
}

/** يستخرج word/document.xml من DOCX (لعدّ OMML في QA gates). */
export function readDocxDocumentXml(docx: Buffer): string {
  const entry = readZip(docx).find((e) => e.name === "word/document.xml");
  if (!entry) throw new Error("word/document.xml غير موجود في DOCX");
  return entry.data.toString("utf8");
}

export function countOmml(docxDocumentXml: string): number {
  return (docxDocumentXml.match(/<m:oMath/g) ?? []).length;
}
