/**
 * uthmani.ts — مجموعة بيانات عثمانية (300 آية) + مطابقة/تحقق.
 *
 * المصدر: AlQuran Cloud API — edition `quran-uthmani` (نص عثماني برواية حفص
 * عن عاصم، قائم على بيانات Tanzil). جُلبت الآليًا وقت التنفيذ؛ انظر
 * `uthmani-data.json` بجانب هذا الملف.
 * التغطية: الفاتحة كاملة (7) + البقرة كاملة (286) + آل عمران 1–7 = 300 آية.
 * ليست المصحف كاملًا (6236 آية) — عيّنة تدقيق مقصودة، قابلة للتوسيع بإعادة
 * الجلب لنفس المصدر.
 *
 * المطابقة تتم على هيكل مُطبَّع (بلا تشكيل/تطويل، توحيد ألف/ياء/كاف) حتى لا
 * تُسقط اختلافات الضبط الحكم على نص OCR صحيح، لكن التحقق يُرجع النص الأصلي.
 */

import { normalizeArabicLetters, removeTashkeel, removeTatweel } from "./unicode";
import rawDataset from "./uthmani-data.json" with { type: "json" };

export interface UthmaniAyah {
  surah: number;
  ayah: number;
  text: string;
}

export const UTHMANI_SOURCE =
  "AlQuran Cloud API (quran-uthmani, Tanzil-based, Hafs 'an 'Asim) — fetched 2026-11-05";

export const UTHMANI_DATASET: readonly UthmaniAyah[] = rawDataset as UthmaniAyah[];

/** هيكل المقارنة: بلا تشكيل ولا تطويل، أحرف موحّدة، مسافات مضغوطة. */
export function uthmaniSkeleton(text: string): string {
  return removeTatweel(removeTashkeel(normalizeArabicLetters(text)))
    .replace(/ٱ/g, "ا") // ألف الوصلة → ألف وصل موحّدة
    .replace(/[﴿﴾۝]/g, "") // علامات زخرفية لا تدخل في المطابقة
    .replace(/\s+/g, " ")
    .trim();
}

export function getUthmaniAyah(surah: number, ayah: number): UthmaniAyah | undefined {
  return UTHMANI_DATASET.find((e) => e.surah === surah && e.ayah === ayah);
}

export interface UthmaniMatch {
  surah: number;
  ayah: number;
  reference: string;
  /** تشابه الهيكلين 0..1 (توافق كلمات / اتحادها). */
  skeletonSimilarity: number;
  exact: boolean;
}

function tokenSet(skeleton: string): Set<string> {
  return new Set(skeleton.split(" ").filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

const INDEX: { entry: UthmaniAyah; skeletonTokens: Set<string>; skeleton: string }[] =
  UTHMANI_DATASET.map((entry) => {
    const skeleton = uthmaniSkeleton(entry.text);
    return { entry, skeletonTokens: tokenSet(skeleton), skeleton };
  });

/**
 * إيجاد آيات المجموعة التي تشبه النص المعطى.
 * يرشّح بالطول أولًا (نافذة ±40% من عدد كلمات الآية) ثم بالتشابه.
 */
export function findUthmaniMatches(text: string, minSimilarity = 0.5): UthmaniMatch[] {
  const query = uthmaniSkeleton(text);
  if (!query) return [];
  const qTokens = tokenSet(query);
  const matches: UthmaniMatch[] = [];

  for (const { entry, skeletonTokens, skeleton } of INDEX) {
    // ترشيح سريع: تداخل واضح في الكلمات قبل حساب كامل
    let overlap = 0;
    for (const t of qTokens) if (skeletonTokens.has(t)) overlap++;
    if (overlap === 0) continue;
    const sim = jaccard(qTokens, skeletonTokens);
    if (sim >= minSimilarity) {
      matches.push({
        surah: entry.surah,
        ayah: entry.ayah,
        reference: entry.text,
        skeletonSimilarity: Math.round(sim * 1000) / 1000,
        exact: skeleton === query,
      });
    }
  }
  return matches.sort((x, y) => y.skeletonSimilarity - x.skeletonSimilarity);
}

export interface UthmaniVerification {
  /** آيات وُجدت مطابقة (أو قريبة) في النص. */
  matches: UthmaniMatch[];
  /** مقاطع تبدو قرآنية (بين ﴿ ﴾) ولا تطابق أي آية في المجموعة فوق العتبة. */
  unmatchedQuranicSpans: string[];
  /** عدد الآيات المطابقة بدقة تامة على الهيكل. */
  exactCount: number;
}

const QURANIC_SPAN = /﴿([^﴾]{3,})﴾/g;

/** التحقق من النص القرآني داخل مستند بدرجات: مطابقة تامة / قريبة / غير موثّقة. */
export function verifyQuranicText(text: string, minSimilarity = 0.5): UthmaniVerification {
  const matches = findUthmaniMatches(text, minSimilarity);
  const exactCount = matches.filter((m) => m.exact).length;

  const unmatchedQuranicSpans: string[] = [];
  if (text.includes("﴿")) {
    QURANIC_SPAN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = QURANIC_SPAN.exec(text)) !== null) {
      const span = m[1]!.trim();
      if (findUthmaniMatches(span, minSimilarity).length === 0) {
        unmatchedQuranicSpans.push(span);
      }
    }
  }

  return { matches, unmatchedQuranicSpans, exactCount };
}
