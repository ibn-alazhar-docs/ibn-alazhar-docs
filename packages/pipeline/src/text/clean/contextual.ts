/**
 * contextual.ts — تدقيق سياقي/نحوي قواعدي (heuristics) على النص العربي.
 *
 * ليس محلّلًا لغويًا (لا صرف/نحو كامل) — مجموعة قواعد حتمية ترصد أنماط
 * أخطاء OCR الشائعة في النحو والإملاء:
 *   1. تكرار كلمة مجاورة (تداخل سطر)
 *   2. همزة قطع على ألف وصل والعكس داخل الكلمة (إأ / أا انعكاسات)
 *   3. ألف مقصورة/ياء منتهية مختلطة للصورة نفسها في نطاق قريب
 *   4. تاء مربوطة/هاء مختلطة (ة/ه في نهاية الكلمة) لنفس الجذر تقريبًا
 *   5. تنوين على ألف (ًا) مكرر أو تنوين ضم على ألف
 *   6. «ال» منفصلة عن كلمتها بمسافة في غير موضع التعريف الصحيح (الـ X)
 *   7. أرقام عربية-هندية داخل كلمة عربية (خلط OCR)
 *   8. علامات وقف/تشكيل معلّقة على فراغ
 *
 * كل مشكلة تُرجع موضعًا (رقم سطر + مقتطف) وخطورتها — دون أي تصحيح تلقائي.
 */

export type ContextualSeverity = "critical" | "warning" | "minor";

export interface ContextualIssue {
  kind:
    | "repeated-word"
    | "hamza-swap"
    | "alif-maqsura-mix"
    | "taa-marbuta-mix"
    | "tanween-on-alif"
    | "detached-al"
    | "digit-in-word"
    | "hanging-diacritic";
  severity: ContextualSeverity;
  message: string;
  line: number;
  snippet: string;
}

export interface ContextualAuditResult {
  isValid: boolean;
  issues: ContextualIssue[];
  wordCount: number;
}

const stripTashkeel = (s: string) => s.replace(/[ً-ٰٟ-ٰۭ-ۯ]/g, "");

function push(
  issues: ContextualIssue[],
  kind: ContextualIssue["kind"],
  severity: ContextualSeverity,
  message: string,
  line: number,
  snippet: string,
) {
  issues.push({ kind, severity, message, line, snippet: snippet.slice(0, 80) });
}

