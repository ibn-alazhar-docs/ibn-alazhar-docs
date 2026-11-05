/**
 * similarity.ts — تشابه عربي معيار + فرق مجهري (character-level diff).
 *
 * calculateArabicSimilarity: يجمع ثلاث إشارات على نص مُطبَّع (بلا تشكيل/
 * تطويل، أحرف موحّدة) حتى لا يعاقب اختلاف الضبط:
 *   - tokenScore: Dice على مجموعات الكلمات
 *   - charScore:  1 − (Levenshtein / أطول طول) على الهيكل
 *   - score:      متوسط مرجّح (0.5 token + 0.5 char)
 * ليس تشابهًا دلاليًا — أداة كشف انحراف OCR/تحريف لا حكم على المعنى.
 *
 * microscopicDiff: فرق مجهري على مستوى الحرف (LCS) يُرجع عمليات
 * equal/delete/insert مع الموضع — لأغراض التتبع الدقيق لتغييرٍ واحد.
 * محدود الطول (≤ 4000 حرف لكل طرف) حتى يبقى زمنه O(n·m) مقبولًا.
 */

import { normalizeArabicLetters, removeTashkeel, removeTatweel } from "./unicode";

export function normalizeForSimilarity(text: string): string {
  return removeTatweel(removeTashkeel(normalizeArabicLetters(text)))
    .replace(/ٱ/g, "ا") // ألف الوصلة → ألف موحّدة
    .replace(/[﴿﴾۝]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ArabicSimilarityResult {
  /** الدرجة النهائية 0..1 */
  score: number;
  tokenScore: number;
  charScore: number;
  /** طولا الهيكلين بعد التطبيع */
  lengthA: number;
  lengthB: number;
  identical: boolean;
}

function levenshtein(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  // صفّان فقط — ذاكرة O(m)
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[m]!;
}

export function calculateArabicSimilarity(a: string, b: string): ArabicSimilarityResult {
  const na = normalizeForSimilarity(a);
  const nb = normalizeForSimilarity(b);

  if (na === nb) {
    return {
      score: 1,
      tokenScore: 1,
      charScore: 1,
      lengthA: na.length,
      lengthB: nb.length,
      identical: true,
    };
  }
  if (na.length === 0 || nb.length === 0) {
    return {
      score: 0,
      tokenScore: 0,
      charScore: 0,
      lengthA: na.length,
      lengthB: nb.length,
      identical: false,
    };
  }

  const setA = new Set(na.split(" "));
  const setB = new Set(nb.split(" "));
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const tokenScore = (2 * inter) / (setA.size + setB.size);

  const dist = levenshtein(na, nb);
  const charScore = 1 - dist / Math.max(na.length, nb.length);

  const round3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    score: round3(0.5 * tokenScore + 0.5 * charScore),
    tokenScore: round3(tokenScore),
    charScore: round3(charScore),
    lengthA: na.length,
    lengthB: nb.length,
    identical: false,
  };
}

// ---------------------------------------------------------------------------
// Microscopic diff
// ---------------------------------------------------------------------------

export type DiffOpType = "equal" | "delete" | "insert";

export interface DiffOp {
  type: DiffOpType;
  /** النص المشغَّل (قد يكون حرفًا واحدًا أو سلسلة مدمجة). */
  value: string;
  /** موضع البدء في النص الأصلي (a) — لـ insert هو موضع الإدراج. */
  aIndex: number;
  /** موضع البدء في النص الجديد (b). */
  bIndex: number;
}

export interface MicroscopicDiffResult {
  ops: DiffOp[];
  /** عدد عمليات التغيير (delete + insert) كحروف. */
  changedChars: number;
  totalChars: number;
  /** نسبة التطابق الحرفي 0..1 */
  ratio: number;
}

export const MICROSCOPIC_DIFF_MAX_CHARS = 4000;

/**
 * فرق مجهري حرفي عبر LCS. يُطبَّع أولًا (نفس تطبيع التشابه) ما لم يُطلب
 * الخام صراحةً — حتى يعكس الفرق انحرافًا حقيقيًا لا اختلاف ضبط.
 */
export function microscopicDiff(
  a: string,
  b: string,
  options?: { raw?: boolean },
): MicroscopicDiffResult {
  const na = options?.raw ? a : normalizeForSimilarity(a);
  const nb = options?.raw ? b : normalizeForSimilarity(b);
  const totalChars = Math.max(na.length, nb.length);

  if (na.length > MICROSCOPIC_DIFF_MAX_CHARS || nb.length > MICROSCOPIC_DIFF_MAX_CHARS) {
    throw new Error(
      `microscopicDiff: النص يتجاوز ${MICROSCOPIC_DIFF_MAX_CHARS} حرفًا (a=${na.length}, b=${nb.length}) — قسّم النص أولًا`,
    );
  }
  if (totalChars === 0) {
    return { ops: [], changedChars: 0, totalChars: 0, ratio: 1 };
  }

  // جدول LCS — O(n·m) بحدود 4000 → 16M خلية كحد أقصى، مقبول للتدقيق.
  const n = na.length;
  const m = nb.length;
  const dp: Uint16Array[] = [];
  for (let i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        na[i] === nb[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const raw: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (na[i] === nb[j]) {
      raw.push({ type: "equal", value: na[i]!, aIndex: i, bIndex: j });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      raw.push({ type: "delete", value: na[i]!, aIndex: i, bIndex: j });
      i++;
    } else {
      raw.push({ type: "insert", value: nb[j]!, aIndex: i, bIndex: j });
      j++;
    }
  }
  while (i < n) {
    raw.push({ type: "delete", value: na[i]!, aIndex: i, bIndex: j });
    i++;
  }
  while (j < m) {
    raw.push({ type: "insert", value: nb[j]!, aIndex: i, bIndex: j });
    j++;
  }

  // دمج العمليات المتتالية من النوع نفسه
  const ops: DiffOp[] = [];
  for (const op of raw) {
    const last = ops[ops.length - 1];
    if (last && last.type === op.type) {
      last.value += op.value;
    } else {
      ops.push({ ...op });
    }
  }

  const changedChars = raw.filter((o) => o.type !== "equal").length;
  return {
    ops,
    changedChars,
    totalChars,
    ratio: Math.round((1 - changedChars / totalChars) * 1000) / 1000,
  };
}
