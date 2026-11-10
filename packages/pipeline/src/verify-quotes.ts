/**
 * verify-quotes.ts — تدقيق الاقتباسات في نصّ عربي: قرآن · حديث · سلامة نصّية.
 *
 * نقل من SKILLS/arabic-pdf-to-book/scripts/verify_quotes.py (v2.9.x).
 * رموز النتائج كما في الأصل:
 *   Q001 نصّ آية مخالف للمصحف   Q002 تشكيل مخالف   Q003 مرجع خاطئ
 *   Q004 بلا مرجع/مرجع غير مفهوم  Q005 اقتباس يمتدّ آيتين (معلومة)
 *   H001 حديث غير موجود في البخاري/مسلم   H002 نصّ حديث مخالف
 *   T001 أقواس معقوفة {}  T002 أشكال عرضية/حروف فارسية/تطويل
 *   T003 أقواس غير متوازنة  T004 مسافة قبل ترقيم  T005 مسافة مزدوجة
 *   T006 ** غير متوازن  T007 جدول بأعمدة مختلفة  T008 عنوان مكرر
 *   T009 سطر طويل جدًا  T010 سطر مكرر (تسرّب ترويسة)
 *
 * وفاء بالمصدر (لا نسخ حرفي للبيانات):
 * - normalize عربي (MARKS/IGNORE/PRESENTATION/FARSI + توحيد أإآٱ→ا، ىئ→ي، ؤ→و، ة→ه)
 *   منقول حرفيًا — هو معيار المقارنة، أي تغيير فيه يغيّر النتائج.
 * - difflib.SequenceMatcher مُعاد تنفيذه هنا (Ratcliff–Obershelp) لأنه غير موجود
 *   في JS؛ الخوارزمية (b2j + findLongestMatch + getMatchingBlocks + opcodes)
 *   مطابقة لخوارزمية CPython، مع autojunk (استبعاد العناصر الشائعة >1% إذا n≥200).
 * - الفهارس (byFirst/byWord للآيات، rare-index للأحاديث) منقولة البنية.
 * - قاعدة البيانات (المصحف/الأحاديث) تُحقن من الخارج (QuranCorpus) ولا تُضمَّن
 *   هنا — العميل يمرّر quran-simple.json المقروء من cache كما في الأصل
 *   (~/.cache/ar-verify). لا تنزيل من الشبكة داخل المكتبة.
 */

import { TASHKEEL_SOURCE, TATWEEL_SOURCE } from "./text/constants";

// ─────────────────────────── SequenceMatcher (difflib) ───────────────────────────

export interface MatchingBlock {
  a: number;
  b: number;
  size: number;
}

export interface Opcode {
  tag: "replace" | "delete" | "insert" | "equal";
  i1: number;
  i2: number;
  j1: number;
  j2: number;
}

interface LongestMatch {
  i: number;
  j: number;
  size: number;
}

/**
 * إعادة تنفيذ difflib.SequenceMatcher (CPython) على عناصر قابلة للمقارنة.
 * يدعم autojunk كما في الأصل؛ لا يدعم isjunk مخصصًا (في verify_quotes لا يُستخدم).
 */
export class SequenceMatcher<T extends string = string> {
  private a: T[];
  private b: T[];
  private autojunk: boolean;
  private b2j = new Map<T, number[]>();
  private popular = new Set<T>();

  constructor(a: readonly T[], b: readonly T[], opts: { autojunk?: boolean } = {}) {
    this.a = [...a];
    this.b = [...b];
    this.autojunk = opts.autojunk ?? true;
    this.chainB();
  }

  private chainB(): void {
    const b = this.b;
    b.forEach((elt, i) => {
      const list = this.b2j.get(elt);
      if (list) list.push(i);
      else this.b2j.set(elt, [i]);
    });
    if (this.autojunk && b.length >= 200) {
      const ntest = Math.floor(b.length / 100) + 1;
      for (const [elt, idxs] of this.b2j) {
        if (idxs.length > ntest) this.popular.add(elt);
      }
      for (const elt of this.popular) this.b2j.delete(elt);
    }
  }

