import { describe, it, expect } from "vitest";
import {
  normalizeForSimilarity,
  calculateArabicSimilarity,
  microscopicDiff,
  MICROSCOPIC_DIFF_MAX_CHARS,
} from "@ibn-al-azhar-docs/pipeline/text";

describe("normalizeForSimilarity", () => {
  it("unifies alef/ya/kaf and strips tashkeel", () => {
    expect(normalizeForSimilarity("أحمدَ إلى")).toBe(normalizeForSimilarity("احمد الي"));
  });
});

describe("calculateArabicSimilarity", () => {
  it("returns 1 for identical text", () => {
    const r = calculateArabicSimilarity("بسم الله الرحمن الرحيم", "بسم الله الرحمن الرحيم");
    expect(r.score).toBe(1);
    expect(r.identical).toBe(true);
  });

  it("returns 1 when only tashkeel differs", () => {
    const r = calculateArabicSimilarity("بِسْمِ اللَّهِ", "بسم الله");
    expect(r.score).toBe(1);
  });

  it("returns 0 for empty vs non-empty", () => {
    expect(calculateArabicSimilarity("", "نص").score).toBe(0);
    expect(calculateArabicSimilarity("", "").score).toBe(1);
  });

  it("scores a one-word change high but below 1, in (0.5, 1)", () => {
    const r = calculateArabicSimilarity(
      "إن الله مع الصابرين في الدنيا والآخرة",
      "إن الله مع الصابرين في الدنيا والعقبي",
    );
    expect(r.score).toBeGreaterThan(0.5);
    expect(r.score).toBeLessThan(1);
    expect(r.tokenScore).toBeGreaterThan(0);
    expect(r.charScore).toBeGreaterThan(0);
  });

  it("scores unrelated texts low", () => {
    const r = calculateArabicSimilarity(
      "الفقه الإسلامي علم يبحث في الأحكام الشرعية العملية",
      "الحمد لله رب العالمين والصلاة والسلام على رسول الله",
    );
    expect(r.score).toBeLessThan(0.6);
  });
});

describe("microscopicDiff", () => {
  it("returns a single equal op for identical normalized text", () => {
    const d = microscopicDiff("الحمد لله", "الحمد لله");
    expect(d.ratio).toBe(1);
    expect(d.changedChars).toBe(0);
    expect(d.ops).toHaveLength(1);
    expect(d.ops[0]!.type).toBe("equal");
  });

  it("pinpoints a single-letter substitution", () => {
    const d = microscopicDiff("كتاب الفقه", "كتاب الفقهه");
    expect(d.changedChars).toBeGreaterThan(0);
    expect(d.ratio).toBeLessThan(1);
    const reconstructed = d.ops
      .filter((o) => o.type !== "delete")
      .map((o) => o.value)
      .join("");
    expect(reconstructed).toBe("كتاب الفقهه");
  });

  it("handles pure insertion and deletion", () => {
    const ins = microscopicDiff("أ ب", "أ ب ج");
    expect(ins.ops.some((o) => o.type === "insert")).toBe(true);
    const del = microscopicDiff("أ ب ج", "أ ب");
    expect(del.ops.some((o) => o.type === "delete")).toBe(true);
  });

  it("throws beyond the max length guard", () => {
    const big = "ن".repeat(MICROSCOPIC_DIFF_MAX_CHARS + 1);
    expect(() => microscopicDiff(big, "نص")).toThrow(/يتجاوز/);
  });

  it("returns ratio 1 for empty inputs", () => {
    expect(microscopicDiff("", "").ratio).toBe(1);
  });
});
