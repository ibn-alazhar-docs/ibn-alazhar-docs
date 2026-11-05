import { describe, it, expect } from "vitest";
import { runSevenStageAudit, textCleaner, normalizeForSimilarity } from "@ibn-al-azhar-docs/pipeline/text";

describe("runSevenStageAudit", () => {
  it("produces 7 stages and passes clean text without a reference", () => {
    const r = runSevenStageAudit("# عنوان\nالحمد لله رب العالمين والصلاة والسلام على رسول الله صلى الله عليه وسلم");
    expect(r.stages).toHaveLength(7);
    expect(r.stages.map((s) => s.stage)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(r.pass).toBe(true);
    expect(r.similarity).toBeNull();
    expect(r.diff).toBeNull();
    expect(r.cleanedText).toContain("الحمد لله");
  });

  it("fails when a ﴿...﴾ span matches no Uthmani verse", () => {
    const r = runSevenStageAudit("قال تعالى ﴿نص محرف لا أصل له في المصحف إطلاقا أبدا﴾");
    expect(r.pass).toBe(false);
    expect(r.stages[3]!.ok).toBe(false);
    expect(r.uthmani.unmatchedQuranicSpans.length).toBeGreaterThan(0);
  });

  it("passes a genuine verse and reports the quranic rule hit count", () => {
    // لِّيَنِينَ is a known OCR corruption fixed by AZHAR_CORRECTION_RULES
    const r = runSevenStageAudit("لِّيَنِينَ");
    expect(r.quranicRuleHits).toBeGreaterThan(0);
    expect(r.cleanedText).toContain("لَّابِثِينَ");
  });

  it("scores similarity and diff against a reference", () => {
    const text = "الحمد لله رب العالمين";
    const r = runSevenStageAudit(text, { reference: text });
    expect(r.similarity?.score).toBe(1);
    expect(r.diff?.ratio).toBe(1);
    expect(r.pass).toBe(true);
  });

  it("fails similarity when text diverges strongly from the reference", () => {
    const r = runSevenStageAudit("الفقه المقارن أصول الدين وفروعه", {
      reference: "الحمد لله رب العالمين والصلاة والسلام على رسول الله صلى الله عليه وسلم",
    });
    expect(r.similarity).not.toBeNull();
    expect(r.similarity!.score).toBeLessThan(0.85);
    expect(r.pass).toBe(false);
  });

  it("handles empty input without throwing", () => {
    const r = runSevenStageAudit("");
    expect(r.stages).toHaveLength(7);
    expect(r.cleanedText).toBe("");
  });
});

describe("textCleaner", () => {
  it("clean() normalizes tatweel and returns text", () => {
    const out = textCleaner.clean("الحمـــد لله");
    expect(out).toContain("الحمد لله");
  });

  it("audit() delegates to runSevenStageAudit", () => {
    const r = textCleaner.audit("بسم الله الرحمن الرحيم");
    expect(r.stages).toHaveLength(7);
    expect(r.pass).toBe(true);
  });

  it("cleanAndAudit() applies quranic fixes before auditing", () => {
    const r = textCleaner.cleanAndAudit("لِّيَنِينَ");
    // قارن على الهيكل المُطبَّع: NFKC قد يعيد ترتيب الشدة/الفتحة دون تغيير المعنى
    expect(normalizeForSimilarity(r.cleanedText)).toContain(normalizeForSimilarity("لَّابِثِينَ"));
  });
});