  findLongestMatch(alo = 0, ahi = this.a.length, blo = 0, bhi = this.b.length): LongestMatch {
    const { a, b, b2j } = this;
    let besti = alo;
    let bestj = blo;
    let bestsize = 0;
    let j2len = new Map<number, number>();
    for (let i = alo; i < ahi; i++) {
      const newj2len = new Map<number, number>();
      const idxs = b2j.get(a[i]!);
      if (idxs) {
        for (const j of idxs) {
          if (j < blo) continue;
          if (j >= bhi) break;
          const k = (j2len.get(j - 1) ?? 0) + 1;
          newj2len.set(j, k);
          if (k > bestsize) {
            besti = i - k + 1;
            bestj = j - k + 1;
            bestsize = k;
          }
        }
      }
      j2len = newj2len;
    }
    // تمديد بالعناصر الشائعة/القمامة (junk) كما في CPython؛ هنا القمامة = popular فقط
    while (
      besti > alo &&
      bestj > blo &&
      this.popular.has(b[bestj - 1]!) &&
      a[besti - 1] === b[bestj - 1]
    ) {
      besti--;
      bestj--;
      bestsize++;
    }
    while (
      besti + bestsize < ahi &&
      bestj + bestsize < bhi &&
      this.popular.has(b[bestj + bestsize]!) &&
      a[besti + bestsize] === b[bestj + bestsize]
    ) {
      bestsize++;
    }
    // تمديد بالعناصر غير الشائعة (non-junk) — مطابقة CPython
    while (
      besti > alo &&
      bestj > blo &&
      !this.popular.has(b[bestj - 1]!) &&
      a[besti - 1] === b[bestj - 1]
    ) {
      besti--;
      bestj--;
      bestsize++;
    }
    while (
      besti + bestsize < ahi &&
      bestj + bestsize < bhi &&
      !this.popular.has(b[bestj + bestsize]!) &&
      a[besti + bestsize] === b[bestj + bestsize]
    ) {
      bestsize++;
    }
    return { i: besti, j: bestj, size: bestsize };
  }

  getMatchingBlocks(): MatchingBlock[] {
    const la = this.a.length;
    const lb = this.b.length;
    const queue: [number, number, number, number][] = [[0, la, 0, lb]];
    const matching: MatchingBlock[] = [];
    while (queue.length) {
      const [alo, ahi, blo, bhi] = queue.pop()!;
      const m = this.findLongestMatch(alo, ahi, blo, bhi);
      if (m.size) {
        matching.push({ a: m.i, b: m.j, size: m.size });
        if (alo < m.i && blo < m.j) queue.push([alo, m.i, blo, m.j]);
        if (m.i + m.size < ahi && m.j + m.size < bhi)
          queue.push([m.i + m.size, ahi, m.j + m.size, bhi]);
      }
    }
    matching.sort((x, y) => x.a - y.a || x.b - y.b || x.size - y.size);
    // دمج الكتل المتجاورة كما في CPython
    let i1 = 0;
    let j1 = 0;
    let k1 = 0;
    const nonAdjacent: MatchingBlock[] = [];
    for (const m of matching) {
      if (i1 + k1 === m.a && j1 + k1 === m.b) {
        k1 += m.size;
      } else {
        if (k1) nonAdjacent.push({ a: i1, b: j1, size: k1 });
        i1 = m.a;
        j1 = m.b;
        k1 = m.size;
      }
    }
    if (k1) nonAdjacent.push({ a: i1, b: j1, size: k1 });
    nonAdjacent.push({ a: la, b: lb, size: 0 });
    return nonAdjacent;
  }

  getOpcodes(): Opcode[] {
    const opcodes: Opcode[] = [];
    let i = 0;
    let j = 0;
    for (const m of this.getMatchingBlocks()) {
      let tag: Opcode["tag"] = "equal";
      if (i < m.a && j < m.b) tag = "replace";
      else if (i < m.a) tag = "delete";
      else if (j < m.b) tag = "insert";
      if (tag) opcodes.push({ tag, i1: i, i2: m.a, j1: j, j2: m.b });
      i = m.a + m.size;
      j = m.b + m.size;
      if (m.size) opcodes.push({ tag: "equal", i1: m.a, i2: i, j1: m.b, j2: j });
    }
    return opcodes;
  }

  ratio(): number {
    const blocks = this.getMatchingBlocks();
    const matches = blocks.reduce((s, b) => s + b.size, 0);
    const t = this.a.length + this.b.length;
    return t === 0 ? 1.0 : (2 * matches) / t;
  }
}

// ─────────────────────────── normalize عربي ───────────────────────────

// Canonical diacritic/tatweel sources (text/constants) — the verse keys and the
// text/** skeleton must strip exactly the same marks, or a verified quote can
// disagree with the cleaner's own normalization.
const MARKS = new RegExp(`[${TASHKEEL_SOURCE}]`);
// eslint-disable-next-line no-misleading-character-class -- diacritical/tatweel range is intentional (match code points)
const IGNORE = new RegExp(`[${TATWEEL_SOURCE}\\u06D6-\\u06ED]`);
const PRESENTATION = /[\uFB50-\uFD3D\uFD40-\uFDFF\uFE70-\uFEFC]/;
const FARSI = /[پچژگکی]/g;
const AR_DIGITS_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function arDigitsToLatin(s: string): string {
  return s.replace(/[٠-٩]/g, (c) => AR_DIGITS_MAP[c] ?? c);
}