export function auditContextualGrammar(text: string): ContextualAuditResult {
  const issues: ContextualIssue[] = [];
  if (!text || !text.trim()) {
    return { isValid: true, issues: [], wordCount: 0 };
  }

  const lines = text.split("\n");
  let wordCount = 0;

  // خرائط اتساق إملائي على مستوى المستند (أول ظهور يثبّت الصورة)
  const maqsuraSeen = new Map<string, { form: "ى" | "ي"; line: number }>();
  const taaSeen = new Map<string, { form: "ة" | "ه"; line: number }>();

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const line = rawLine.trim();
    if (!line) return;
    const words = line.split(/\s+/).filter(Boolean);
    wordCount += words.length;

    // 1) كلمة مكررة فورًا
    for (let k = 1; k < words.length; k++) {
      const prev = stripTashkeel(words[k - 1]!);
      const cur = stripTashkeel(words[k]!);
      if (prev.length >= 3 && prev === cur) {
        push(issues, "repeated-word", "warning", `تكرار فوري للكلمة «${cur}»`, lineNo, line);
      }
    }

    // 2) همزة/ألف منعكسة داخل الكلمة: «إأ» أو «أإ» متجاورتان
    if (/[إأ][إأ]/.test(line)) {
      push(
        issues,
        "hamza-swap",
        "warning",
        "همزتان متجاورتان (إأ/أإ) — احتمال انعكاس OCR",
        lineNo,
        line,
      );
    }

    // 5) تنوين على ألف: «ًا» على ألف (الصواب تنوين على الحرف قبل الألف غالبًا)
    if (/ًا|ٌا|ٍا/.test(line)) {
      push(
        issues,
        "tanween-on-alif",
        "minor",
        "تنوين على ألف (ًا) — يُراجع ضبط التنوين",
        lineNo,
        line,
      );
    }

    // 6) «ال» منفصلة: كلمة «ال» وحدها ثم كلمة لا تبدأ بتعريف
    for (let k = 0; k < words.length - 1; k++) {
      if (stripTashkeel(words[k]!) === "ال") {
        const next = stripTashkeel(words[k + 1]!);
        // «ال» الصحيحة تنفصل عند الوقف فقط؛ إن تلاها حرف غير شمسي/قمري واضح
        // فالاشتباه ضعيف — نكتفي بالرصد عند تكرار النمط في السطر نفسه.
        if (!/^[اأإآبتثجحخدذرزسشصضطظعفغفقكلمنهوي]/.test(next)) {
          push(
            issues,
            "detached-al",
            "minor",
            "«ال» منفصلة عن كلمة غير عربية-مبدوءة",
            lineNo,
            line,
          );
        }
      }
    }

    // 7) رقم داخل كلمة
    for (const w of words) {
      if (/[؀-ॿ]/.test(w) && /[0-9٠-٩]/.test(w)) {
        push(issues, "digit-in-word", "warning", `رقم ملتصق بكلمة: «${w}»`, lineNo, line);
        break;
      }
    }

    // 8) تشكيل معلّق على فراغ: علامة تشكيل بعد مسافة
    if (/\s[ً-ٟ]/.test(rawLine)) {
      push(issues, "hanging-diacritic", "minor", "علامة تشكيل معلّقة بعد فراغ", lineNo, line);
    }

    // 3) ألف مقصورة/ياء: نفس الهيكل بلا النهاية يظهر بالصورتين
    // نوحّد الألفات فقط (أ/إ/آ/ٱ→ا) دون مساس بالنهاية: normalizeArabicLetters
    // يحوّل ى→ي فسيُخفي الخلل الذي نبحث عنه.
    for (const w of words) {
      const clean = stripTashkeel(w)
        .replace(/[اأإآٱ]/g, "ا")
        .replace(/[^\u0600-\u06FF]/g, "");
      if (clean.length < 3) continue;
      const last = clean[clean.length - 1];
      if (last === "ى" || last === "ي") {
        const stem = clean.slice(0, -1);
        const prev = maqsuraSeen.get(stem);
        if (!prev) {
          maqsuraSeen.set(stem, { form: last, line: lineNo });
        } else if (prev.form !== last) {
          push(
            issues,
            "alif-maqsura-mix",
            "minor",
            `اختلاط ى/ي لنفس الجذع «${stem}» (سطر ${prev.line} مقابل ${lineNo})`,
            lineNo,
            line,
          );
        }
      }
      // 4) تاء مربوطة/هاء
      if (last === "ة" || last === "ه") {
        const stem = clean.slice(0, -1);
        if (stem.length >= 2) {
          const prev = taaSeen.get(stem);
          if (!prev) {
            taaSeen.set(stem, { form: last, line: lineNo });
          } else if (prev.form !== last) {
            push(
              issues,
              "taa-marbuta-mix",
              "minor",
              `اختلاط ة/ه لنفس الجذع «${stem}» (سطر ${prev.line} مقابل ${lineNo})`,
              lineNo,
              line,
            );
          }
        }
      }
    }
  });

  // إزالة التكرار الحرفي (نفس النوع+السطر)
  const seen = new Set<string>();
  const deduped = issues.filter((i) => {
    const key = `${i.kind}|${i.line}|${i.snippet}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    isValid: !deduped.some((i) => i.severity === "critical"),
    issues: deduped,
    wordCount,
  };
}

/** أسماء مستعارة لتوافق المستدعين المختلفين. */
export const checkContextualGrammar = auditContextualGrammar;
export const contextualAudit = auditContextualGrammar;
export const auditContextual = auditContextualGrammar;
