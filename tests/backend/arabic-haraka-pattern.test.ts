import { describe, it, expect } from "vitest";
import {
  consonantSpine,
  toHarakaPattern,
  containsHaraka,
  harakaOrderProblem,
} from "../../packages/pipeline/src/text/clean/unicode";

describe("toHarakaPattern — diacritic-insensitive matching", () => {
  it("matches a bare literal against fully vowelized text", () => {
    const rx = new RegExp(`^${toHarakaPattern("كتاب")}$`);
    expect(rx.test("كِتَابٌ")).toBe(true);
  });

  it("matches a vowelized literal against bare text (partial diacritics survive OCR)", () => {
    const rx = new RegExp(`^${toHarakaPattern("كِتَابُ")}$`);
    expect(rx.test("كتاب")).toBe(true);
  });

  it("does not match a different word sharing only consonants", () => {
    const rx = new RegExp(`^${toHarakaPattern("كتاب")}$`);
    expect(rx.test("كاتب")).toBe(false);
  });

  it("treats tatweel in the literal as optional", () => {
    const rx = new RegExp(`^${toHarakaPattern("كتــاب")}$`);
    expect(rx.test("كتاب")).toBe(true);
  });
});

describe("consonantSpine", () => {
  it("strips harakat from a literal", () => {
    expect(consonantSpine("كِتَابٌ")).toBe("كتاب");
  });

  it("strips tolerant-class scaffolding", () => {
    expect(consonantSpine("ك[\\u064B-\\u0652\\u0670]*تاب")).toBe("كتاب");
  });
});

describe("containsHaraka / harakaOrderProblem", () => {
  it("containsHaraka reports presence", () => {
    expect(containsHaraka("كتاب")).toBe(false);
    expect(containsHaraka("كِتاب")).toBe(true);
  });

  it("harakaOrderProblem flags shadda followed by a vowel", () => {
    expect(harakaOrderProblem("الكِتَاب")).toBeNull();
    const problem = harakaOrderProblem("كَ\u0651\u064Eتَاب");
    expect(problem).toContain("shadda");
  });
});