const LETTER_MAP: Record<string, string> = {
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ٱ: "ا",
  ى: "ي",
  ئ: "ي",
  ؤ: "و",
  ة: "ه",
};

/** حروف فقط: بلا تشكيل ولا رموز، مع توحيد الهمزات والألف المقصورة. */
export function normalizeLetters(s: string): string {
  const out: string[] = [];
  for (const ch of s) {
    if ("أإآٱ".includes(ch)) out.push("ا");
    else if ("ىئ".includes(ch)) out.push("ي");
    else if (ch === "ؤ") out.push("و");
    else if (ch === "ة") out.push("ه");
    else if (MARKS.test(ch) || IGNORE.test(ch)) continue;
    else if (/[\p{L}\p{N}]/u.test(ch)) out.push(ch);
    else if (/\s/.test(ch)) out.push(" ");
  }
  return out.join("").replace(/\s+/g, "");
}

const NUM_TOKEN = /^[([]?[٠-٩0-9]{1,3}[)\]]?$/;
const STOPWORDS = new Set(["يا", "ايها"]);

function dropStop(ws: string[]): string[] {
  return ws.filter((w) => !STOPWORDS.has(w));
}

export function wordKeys(s: string): string[] {
  const out: string[] = [];
  for (const w of s.split(/\s+/)) {
    const k = normalizeLetters(w);
    if (!k || NUM_TOKEN.test(w.trim())) continue;
    out.push(k);
  }
  return dropStop(out);
}

/** اسم سورة بلا تشكيل ولا رموز وقف. */
export function plainName(s: string): string {
  return s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").trim();
}

/** شكل مقارن للتشكيل: حرف + حركاته مرتّبة (مع توحيد السكون العثماني). */
export function clusterKey(s: string): string {
  const clusters: [string, string[]][] = [];
  for (let ch of s) {
    if (ch === "\u06e1") ch = "\u0652";
    if (ch === "\u0670") continue;
    if (/\s/.test(ch) || IGNORE.test(ch)) continue;
    if (MARKS.test(ch)) {
      if (clusters.length) clusters[clusters.length - 1]![1].push(ch);
    } else {
      const base = "أإآٱىئؤة".includes(ch) ? (LETTER_MAP[ch] ?? ch) : ch;
      clusters.push([base, []]);
    }
  }
  return clusters.map(([b, m]) => b + [...m].sort().join("")).join("");
}

// ─────────────────────────── النتائج ───────────────────────────

export type FindingSeverity = "error" | "warn" | "info";

export interface QuoteFinding {
  code: string;
  severity: FindingSeverity;
  file: string;
  line: number;
  message: string;
  excerpt: string;
  suggestion: string;
  ordinal: number;
}

export interface QuranCorpus {
  data: {
    surahs: {
      number: number;
      name: string;
      ayahs: { numberInSurah: number; text: string }[];
    }[];
  };
}

export interface HadithItem {
  book: string;
  number: number;
  text: string;
}

// ─────────────────────────── فهرس القرآن ───────────────────────────

export class QuranIndex {
  names = new Map<string, number>();
  display = new Map<number, string>();
  byId = new Map<number, string[]>();
  verseWords = new Map<string, string[]>(); // "sid:ayah"
  origWords = new Map<string, string[]>();
  byFirst = new Map<string, number[]>();
  byWord = new Map<string, number[]>();
  flat: { sid: number; ayah: number; text: string; ws: string[] }[] = [];

  constructor(corpus: QuranCorpus) {
    for (const surah of corpus.data.surahs) {
      const sid = surah.number;
      const name = surah.name.replace(/^سُورَةُ\s*/, "").trim();
      this.names.set(normalizeLetters(name), sid);
      this.display.set(sid, name);
      const verses = surah.ayahs.map((a) => a.text.replace(/\uFEFF/g, ""));
      if (sid !== 1 && verses.length) {
        const w = verses[0]!.split(/\s+/);
        const keys = w.slice(0, 4).map(normalizeLetters);
        if (keys.join(",") === "بسم,الله,الرحمن,الرحيم") {
          verses[0] = w.slice(4).join(" ");
        }
      }
      this.byId.set(sid, verses);
    }
    for (const [sid, lst] of this.byId) {
      lst.forEach((txt, idx) => {
        const keep = txt.split(/\s+/).filter((w) => normalizeLetters(w));
        this.origWords.set(`${sid}:${idx + 1}`, keep);
        this.verseWords.set(`${sid}:${idx + 1}`, keep.map(normalizeLetters));
      });
    }
    for (const [sid, lst] of this.byId) {
      lst.forEach((txt, idx) => {
        this.flat.push({ sid, ayah: idx + 1, text: txt, ws: wordKeys(txt) });
      });
    }
    this.flat.forEach((entry, i) => {
      if (entry.ws.length) {
        const first = this.byFirst.get(entry.ws[0]!);
        if (first) first.push(i);
        else this.byFirst.set(entry.ws[0]!, [i]);
      }
      for (const w of new Set(entry.ws)) {
        const l = this.byWord.get(w);
        if (l) l.push(i);
        else this.byWord.set(w, [i]);
      }
    });
  }

