/**
 * text-cleaner.ts — منظّم «التدقيق السباعي» (7-stage audit) + واجهة textCleaner.
 *
 * المراحل بالترتيب:
 *   1. التطبيع/اليونيكود — normalizeUnicode + normalizeArabicLetters + تطويل/مسافات
 *   2. السلامة البنيوية — auditStructuralIntegrity (عناوين/ترقيم/أنابيب/تكرار)
 *   3. القواعد القرآنية — AZHAR_CORRECTION_RULES عبر applyQuranicFixes (مع عدّ الإصابات)
 *   4. التحقق العثماني — verifyQuranicText مقابل مجموعة 300 آية
 *   5. التشابه — calculateArabicSimilarity مقابل مرجع (اختياري)
 *   6. السياقي/النحوي — auditContextualGrammar
 *   7. الفرق المجهري + الحكم — microscopicDiff مقابل مرجع (اختياري) + بوابات
 *
 * الحكم: pass = لا critical في أي مرحلة، و(إن وُجد مرجع) التشابه ≥ minSimilarity.
 * النص المُنظَّف يُرجع مع التقرير حتى لا تُعيد الطبقة الرقيقة حساب مرحلة 1–3.
 */

import {
  normalizeUnicode,
  normalizeArabicLetters,
  reglueFloatingMarks,
  removeTatweel,
} from "./unicode";
import { normalizeWhitespace } from "./whitespace";
import { auditStructuralIntegrity, type StructuralAuditResult } from "./structural";
import { AZHAR_CORRECTION_RULES, applyQuranicFixes } from "./quranic";
import { verifyQuranicText, type UthmaniVerification } from "./uthmani";
import {
  calculateArabicSimilarity,
  microscopicDiff,
  MICROSCOPIC_DIFF_MAX_CHARS,
  type ArabicSimilarityResult,
  type MicroscopicDiffResult,
} from "./similarity";
import { auditContextualGrammar, type ContextualAuditResult } from "./contextual";
import { cleanArabicText } from "./index";

export interface StageResult {
  stage: number;
  name: string;
  ok: boolean;
  detail: string;
}

export interface SevenStageAuditOptions {
  /** نص مرجعي للمقارنة في المرحلتين 5 و7 (مثلًا نص موثّق أو طبعة معتمدة). */
  reference?: string;
  /** عتبة التشابه الدنيا عند وجود مرجع (افتراضي 0.85). */
  minSimilarity?: number;
  /** تطبيق إصلاحات قرآنية/بنيوية على النص المُخرَج (افتراضي true). */
  applyFixes?: boolean;
  /** عتبة مطابقة عثمانية (افتراضي 0.5). */
  uthmaniMinSimilarity?: number;
}

export interface SevenStageAuditReport {
  pass: boolean;
  cleanedText: string;
  stages: StageResult[];
  structural: StructuralAuditResult;
  quranicRuleHits: number;
  uthmani: UthmaniVerification;
  similarity: ArabicSimilarityResult | null;
  contextual: ContextualAuditResult;
  diff: MicroscopicDiffResult | null;
}

function stage1Normalize(text: string): string {
  let t = normalizeUnicode(text);
  // Removing the kashida first lets the letter pass see the letter+mark adjacency it
  // creates; otherwise the next normalization recomposes it and drifts.
  t = removeTatweel(t);
  t = reglueFloatingMarks(t);
  t = normalizeArabicLetters(t);
  t = normalizeWhitespace(t);
  return t;
}

