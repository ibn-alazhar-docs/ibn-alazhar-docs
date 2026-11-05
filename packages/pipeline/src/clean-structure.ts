/**
 * clean-structure.ts — إصلاح المشاكل البنيوية المتكررة في Markdown عربي.
 *
 * نقل من SKILLS/arabic-pdf-to-book/scripts/clean_structure.py.
 * الإصلاحات (آمنة، تُطبَّق فقط عند تحقّق الشرط):
 *   S1 سطر ترويسة متسرّب: قصير (<40) يتكرر ≥20 مرة وليس عنوانًا/بندًا → يُبقى أول ورود
 *   S2 `**` مفرد كسطر كامل
 *   S3 مسافات بادئة/لاحقة في العناوين + `**` زائدة في نهاية عنوان
 *   S4 سطران متطابقان متتاليان (تكرار فوري)
 *   S5 `**` مفرد داخل السطر
 *   S6 «» غير متوازنة داخل السطر
 *   S7 توحيد أعمدة الجدول على عدد رأس الجدول
 *   S8 تقسيم الأسطر الطويلة جدًا (>600) عند حدود الجُمل إلى ≤500
 */

export interface CleanStructureResult {
  lines: string[];
  stats: Record<string, number>;
}

export function cleanStructure(lines: string[]): CleanStructureResult {
  const stats: Record<string, number> = {};
  const bump = (k: string) => {
    stats[k] = (stats[k] ?? 0) + 1;
  };
  const counts = new Map<string, number>();
  for (const l of lines) if (l.trim()) counts.set(l.trim(), (counts.get(l.trim()) ?? 0) + 1);

  const headerLeak = (s: string): boolean => {
    const t = s.trim();
    return (
      (counts.get(t) ?? 0) >= 20 &&
      t.length > 3 &&
      t.length < 40 &&
      !/^[#|\-*>]/.test(t) &&
      !/[:：]$/.test(t) &&
      !/^[٠-٩\d]+[-.)]/.test(t) &&
      !/[.!؟]$/.test(t)
    );
  };

  const out: string[] = [];
  const seenLeak = new Set<string>();
  let prev: string | null = null;
  let tableCols: number | null = null;

  for (let line of lines) {
    const st = line.trim();
    // S7: توحيد أعمدة الجدول
    if (st.startsWith("|")) {
      const cells = st.replace(/^\||\|$/g, "").split("|");
      if (tableCols === null) {
        tableCols = cells.length;
      } else if (!/^\|[:\-\s|]+\|$/.test(st) && cells.length !== tableCols) {
        let fixed = cells;
        if (fixed.length < tableCols!)
          fixed = [...fixed, ...Array(tableCols! - fixed.length).fill("")];
        else fixed = [...fixed.slice(0, tableCols! - 1), fixed.slice(tableCols! - 1).join(" ")];
        line = `|${fixed.join("|")}|`;
        bump("S7");
      }
    } else {
      tableCols = null;
    }
    // S8: تقسيم الأسطر الطويلة جدًا عند حدود الجُمل
    if (line.length > 600 && !st.startsWith("|") && !st.startsWith("```")) {
      const parts = line.split(/(?<=[.؟!۔])\s+/);
      const chunks: string[] = [];
      let buf = "";
      for (const seg of parts) {
        if (buf && buf.length + seg.length > 500) {
          chunks.push(buf.trim());
          buf = seg;
        } else {
          buf = (buf + " " + seg).trim();
        }
      }
      if (buf) chunks.push(buf);
      if (chunks.length > 1) {
        out.push(...chunks);
        bump("S8");
        prev = chunks[chunks.length - 1]!.trim();
        continue;
      }
    }
    // S5: ** مفرد داخل السطر
    if ((line.match(/\*\*/g) ?? []).length % 2 === 1) {
      line = line.replace(/\*\*/g, "");
      bump("S5");
    }
    // S6: «» غير متوازنة
    const open = (line.match(/«/g) ?? []).length;
    const close = (line.match(/»/g) ?? []).length;
    if (open > close) {
      line = line + "»".repeat(open - close);
      bump("S6");
    } else if (close > open) {
      line = "«".repeat(close - open) + line;
      bump("S6");
    }
    const s = line.trim();
    if (s && headerLeak(s)) {
      if (seenLeak.has(s)) {
        bump("S1");
        continue;
      }
      seenLeak.add(s);
    }
    if (s === "**") {
      bump("S2");
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      let fixed = line.replace(/\s+$/, "");
      fixed = fixed.replace(/\*\*\s*$/, "");
      if (fixed !== line) {
        bump("S3");
        line = fixed;
      }
    }
    if (s && s === prev) {
      bump("S4");
      continue;
    }
    out.push(line);
    prev = s;
  }
  return { lines: out, stats };
}

/** نسخة نصّية مريحة: md → { md, stats }. */
export function cleanStructureText(md: string): { md: string; stats: Record<string, number> } {
  const { lines, stats } = cleanStructure(md.split("\n"));
  return { md: lines.join("\n"), stats };
}