  resolve(name: string): number | null {
    const key = normalizeLetters(name);
    const hit = this.names.get(key);
    if (hit !== undefined) return hit;
    let best: [number, number | null] = [0.0, null];
    for (const [cand, sid] of this.names) {
      const r = new SequenceMatcher(key.split(""), cand.split("")).ratio();
      if (r > best[0]) best = [r, sid] as const;
    }
    return best[0] >= 0.72 ? best[1] : null;
  }

  /** يعيد (نصّ المقطع، تغطية) لأقرب مقطع في الآية. */
  span(sid: number, ayah: number, q: string[]): { text: string | null; coverage: number } {
    const ws = this.verseWords.get(`${sid}:${ayah}`);
    if (!ws) return { text: null, coverage: 0 };
    const sm = new SequenceMatcher(q, ws, { autojunk: false });
    const blocks = sm.getMatchingBlocks().filter((b) => b.size);
    if (!blocks.length) return { text: null, coverage: 0 };
    const cov = blocks.reduce((s, b) => s + b.size, 0) / q.length;
    const b = blocks.reduce((m, x) => (x.size > m.size ? x : m), blocks[0]!);
    const start = Math.max(0, Math.min(b.b - b.a, Math.max(0, ws.length - q.length)));
    const words = this.origWords.get(`${sid}:${ayah}`) ?? [];
    return { text: words.slice(start, start + q.length).join(" "), coverage: cov };
  }

  bestVerse(q: string[]): { coverage: number; sid: number | null; ayah: number | null } {
    let cand = new Set<number>(this.byFirst.get(q[0]!) ?? []);
    if (!cand.size) {
      const rarest = q.reduce((m, w) =>
        (this.byWord.get(w)?.length ?? Infinity) < (this.byWord.get(m)?.length ?? Infinity) ? w : m,
      );
      cand = new Set((this.byWord.get(rarest) ?? []).slice(0, 4000));
    }
    let best: { coverage: number; sid: number | null; ayah: number | null } = {
      coverage: 0,
      sid: null,
      ayah: null,
    };
    for (const i of [...cand].slice(0, 6000)) {
      const e = this.flat[i]!;
      if (!e.ws.length) continue;
      const sm = new SequenceMatcher(q, e.ws, { autojunk: false });
      const cov =
        sm
          .getMatchingBlocks()
          .filter((b) => b.size)
          .reduce((s, b) => s + b.size, 0) / q.length;
      if (cov > best.coverage) {
        best = { coverage: cov, sid: e.sid, ayah: e.ayah };
        if (cov >= 0.999) break;
      }
    }
    return best;
  }
}

// ─────────────────────────── فهرس الحديث ───────────────────────────

export class HadithIndex {
  items: HadithItem[] = [];
  orig: string[][] = [];
  keys: string[][] = [];
  rare = new Set<string>();
  index = new Map<string, number[]>();

  constructor(items: HadithItem[]) {
    this.items = items.filter((h) => h.text.length > 40);
    this.orig = this.items.map((h) => h.text.split(/\s+/).filter((w) => normalizeLetters(w)));
    this.keys = this.orig.map((ws) => ws.map(normalizeLetters));
    const df = new Map<string, number>();
    for (const ws of this.keys) for (const w of new Set(ws)) df.set(w, (df.get(w) ?? 0) + 1);
    for (const [w, c] of df) if (c <= 400) this.rare.add(w);
    this.keys.forEach((ws, i) => {
      for (const w of new Set(ws.filter((x) => this.rare.has(x)))) {
        const l = this.index.get(w);
        if (l) l.push(i);
        else this.index.set(w, [i]);
      }
    });
  }

  find(q: string[]): { coverage: number; idx: number } | null {
    if (!q.length) return null;
    const rare = [...new Set(q.filter((w) => this.rare.has(w)))].sort(
      (a, b) => (this.index.get(a)?.length ?? 0) - (this.index.get(b)?.length ?? 0),
    );
    if (!rare.length) return null;
    let cand = new Set<number>(this.index.get(rare[0]!) ?? []);
    for (const w of rare.slice(1, 3)) {
      cand = new Set([...cand].filter((i) => (this.index.get(w) ?? []).includes(i)));
      if (!cand.size) break;
    }
    if (!cand.size) return null;
    let best = { coverage: 0, idx: -1 };
    for (const i of [...cand].slice(0, 400)) {
      const ws = this.keys[i]!;
      const sm = new SequenceMatcher(q, ws, { autojunk: false });
      const cov =
        sm
          .getMatchingBlocks()
          .filter((b) => b.size)
          .reduce((s, b) => s + b.size, 0) / q.length;
      if (cov > best.coverage) {
        best = { coverage: cov, idx: i };
        if (cov >= 0.999) break;
      }
    }
    return best.idx >= 0 ? best : null;
  }
}

