/**
 * booklet.ts — هيكلية البوكليت (أسئلة/فروع/خيارات) + explode() للاختيارات اللاصقة.
 *
 * نقل من SKILLS/arabic-pdf-to-book/scripts/docx_engine.py:
 * - explode() (السطر ~855): يفصل الخيارات المدمجة في سطر واحد
 *   «١- … -٢ …» / «1- … 2- …» / «(خيار - خيار)» إلى أسطر مستقلّة.
 * - splitNumbered / isMainQuestion / isQuestion / isInstruction / isAnswer
 *   (الأسطر ~709-784) — نفس التعريفات حرفيًا.
 * - آلة الحالة في render_booklet()/handle() (~1028-1130): الأنواع
 *   section/main/item/option/sub/subhead/instruction/answer/body،
 *   وعلَم s_main: سؤال موسوم بـ«س٢:» في المصدر ⇒ البنود المرقّمة التي بعده
 *   بنوده لا أسئلة رئيسية جديدة (وإلا انقلب كل بند فعلَ تكليف سؤالًا رئيسيًا).
 *
 * الناتج بنية Block[] نقية (لا python-docx) — الطبقة الرقيقة في book-factory
 * تحوّلها إلى Markdown موسوم (س١: …) ثم عبر pandoc، أو إلى IR.
 */

import { TASHKEEL } from "./text/constants";

export const LETTERS = "أبجدهوزحطيكلمنسعفصقرشتثخذضظغ";
export const ORDINALS = [
  "",
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
  "الثالث عشر",
  "الرابع عشر",
  "الخامس عشر",
  "السادس عشر",
  "السابع عشر",
  "الثامن عشر",
  "التاسع عشر",
  "العشرون",
];

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EN_DIGITS = "0123456789";

export function arNum(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => AR_DIGITS[EN_DIGITS.indexOf(d)]!);
}

export function toArDigits(t: string): string {
  return t.replace(/(?<![A-Za-z٠-٩])[0-9]+(?![A-Za-z])/g, (m) =>
    m
      .split("")
      .map((d) => AR_DIGITS[EN_DIGITS.indexOf(d)]!)
      .join(""),
  );
}

export function stripTashkeel(s: string): string {
  return s.replace(TASHKEEL, "");
}

export function isInstruction(line: string): boolean {
  const s = stripTashkeel(line.trim());
  return /^(?:أولا|ثانيا|ثالثا|رابعا|خامسا|سادسا|سابعا|ثامنا|تاسعا|عاشرا|النشاط|نشاط)(?:\s*\([٠-٩\d]+\))?\s*[:：]/.test(
    s,
  );
}

export function isQuestion(line: string): boolean {
  return /^(?:س\s*[٠-٩\d]+|السؤال\s+[٠-٩\d]+)\s*[:：.-]/.test(line.trim());
}

const NUM_TAIL = /^\s*([٠-٩\d]{1,2})\s*(?:[-–—]|[.)])\s*(\S.*)$/;
const NUM_HEAD = /^\s*[-–—]\s*([٠-٩\d]{1,2})\s+(\S.*)$/;

/** يفكّ ترقيم البند: يعيد (الرقم، النص) أو null لأي سطر غير مرقّم. */
export function splitNumbered(line: string): { num: string; body: string } | null {
  const m = line.match(NUM_TAIL) ?? line.match(NUM_HEAD);
  return m ? { num: m[1]!, body: m[2]!.trim() } : null;
}

const COMMAND =
  /^(?:اختر|ختر|تخير|ضع|علل|علم|عين|اذكر|هات|ماذا|متى|أين|كيف|لماذا|ما|من|بين|عرف|أكمل|اكمل|أجب|اجب|استخرج|صحح|صوب|فسر|اشرح|قارن|ميز|حدد|ارسم|أعد|اعد|صوغ|حول|صل|ناقش|علق|استنتج|استخلص|وضح|ادرس|بيّن|ميّز|حدّد|علّم|أدخل|ادخل|اجمع|قال|يقال|يا|مثل|صف|صغ|أسند|اقرأ|اكتب|لخص|طبق|حل|أعرب|عيّن|دلل|استدل|أورد|أذكر|أحضر|قم|صمم|انقل|ترجم|أتم)/;
