import { describe, it, expect } from "vitest";
import {
  UTHMANI_DATASET,
  UTHMANI_SOURCE,
  uthmaniSkeleton,
  getUthmaniAyah,
  findUthmaniMatches,
  verifyQuranicText,
} from "@ibn-al-azhar-docs/pipeline/text";

describe("uthmani dataset (300 verses)", () => {
  it("contains exactly 300 verses with unique (surah, ayah) keys", () => {
    expect(UTHMANI_DATASET).toHaveLength(300);
    const keys = new Set(UTHMANI_DATASET.map((e) => `${e.surah}:${e.ayah}`));
    expect(keys.size).toBe(300);
    for (const e of UTHMANI_DATASET) {
      expect(e.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers Al-Fatiha (7) + Al-Baqara (286) + Aal-Imran 1-7", () => {
    expect(UTHMANI_DATASET.filter((e) => e.surah === 1)).toHaveLength(7);
    expect(UTHMANI_DATASET.filter((e) => e.surah === 2)).toHaveLength(286);
    expect(UTHMANI_DATASET.filter((e) => e.surah === 3)).toHaveLength(7);
    expect(getUthmaniAyah(1, 1)).toBeDefined();
    expect(getUthmaniAyah(2, 286)).toBeDefined();
    expect(getUthmaniAyah(3, 7)).toBeDefined();
    expect(getUthmaniAyah(3, 8)).toBeUndefined();
  });

  it("records its source", () => {
    expect(UTHMANI_SOURCE).toContain("AlQuran Cloud");
  });

  it("spot-checks Al-Fatiha first verse text", () => {
    const first = getUthmaniAyah(1, 1)!;
    expect(first.text).toContain("بِسْمِ");
    expect(first.text).toContain("ٱللَّهِ");
  });
});

describe("uthmaniSkeleton", () => {
  it("strips tashkeel and tatweel so ضبط differences do not break matching", () => {
    expect(uthmaniSkeleton("بِسْمِ ٱللَّهِ")).toBe(uthmaniSkeleton("بسم الله"));
  });
});

describe("findUthmaniMatches / verifyQuranicText", () => {
  it("finds an exact match for a dataset verse (even without tashkeel)", () => {
    const verse = getUthmaniAyah(1, 2)!;
    const matches = findUthmaniMatches(verse.text);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.surah).toBe(1);
    expect(matches[0]!.ayah).toBe(2);
    expect(matches[0]!.exact).toBe(true);
    expect(matches[0]!.skeletonSimilarity).toBe(1);
  });

  it("returns no matches for unrelated prose", () => {
    expect(findUthmaniMatches("هذا نص عادي عن الفقه المقارن والحديث النبوي الشريف")).toHaveLength(0);
  });

  it("verifyQuranicText flags a ﴿...﴾ span that matches no dataset verse", () => {
    const res = verifyQuranicText("قال تعالى ﴿كلمة محرفة لا وجود لها في المصحف أبدا﴾ صدق الله");
    expect(res.unmatchedQuranicSpans.length).toBeGreaterThan(0);
    expect(res.exactCount).toBe(0);
  });

  it("verifyQuranicText accepts a genuine dataset verse inside ﴿...﴾", () => {
    const verse = getUthmaniAyah(2, 255)!; // Ayat al-Kursi
    const res = verifyQuranicText(`﴿${verse.text}﴾`);
    expect(res.unmatchedQuranicSpans).toHaveLength(0);
    expect(res.exactCount).toBeGreaterThan(0);
  });
});