// ─────────────────────────── الفاحص ───────────────────────────

const VERSE_RE = /([﴿{])([^﴾}]*)([﴾}])/g;
const REF_RE = /^\s*\[([^\]]{2,80})\]/;
const HADITH_RE = /«([^»]{25,600})»/g;
const SEG_NUM = /(?<![\w\u0621-\u064A])\(?\s*([0-9\u0660-\u0669]{1,3})\s*\)?/g;

export function parseRef(ref: string): { surahName: string | null; ayah: number | null } {
  if (!ref) return { surahName: null, ayah: null };
  const t = arDigitsToLatin(ref).trim();
  const m = t.match(/^([^\d:]+?)\s*[:\s]\s*([\d\u060c,\s\-–]+)$/);
  if (!m) return { surahName: null, ayah: null };
  const ay = parseInt(m[2]!.split(/[\u060c,\-–]/)[0]!, 10);
  if (Number.isNaN(ay)) return { surahName: null, ayah: null };
  return { surahName: m[1]!.trim(), ayah: ay };
}

export function splitSegments(body: string): { num: number; txt: string; mark: string }[] | null {
  const marks = [...body.matchAll(SEG_NUM)];
  if (marks.length < 3) return null;
  const segs: { num: number; txt: string; mark: string }[] = [];
  let prev = 0;
  for (const m of marks) {
    const num = parseInt(arDigitsToLatin(m[1]!), 10);
    const txt = body
      .slice(prev, m.index!)
      .trim()
      .replace(/^[ .،؛\t]+|[ .،؛\t]+$/g, "");
    if (txt) segs.push({ num, txt, mark: m[0] });
    prev = m.index! + m[0].length;
  }
  return segs.length >= 3 ? segs : null;
}

export class QuoteChecker {
  findings: QuoteFinding[] = [];
  fixed = 0;

  constructor(
    private quran: QuranIndex,
    private hadith: HadithIndex | null,
    private fix = false,
  ) {}

  private add(
    code: string,
    severity: FindingSeverity,
    file: string,
    line: number,
    message: string,
    excerpt = "",
    suggestion = "",
    ordinal = -1,
  ) {
    this.findings.push({ code, severity, file, line, message, excerpt, suggestion, ordinal });
  }

  checkText(file: string, text: string): { findings: QuoteFinding[]; fixedText: string } {
    const lines = text.split("\n");
    const out: string[] = [];
    const headingSeen = new Map<string, number>();
    let tableCols: number | null = null;
    const lineCounts = new Map<string, number>();
    for (const l of lines)
      if (l.trim().length > 3) lineCounts.set(l.trim(), (lineCounts.get(l.trim()) ?? 0) + 1);
    const repeatFloor = Math.max(5, Math.floor(lines.length / 60));
    const linePara: number[] = [];
    let pid = 0;
    for (const l of lines) {
      linePara.push(pid);
      if (!l.trim()) pid++;
    }
    const pOpen = new Map<number, number>();
    const pClose = new Map<number, number>();
    lines.forEach((l, i) => {
      const p = linePara[i]!;
      pOpen.set(p, (pOpen.get(p) ?? 0) + (l.match(/«/g) ?? []).length);
      pClose.set(p, (pClose.get(p) ?? 0) + (l.match(/»/g) ?? []).length);
    });
    const badParaFirst = new Map<number, number>();
    lines.forEach((_l, i) => {
      const p = linePara[i]!;
      if ((pOpen.get(p) ?? 0) !== (pClose.get(p) ?? 0)) {
        if (!badParaFirst.has(p)) badParaFirst.set(p, i + 1);
      }
    });

    lines.forEach((line, idx) => {
      const ln = idx + 1;
      let newLine = line;
      const verseMatches = [...line.matchAll(VERSE_RE)];
      verseMatches.forEach((m, oi) => {
        const body = m[2]!.trim();
        let brace = m[1] === "{";
        if (brace && (body.match(/[\u0621-\u064A]+/g) ?? []).length < 4) brace = false;
        const rest = line.slice(m.index! + m[0].length, m.index! + m[0].length + 60);
        const rm = rest.match(REF_RE);
        const ref = rm ? rm[1]! : "";
        this.checkVerse(file, ln, body, ref, brace, oi);
        if (brace && this.fix) {
          newLine = newLine.replace(m[0], `﴿${m[2]}﴾`);
          this.fixed++;
        }
        void body;
      });
      if (this.hadith) {
        for (const m of line.matchAll(HADITH_RE)) {
          if (m[0].includes("﴿") || m[0].includes("قال تعالى")) continue;
          this.checkHadith(file, ln, m[1]!);
        }
      }
      newLine = this.checkHygiene(
        file,
        ln,
        newLine,
        headingSeen,
        lineCounts,
        repeatFloor,
        badParaFirst.get(linePara[idx]!) === ln,
      );
      if (newLine.trim().startsWith("|")) {
        const cols = newLine
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|").length;
        if (!/^\|[\s:\-|]+\|$/.test(newLine.trim())) {
          if (tableCols === null) tableCols = cols;
          else if (cols !== tableCols) {
            this.add(
              "T007",
              "warn",
              file,
              ln,
              `جدول بأعمدة ${cols} بعد ${tableCols}`,
              newLine.trim().slice(0, 120),
            );
          }
        }
      } else if (newLine.trim() === "") {
        tableCols = null;
      }
      out.push(newLine);
    });
    return { findings: this.findings, fixedText: out.join("\n") };
  }