export function runSevenStageAudit(
  raw: string,
  options: SevenStageAuditOptions = {},
): SevenStageAuditReport {
  const minSimilarity = options.minSimilarity ?? 0.85;
  const applyFixes = options.applyFixes ?? true;
  const stages: StageResult[] = [];

  // — المرحلة 1: التطبيع —
  let cleaned = stage1Normalize(raw ?? "");
  stages.push({
    stage: 1,
    name: "normalization",
    ok: cleaned.length > 0 || !(raw ?? "").trim(),
    detail: `حروف قبل/بعد: ${(raw ?? "").length} → ${cleaned.length}`,
  });

  // — المرحلة 2: البنية —
  const structural = auditStructuralIntegrity(cleaned);
  stages.push({
    stage: 2,
    name: "structural",
    ok: structural.isValid,
    detail: `عناوين ${structural.headingCount} · مرقّم ${structural.numberedCount} · مشكلات ${structural.issues.length}`,
  });

  // — المرحلة 3: القواعد القرآنية (عدّ الإصابات قبل التطبيق) —
  let quranicRuleHits = 0;
  for (const rule of AZHAR_CORRECTION_RULES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(cleaned)) quranicRuleHits++;
    rule.pattern.lastIndex = 0;
  }
  if (applyFixes) {
    cleaned = applyQuranicFixes(cleaned);
    // إصلاحات بنيوية خفيفة (إزالة صفوف الأنابيب اليتيمة) إن طُلبت
    if (structural.issues.some((i) => i.type === "orphan-pipe")) {
      cleaned = cleaned.replace(/^\s*\|\s*[-:]+\s*\|\s*$/gm, "");
    }
  }
  stages.push({
    stage: 3,
    name: "quranic-rules",
    ok: true, // القواعد إصلاح لا فشل — الفشل يُحكم عليه في المرحلة 4
    detail: `قواعد أصابت النص: ${quranicRuleHits} من ${AZHAR_CORRECTION_RULES.length}`,
  });

  // — المرحلة 4: التحقق العثماني —
  const uthmani = verifyQuranicText(cleaned, options.uthmaniMinSimilarity ?? 0.5);
  const hasQuranicMarks = cleaned.includes("﴿");
  const uthmaniOk = !hasQuranicMarks || uthmani.unmatchedQuranicSpans.length === 0;
  stages.push({
    stage: 4,
    name: "uthmani-verification",
    ok: uthmaniOk,
    detail: hasQuranicMarks
      ? `مطابقات ${uthmani.matches.length} (تامة ${uthmani.exactCount}) · مقاطع غير موثّقة ${uthmani.unmatchedQuranicSpans.length}`
      : "لا علامات قرآنية في النص — التحقق غير مطبق",
  });

  // — المرحلة 5: التشابه مقابل مرجع —
  let similarity: ArabicSimilarityResult | null = null;
  if (options.reference !== undefined) {
    similarity = calculateArabicSimilarity(cleaned, options.reference);
    stages.push({
      stage: 5,
      name: "similarity",
      ok: similarity.score >= minSimilarity,
      detail: `التشابه ${similarity.score} (≥ ${minSimilarity}) · كلمات ${similarity.tokenScore} · حروف ${similarity.charScore}`,
    });
  } else {
    stages.push({
      stage: 5,
      name: "similarity",
      ok: true,
      detail: "لا مرجع مقدَّم — المرحلة تخطّي (لا تُسقط الحكم)",
    });
  }

  // — المرحلة 6: السياقي/النحوي —
  const contextual = auditContextualGrammar(cleaned);
  const contextualOk = !contextual.issues.some((i) => i.severity === "critical");
  stages.push({
    stage: 6,
    name: "contextual-grammar",
    ok: contextualOk,
    detail: `كلمات ${contextual.wordCount} · مشكلات ${contextual.issues.length} (${contextual.issues.filter((i) => i.severity === "warning").length} تحذير)`,
  });

  // — المرحلة 7: الفرق المجهري + الحكم —
  let diff: MicroscopicDiffResult | null = null;
  if (
    options.reference !== undefined &&
    cleaned.length <= MICROSCOPIC_DIFF_MAX_CHARS &&
    options.reference.length <= MICROSCOPIC_DIFF_MAX_CHARS
  ) {
    diff = microscopicDiff(cleaned, options.reference);
    stages.push({
      stage: 7,
      name: "microscopic-diff",
      ok: diff.ratio >= minSimilarity,
      detail: `حروف متغيرة ${diff.changedChars}/${diff.totalChars} · نسبة التطابق ${diff.ratio}`,
    });
  } else {
    stages.push({
      stage: 7,
      name: "microscopic-diff",
      ok: true,
      detail:
        options.reference === undefined
          ? "لا مرجع — الفرق تخطّي"
          : `النص يتجاوز حد الفرق المجهري (${MICROSCOPIC_DIFF_MAX_CHARS} حرف) — تخطّي موثّق`,
    });
  }

  const pass = stages.every((s) => s.ok);
  return {
    pass,
    cleanedText: cleaned,
    stages,
    structural,
    quranicRuleHits,
    uthmani,
    similarity,
    contextual,
    diff,
  };
}

/**
 * textCleaner — واجهة موحّدة: تنظيف كامل (عبر cleanArabicText مع الخيارات
 * القرآنية/البنيوية) أو تدقيق سباعي كامل.
 */
export const textCleaner = {
  /** تنظيف نص OCR بإعدادات ابن الأزهر (تطبيع + بنية + اختياريًا قرآني). */
  clean(
    text: string,
    options?: { quranicFixes?: boolean; structuralFixes?: boolean; confidence?: number },
  ): string {
    return cleanArabicText(text, {
      quranicFixes: options?.quranicFixes ?? false,
      structuralFixes: options?.structuralFixes ?? false,
      confidence: options?.confidence,
    });
  },
  /** التدقيق السباعي الكامل مع تقرير مرحلي. */
  audit(text: string, options?: SevenStageAuditOptions): SevenStageAuditReport {
    return runSevenStageAudit(text, options);
  },
  /** اختصار: تنظيف + تدقيق في خطوة واحدة. */
  cleanAndAudit(
    text: string,
    options?: SevenStageAuditOptions & { quranicFixes?: boolean },
  ): SevenStageAuditReport {
    const preCleaned = textCleaner.clean(text, {
      quranicFixes: options?.quranicFixes ?? true,
      structuralFixes: true,
    });
    return runSevenStageAudit(preCleaned, options);
  },
};

export type TextCleaner = typeof textCleaner;
