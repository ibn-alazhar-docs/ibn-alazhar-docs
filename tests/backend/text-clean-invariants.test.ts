/**
 * Property-style invariants over the Arabic cleaning corpus — these must hold
 * regardless of how the rule tables are reworked by the verification/correction port.
 *
 * The idempotency sweep has NO exemptions: the whole corpus reaches a fixed point
 * in one pass (defect D5 closed it). If a future rule breaks that, fix the rule —
 * do not re-add an exclusion list.
 */

import { describe, expect, it } from "vitest";
import {
  FIXTURE_IDS,
  countStrictArabicLetters,
  quranicSpans,
  readFixture,
  type FixtureId,
} from "./fixtures/arabic-clean/corpus";
import { cleanArabicText, normalizeUnicode } from "@ibn-al-azhar-docs/pipeline/text";

/**
 * Fixtures where Arabic-letter loss is legitimate (documented noise removal):
 * the page-number lines (whose own word "صفحة"/"Page" is furniture, not content)
 * and the OCR echo collapses. Tables are NOT here any more — since D4 they pass
 * through with their cells intact.
 */
const LOSSY_TODAY: FixtureId[] = [
  "page-noise-ascii",
  "page-noise-arabic-indic",
  "ocr-stutter",
  "dupe-paragraph",
];

describe("Arabic clean — idempotence of the default pipeline", () => {
  for (const id of FIXTURE_IDS) {
    it(`clean(clean(x)) === clean(x) for ${id}`, () => {
      const once = cleanArabicText(readFixture(id));
      const twice = cleanArabicText(once);
      expect(twice).toBe(once);
    });
  }
});

describe("Arabic clean — Quranic/hadith preservation", () => {
  it("normalizeUnicode leaves the ayah and hadith fixtures byte-identical", () => {
    for (const id of ["quran-ayah", "hadith-quotes"] as const) {
      expect(normalizeUnicode(readFixture(id))).toBe(readFixture(id));
    }
  });

  it("﴿...﴾ spans are byte-identical under the normalizeArabic:false knob", () => {
    const input = readFixture("quran-ayah");
    const out = cleanArabicText(input, { normalizeArabic: false });
    expect(quranicSpans(out)).toEqual(quranicSpans(input));
    expect(quranicSpans(input)).toHaveLength(1);
  });

  it("full tashkeel inside the ayah span survives that knob (nothing stripped)", () => {
    const input = readFixture("quran-ayah");
    const out = cleanArabicText(input, { normalizeArabic: false });
    expect(out).toContain("﴿وَمَنْ أَعْرَضَ عَن ذِكْرِي فَإِنَّ لَهُ مَعِيشَةً ضَنكًا");
  });
});

describe("Arabic clean — content preservation", () => {
  it("Arabic letter count never decreases outside documented noise removal", () => {
    for (const id of FIXTURE_IDS.filter((x) => !LOSSY_TODAY.includes(x))) {
      const input = readFixture(id);
      expect(countStrictArabicLetters(cleanArabicText(input))).toBeGreaterThanOrEqual(
        countStrictArabicLetters(input),
      );
    }
  });

  it("no fixture ever cleans to an empty string", () => {
    for (const id of FIXTURE_IDS) {
      expect(cleanArabicText(readFixture(id)).trim().length).toBeGreaterThan(0);
    }
  });

  it("cleaning pure whitespace / empty input stays empty", () => {
    expect(cleanArabicText("")).toBe("");
    expect(cleanArabicText("   \n\n  \t ")).toBe("");
  });
});