  checkVerse(file: string, ln: number, body: string, ref: string, brace: boolean, ordinal = 0) {
    const q = wordKeys(body);
    if (!q.length) return;
    if (brace) {
      this.add("T001", "error", file, ln, "أقواس معقوفة { } بدل ﴿ ﴾", body, `﴿${body}﴾`, ordinal);
    }
    const { surahName, ayah } = parseRef(ref);
    const surah = surahName ? this.quran.resolve(surahName) : null;
    if (surah && ayah) {
      const segs = splitSegments(body);
      if (segs && segs[0]!.num === ayah) {
        if (this.checkSegmented(file, ln, body, surah, segs, ordinal)) return;
      }
    }
    if (!ref) {
      if (q.length >= 4) this.add("Q004", "info", file, ln, "آية بلا مرجع", body, "", ordinal);
    } else if (surah === null) {
      this.add("Q004", "warn", file, ln, `مرجع غير مفهوم: ${ref}`, body, "", ordinal);
    }
    if (surah && ayah) {
      const { text: span, coverage } = this.quran.span(surah, ayah, q);
      if (coverage >= 0.5 && span) {
        this.compareVerse(file, ln, body, surah, ayah, span, ref, ordinal);
        return;
      }
      const merged = this.mergeSpan(surah, ayah, q);
      if (merged.coverage >= 0.95 && merged.coverage > coverage + 0.25 && merged.text) {
        this.add(
          "Q005",
          "info",
          file,
          ln,
          `اقتباس متعدد الآيات (${surah}:${ayah})`,
          body,
          "",
          ordinal,
        );
        this.compareVerse(file, ln, body, surah, ayah, merged.text, ref, ordinal);
        return;
      }
      const b = this.quran.bestVerse(q);
      if (b.coverage >= 0.9 && b.sid && b.ayah) {
        const s2 = this.quran.span(b.sid, b.ayah, q);
        const name = plainName(this.quran.display.get(b.sid) ?? String(b.sid));
        this.add(
          "Q003",
          "error",
          file,
          ln,
          `المرجع الصحيح: ${name}: ${b.ayah} (المذكور: ${ref})`,
          body,
          `﴿${s2.text ?? ""}﴾ [${name}: ${b.ayah}]`,
          ordinal,
        );
      } else {
        this.add(
          "Q001",
          "error",
          file,
          ln,
          `نصّ لا يطابق ${surah}:${ayah} ولا مرجعًا آخر`,
          body,
          "",
          ordinal,
        );
      }
      return;
    }
    if (q.length >= 3) {
      const b = this.quran.bestVerse(q);
      if (b.coverage >= 0.9 && b.sid && b.ayah) {
        const merged = this.mergeSpan(b.sid, b.ayah, q);
        if (merged.coverage >= 0.95 && merged.text) {
          this.add(
            "Q005",
            "info",
            file,
            ln,
            `اقتباس متعدد الآيات (${b.sid}:${b.ayah})`,
            body,
            "",
            ordinal,
          );
          this.compareVerse(file, ln, body, b.sid, b.ayah, merged.text, ref, ordinal);
        }
      }
    }
  }