const QUOTED = /^\s*[«﴿[({]/;

export function isMainQuestion(body: string): boolean {
  const b = stripTashkeel(body).trim();
  if (!b) return false;
  if (/[؟?:：]$/.test(b)) return true;
  if (QUOTED.test(b)) return false;
  return COMMAND.test(b);
}

export function isAnswer(line: string): boolean {
  const s = line.trim();
  return (
    /^(?:التعليل|الليل|القائل|الإجابة|الجواب|الدليل)\b/.test(s) ||
    /^(?:التعليل|القائل|الإجابة)\s*(?:إن وجد)?\s*[:：]/.test(s)
  );
}

// ─────────────────────────── explode() ───────────────────────────

const OPT_MARK = /(?:^|(?<=[\s.،]))(?:-\s*([٠-٩\d]{1,2})|([٠-٩\d]{1,2})\s*-)\s+/g;

/**
 * يفصل الخيارات المدمجة داخل سطر واحد إلى أسطر مستقلّة.
 * يدعم: «(خيار - خيار)»، «١- … -٢ …»، «1- … 2- …» (بمسافات حول الشرطة أيضًا).
 */
export function explode(s: string): string[] {
  const text = s.trim();
  const paren = text.match(/^\((.*?)\)\s*\.?$/);
  if (paren && paren[1]!.includes(" - ")) {
    const parts = paren[1]!
      .split(" - ")
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts.map((x) => `- ${x}`);
  }
  const marks = [...text.matchAll(OPT_MARK)];
  if (marks.length >= 2) {
    const parts: string[] = [];
    marks.forEach((mk, k) => {
      const end = k + 1 < marks.length ? marks[k + 1]!.index! : text.length;
      const body = text
        .slice(mk.index! + mk[0].length, end)
        .trim()
        .replace(/^[ .،\t]+|[ .،\t]+$/g, "");
      const num = mk[1] ?? mk[2];
      parts.push(num ? `${num}- ${body}` : body);
    });
    return parts.filter(Boolean);
  }
  return [text];
}

// ─────────────────────────── آلة حالة البوكليت ───────────────────────────

export type BookletKind =
  | "title"
  | "source"
  | "section"
  | "h3"
  | "instruction"
  | "main"
  | "item"
  | "option"
  | "sub"
  | "subhead"
  | "answer"
  | "body"
  | "table";

export interface BookletBlock {
  kind: BookletKind;
  /** التسمية المرئية: س١: / ٢- / أ) … */
  label: string;
  text: string;
}

const TERM = /[.،؛:!؟»﴾)\]]\s*$/;

export interface ParsedBooklet {
  title: string;
  source: string;
  blocks: BookletBlock[];
}

/**
 * يفسّر Markdown بوكليت إلى Blocks هرمية — مقابل handle() في الأصل.
 * الاختلاف المقصود: لا يبني DOCX هنا؛ ينتج بنية نقية قابلة للاختبار والتحويل.
 */
export function parseBooklet(
  md: string,
  opts: { title?: string; header?: string } = {},
): ParsedBooklet {
  const lines = md.split(/\r?\n/);
  let docTitle = opts.title ?? "";
  let source = "";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i]!.trim();
    if (!s) continue;
    if (s.startsWith("# ")) {
      if (!docTitle) docTitle = s.slice(2).trim();
      bodyStart = i + 1;
      continue;
    }
    if (s.startsWith("> ")) {
      source = s.slice(2).trim().replace(/\*\*/g, "");
      bodyStart = i + 1;
      continue;
    }
    if (s === "---" || s === "***") {
      bodyStart = i + 1;
      continue;
    }
    bodyStart = i;
    break;
  }
  docTitle = docTitle || "بوكليت";
  if (source) source = toArDigits(source);

  const blocks: BookletBlock[] = [{ kind: "title", label: "", text: docTitle }];
  if (source) blocks.push({ kind: "source", label: "", text: source });

  const st = {
    kind: "body" as BookletKind | null,
    main: 0,
    item: 0,
    opt: 0,
    stem: false,
    sMain: false,
    last: -1,
    lastSize: 13,
  };

  const newMain = (txt: string) => {
    st.main++;
    st.item = 0;
    st.opt = 0;
    st.stem = false;
    blocks.push({ kind: "main", label: `س${arNum(st.main)}:`, text: toArDigits(txt) });
    st.kind = "main";
    st.last = blocks.length - 1;
    st.lastSize = 13.5;
  };
  const newItem = (txt: string) => {
    st.item++;
    st.opt = 0;
    st.stem = false;
    blocks.push({ kind: "item", label: `${arNum(st.item)}-`, text: toArDigits(txt) });
    st.kind = "item";
    st.last = blocks.length - 1;
    st.lastSize = 12.8;
  };
  const newOption = (txt: string, label?: string) => {
    let lab: string;
    if (label === undefined) {
      st.opt++;
      lab = st.opt <= LETTERS.length ? LETTERS[st.opt - 1]! : String(st.opt);
    } else if (label.length <= 2 && /^[٠-٩\d]+$/.test(label)) {
      st.opt = parseInt(
        label.replace(/[٠-٩]/g, (d) => String(EN_DIGITS.indexOf(AR_DIGITS[EN_DIGITS.indexOf(d)]!))),
        10,
      );
      lab = arNum(st.opt);
    } else {
      lab = label;
    }
    blocks.push({ kind: "option", label: `${lab})`, text: toArDigits(txt) });
    st.kind = "option";
    st.last = blocks.length - 1;
    st.lastSize = 12.5;
  };
  const newStem = (txt: string) => {
    st.stem = true;
    st.opt = 0;
    blocks.push({ kind: "sub", label: "", text: toArDigits(txt) });
    st.kind = "sub";
    st.last = blocks.length - 1;
    st.lastSize = 12.8;
  };
  const continuation = (txt: string) => {
    const prev = st.last >= 0 ? blocks[st.last]!.text.trim() : "";
    if (
      st.last < 0 ||
      (TERM.test(prev) && !prev.endsWith("،") && !prev.endsWith("؛") && !prev.endsWith(":"))
    ) {
      blocks.push({ kind: "body", label: "", text: toArDigits(txt) });
      st.last = blocks.length - 1;
      st.kind = "body";
      return;
    }
    blocks[st.last]!.text += ` ${toArDigits(txt)}`;
  };
  const flushTableMarker = () => {
    /* الجداول تُجمع كأسطر في الطبقة العليا؛ هنا تُمرّر كما body */
  };
  void flushTableMarker;

  const handle = (raw: string) => {
    let s = raw.trim();
    s = s.replace(/﴾(?=\[)/g, "﴾ ");
    s = s.replace(/\](?=﴿)/g, "] ");
    if (s.startsWith("## ")) {
      let head = s.slice(3).trim();
      const m = head.match(/^(\d+)[.)]\s*(.*)$/);
      if (m) {
        const n = parseInt(m[1]!, 10);
        const rest = m[2]!.trim();
        if (/^الدرس\s*[٠-٩\d]*$/.test(rest)) {
          head = `الدرس ${n > 0 && n < ORDINALS.length ? ORDINALS[n]! : arNum(n)}`;
        } else if (rest) {
          head = rest;
        }
      }
      blocks.push({ kind: "section", label: "", text: toArDigits(head) });
      Object.assign(st, {
        kind: "section" as BookletKind,
        stem: false,
        sMain: false,
        main: 0,
        item: 0,
        opt: 0,
        last: -1,
      });
      return;
    }
    if (s.startsWith("### ")) {
      blocks.push({ kind: "h3", label: "", text: toArDigits(s.slice(4).trim()) });
      st.kind = "section";
      st.last = -1;
      return;
    }
    if (isInstruction(s)) {
      blocks.push({ kind: "instruction", label: "", text: toArDigits(s) });
      st.kind = "instruction";
      st.stem = false;
      st.sMain = false;
      st.last = -1;
      return;
    }
    if (isQuestion(s)) {
      const body = s
        .replace(/^[^:：]*[:：]\s*/, "")
        .replace(/^[([]?\s*[${LETTERS}]\s*[)\]]\s*/, "");
      newMain(body);
      // سؤال موسوم بـ«س٢:» في المصدر: البنود المرقّمة التي بعده بنوده
      st.sMain = true;
      return;
    }
    if (new RegExp(`^[\\(\\[]\\s*[${LETTERS}]ـ?\\s*[\\)\\]]`).test(s)) {
      newStem(s);
      return;
    }
    if (isAnswer(s)) {
      blocks.push({ kind: "answer", label: "", text: toArDigits(s) });
      st.kind = "answer";
      st.stem = false;
      st.last = -1;
      return;
    }
    if (new RegExp(`^[${LETTERS}]ـ?\\s*[-–]\\s+`).test(s)) {
      newStem(s.replace(new RegExp(`^[${LETTERS}]ـ?\\s*[-–]\\s+`), ""));
      return;
    }
    if (
      (new RegExp(`^[${LETTERS}]ـ?\\s*[\\)\\]]\\s*`).test(s) && s.endsWith(":")) ||
      (new RegExp(`^[${LETTERS}]ـ?\\s*[\\)\\]]\\s*`).test(s) && s.endsWith("："))
    ) {
      newStem(s);
      return;
    }
    const letterOpt = s.match(new RegExp(`^[\\(\\{]?\\s*([${LETTERS}]ـ?)\\s*[\\)]\\s+(.*)$`));
    if (letterOpt && ["main", "item", "option", "stem", "sub", "subhead"].includes(st.kind ?? "")) {
      newOption(letterOpt[2]!, letterOpt[1]!);
      return;
    }
    const split = splitNumbered(s);
    if (split) {
      const body = toArDigits(split.body);
      if (st.sMain) {
        // داخل سؤال «س٢:»: البند المرقّم فرع/خيار له
        if (st.stem && ["stem", "option", "sub", "subhead"].includes(st.kind ?? "")) {
          newOption(body, split.num);
        } else {
          newItem(body);
        }
      } else if (isMainQuestion(split.body)) {
        newMain(body);
      } else if (st.stem && ["stem", "option", "sub", "subhead"].includes(st.kind ?? "")) {
        newOption(body, split.num);
      } else {
        newItem(body);
      }
      return;
    }
    if (/^[-•]\s+/.test(s)) {
      let body = s.replace(/^[-•]\s+/, "");
      const num = body.match(/^([٠-٩\d]{1,2})\s*-\s+/);
      const label = num ? num[1] : undefined;
      body = body.replace(/^[٠-٩\d]{1,2}\s*-\s+/, "");
      body = toArDigits(body);
      const short = body.length < 75 && !/[؟?]$/.test(body.trimEnd());
      if (st.stem && ["stem", "option", "sub", "subhead"].includes(st.kind ?? "")) {
        newOption(body, label);
      } else if (["item", "main", "option"].includes(st.kind ?? "") && short) {
        newOption(body, label);
      } else {
        newItem(body);
      }
      return;
    }
    continuation(s);
  };

  let tableRows: string[] = [];
  const flushTable = () => {
    if (tableRows.length) {
      blocks.push({ kind: "table", label: "", text: tableRows.join("\n") });
      tableRows = [];
    }
  };

  for (const raw of lines.slice(bodyStart)) {
    const s = raw.trim();
    if (!s || s === "---" || s === "***" || s === "___" || s === "-" || /PAGEBREAK/i.test(s)) {
      flushTable();
      continue;
    }
    if (/^[٠-٩\d]{1,3}$/.test(s)) continue;
    if (s.includes("|")) {
      tableRows.push(s);
      continue;
    }
    flushTable();
    for (const piece of explode(s)) handle(piece);
  }
  flushTable();
  return { title: docTitle, source, blocks };
}

/** يولّد Markdown موسومًا يحفظ التسلسل الهرمي (س١: / ١- / أ)) قبل pandoc. */
export function renderBookletMarkdown(parsed: ParsedBooklet): string {
  const out: string[] = [];
  for (const b of parsed.blocks) {
    switch (b.kind) {
      case "title":
        out.push(`# ${b.text}`);
        break;
      case "source":
        out.push(`> ${b.text}`);
        break;
      case "section":
        out.push(`## ${b.text}`);
        break;
      case "h3":
        out.push(`### ${b.text}`);
        break;
      case "main":
        out.push(`${b.label} ${b.text}`);
        break;
      case "item":
        out.push(`${b.label} ${b.text}`);
        break;
      case "option":
        out.push(`${b.label} ${b.text}`);
        break;
      case "sub":
        out.push(b.text);
        break;
      case "subhead":
        out.push(b.text);
        break;
      case "answer":
        out.push(b.text);
        break;
      case "table":
        out.push(b.text);
        break;
      default:
        out.push(b.text);
    }
  }
  return out.join("\n\n") + "\n";
}