  private checkSegmented(
    file: string,
    ln: number,
    body: string,
    sid: number,
    segs: { num: number; txt: string; mark: string }[],
    ordinal: number,
  ): boolean {
    const fixed: { txt: string; mark: string; span: string | null }[] = [];
    let bad = 0;
    let missing = 0;
    for (const { num, txt, mark } of segs) {
      const q = wordKeys(txt);
      if (!q.length) return false;
      const { text: span, coverage } = this.quran.span(sid, num, q);
      if (!span || coverage < 0.6) {
        missing++;
        fixed.push({ txt, mark, span: null });
        continue;
      }
      fixed.push({ txt, mark, span });
      if (wordKeys(txt).join("") !== wordKeys(span).join("")) bad++;
    }
    if (missing) return false;
    if (bad === 0) {
      this.add(
        "Q005",
        "info",
        file,
        ln,
        `اقتباس متعدد الآيات سليم (${sid}:${segs[0]!.num}–${segs[segs.length - 1]!.num})`,
        body,
        "",
        ordinal,
      );
      return true;
    }
    const rebuilt = fixed
      .map((f) => `${f.span ?? f.txt} ${f.mark}`)
      .join(" ")
      .trim();
    this.add(
      "Q005",
      "warn",
      file,
      ln,
      `اقتباس متعدد الآيات: ${bad} مقطعًا مخالفًا (${sid}:${segs[0]!.num}–${segs[segs.length - 1]!.num})`,
      body,
      `﴿${rebuilt}﴾`,
      ordinal,
    );
    return true;
  }

  private mergeSpan(
    sid: number,
    ayah: number,
    q: string[],
  ): { text: string | null; coverage: number } {
    const lst = this.quran.byId.get(sid) ?? [];
    for (const extra of [1, 2, 3, 4, 5, 6, 7, 8]) {
      if (ayah - 1 + extra >= lst.length) break;
      const words: string[] = [];
      for (let k = 0; k <= extra; k++) {
        words.push(...lst[ayah - 1 + k]!.split(/\s+/).filter((w) => normalizeLetters(w)));
      }
      const keys = words.map(normalizeLetters);
      const sm = new SequenceMatcher(q, keys, { autojunk: false });
      const blocks = sm.getMatchingBlocks().filter((b) => b.size);
      if (!blocks.length) continue;
      const cov = blocks.reduce((s, b) => s + b.size, 0) / q.length;
      if (cov >= 0.9) {
        const b = blocks.reduce((m, x) => (x.size > m.size ? x : m), blocks[0]!);
        const start = Math.max(0, Math.min(b.b - b.a, Math.max(0, keys.length - q.length)));
        return { text: words.slice(start, start + q.length).join(" "), coverage: cov };
      }
    }
    return { text: null, coverage: 0 };
  }

  private compareVerse(
    file: string,
    ln: number,
    body: string,
    sid: number,
    ayah: number,
    span: string,
    _ref: string,
    ordinal = 0,
  ) {
    const qRaw = body.split(/\s+/).filter((w) => wordKeys(w).length);
    const sRaw = span.split(/\s+/).filter((w) => wordKeys(w).length);
    const q = qRaw.map(normalizeLetters);
    const sk = sRaw.map(normalizeLetters);
    const sm = new SequenceMatcher(q, sk, { autojunk: false });
    const replace = sm.getOpcodes().filter((o) => o.tag === "replace");
    if (replace.length) {
      const o = replace.reduce((m, x) =>
        x.i2 - x.i1 + (x.j2 - x.j1) > m.i2 - m.i1 + (m.j2 - m.j1) ? x : m,
      );
      const before = qRaw.slice(o.i1, o.i2).join(" ");
      const after = sRaw.slice(o.j1, o.j2).join(" ");
      this.add(
        "Q001",
        "error",
        file,
        ln,
        `نصّ الآية مخالف (${sid}:${ayah}): «${before}» ← «${after}»`,
        body,
        `﴿${span}﴾`,
        ordinal,
      );
      return;
    }
    const diffs: [string, string][] = [];
    for (const o of sm.getOpcodes()) {
      if (o.tag !== "equal") continue;
      for (let k = 0; k < o.i2 - o.i1; k++) {
        if (clusterKey(qRaw[o.i1 + k]!) !== clusterKey(sRaw[o.j1 + k]!)) {
          diffs.push([qRaw[o.i1 + k]!, sRaw[o.j1 + k]!]);
        }
      }
    }
    if (diffs.length) {
      const [before, after] = diffs[0]!;
      this.add(
        "Q002",
        "warn",
        file,
        ln,
        `تشكيل مخالف (${sid}:${ayah}): «${before}» ← «${after}» (${diffs.length} موضعًا)`,
        body,
        `﴿${span}﴾`,
        ordinal,
      );
    }
  }

  checkHadith(file: string, ln: number, quote: string) {
    if (!this.hadith) return;
    const q = wordKeys(quote);
    if (q.length < 5) return;
    const found = this.hadith.find(q);
    if (!found || found.coverage < 0.85) {
      this.add("H001", "info", file, ln, "حديث غير موجود في البخاري/مسلم", quote.slice(0, 80));
      return;
    }
    const item = this.hadith.items[found.idx]!;
    const ws = this.hadith.keys[found.idx]!;
    const sm = new SequenceMatcher(q, ws, { autojunk: false });
    const blocks = sm.getMatchingBlocks().filter((b) => b.size);
    const bb = blocks.reduce((m, x) => (x.size > m.size ? x : m), blocks[0]!);
    const start = Math.max(0, Math.min(bb.b - bb.a, ws.length - q.length));
    const span = this.hadith.orig[found.idx]!.slice(start, start + q.length).join(" ");
    if (wordKeys(quote).join("") !== wordKeys(span).join("")) {
      this.add(
        "H002",
        "error",
        file,
        ln,
        `نصّ حديث مخالف (${item.book} ${item.number})`,
        quote.slice(0, 80),
        span,
      );
    }
  }

  private checkHygiene(
    file: string,
    ln: number,
    line: string,
    headingSeen: Map<string, number>,
    lineCounts: Map<string, number>,
    repeatFloor: number,
    paraBad: boolean,
  ): string {
    let s = line;
    if (PRESENTATION.test(s)) {
      this.add("T002", "error", file, ln, "أشكال عرضية (ﻛ ﻻ …) بدل حروف عادية", s.slice(0, 90));
      if (this.fix) {
        s = [...s]
          .map((c) => {
            const code = c.codePointAt(0) ?? 0;
            return code >= 0xfe70 && code <= 0xfefc ? String.fromCodePoint(code - 0xfee0) : c;
          })
          .join("");
      }
    }
    if (FARSI.test(s)) {
      const bad = s.match(FARSI) ?? [];
      if (bad.length) {
        this.add(
          "T002",
          "error",
          file,
          ln,
          `حروف فارسية: ${[...new Set(bad)].join("")}`,
          s.slice(0, 90),
        );
      }
    }
    if (s.includes("\u0640")) {
      this.add("T002", "warn", file, ln, "تطويل (ـ) داخل النصّ", s.slice(0, 90));
    }
    if (paraBad) {
      this.add("T003", "warn", file, ln, "أقواس «» غير متوازنة في الفقرة", s.slice(0, 90));
    }
    if (/[\u0621-\u064A]\s+[،؛؟!]/.test(s) && !s.trimStart().startsWith("|")) {
      this.add("T004", "warn", file, ln, "مسافة قبل علامة ترقيم", s.slice(0, 90));
      if (this.fix) s = s.replace(/([\u0621-\u064A])\s+([،؛؟!])/g, "$1$2");
    }
    if (/\S {2,}\S/.test(s) && !s.trimStart().startsWith("|") && !s.trimStart().startsWith("```")) {
      this.add("T005", "warn", file, ln, "مسافة مزدوجة داخل نصّ", s.slice(0, 90));
      if (this.fix) s = s.replace(/(?<=\S) {2,}(?=\S)/g, " ");
    }
    if ((s.match(/\*\*/g) ?? []).length % 2 === 1 || s.trim() === "**") {
      this.add("T006", "warn", file, ln, "** غير متوازن", s.slice(0, 90));
    }
    if (s.length > 600 && !s.trimStart().startsWith("|")) {
      this.add("T009", "info", file, ln, `سطر طويل (${s.length} حرفًا)`, s.slice(0, 90));
    }
    const hm = s.match(/^(#{2,4})\s+(.*)$/);
    if (hm) {
      const title = hm[2]!.trim();
      if (headingSeen.has(title) && ln - headingSeen.get(title)! > 5) {
        this.add(
          "T008",
          "warn",
          file,
          ln,
          `عنوان مكرر (أول ورود: ${headingSeen.get(title)})`,
          title.slice(0, 90),
        );
      }
      if (!headingSeen.has(title)) headingSeen.set(title, ln);
    }
    const trimmed = s.trim();
    if (
      (lineCounts.get(trimmed) ?? 0) >= repeatFloor &&
      trimmed.length > 3 &&
      trimmed.length < 90 &&
      !trimmed.endsWith(":") &&
      !trimmed.endsWith("：") &&
      !/^[#|-]/.test(trimmed) &&
      !/^[٠-٩\d]+[-.)]/.test(trimmed)
    ) {
      this.add(
        "T010",
        "info",
        file,
        ln,
        `سطر مكرر ${lineCounts.get(trimmed)} مرة (تسرّب ترويسة؟)`,
        trimmed.slice(0, 90),
      );
    }
    return s;
  }
}

/** حكم كلي: error واحد على الأقل ⇒ 1 وإلا 0 (كما في الأصل). */
export function quoteExitCode(findings: QuoteFinding[]): 0 | 1 {
  return findings.some((f) => f.severity === "error") ? 1 : 0;
}
