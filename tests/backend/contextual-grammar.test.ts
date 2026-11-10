import { describe, it, expect } from "vitest";
import { auditContextualGrammar } from "@ibn-al-azhar-docs/pipeline/text";

describe("auditContextualGrammar", () => {
  it("returns valid for empty text", () => {
    const r = auditContextualGrammar("");
    expect(r.isValid).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.wordCount).toBe(0);
  });

  it("detects an immediately repeated word", () => {
    const r = auditContextualGrammar("قال قال رسول الله صلى الله عليه وسلم");
    expect(r.issues.some((i) => i.kind === "repeated-word")).toBe(true);
    expect(r.wordCount).toBeGreaterThan(0);
  });

  it("detects hamza-swap adjacency", () => {
    const r = auditContextualGrammar("هذا إأحمد خطأ إملائي");
    expect(r.issues.some((i) => i.kind === "hamza-swap")).toBe(true);
  });

  it("detects tanween-on-alif", () => {
    const r = auditContextualGrammar("مررت برجلٍا كريما");
    expect(r.issues.some((i) => i.kind === "tanween-on-alif")).toBe(true);
  });

  it("detects digits glued inside a word", () => {
    const r = auditContextualGrammar("هذا كتاب3فقه مخلوط");
    expect(r.issues.some((i) => i.kind === "digit-in-word")).toBe(true);
  });

  it("detects mixed alif-maqsura/yaa for the same stem", () => {
    const r = auditContextualGrammar("إلى المدرسة\nالي المدرسه");
    expect(r.issues.some((i) => i.kind === "alif-maqsura-mix")).toBe(true);
  });

  it("detects mixed taa-marbuta/haa for the same stem", () => {
    const r = auditContextualGrammar("المدرسة كبيرة\nالمدرسه صغيرة");
    expect(r.issues.some((i) => i.kind === "taa-marbuta-mix")).toBe(true);
  });

  it("detects hanging diacritic after a space", () => {
    const r = auditContextualGrammar("هذا كلام َ معلق");
    expect(r.issues.some((i) => i.kind === "hanging-diacritic")).toBe(true);
  });

  it("reports clean text as valid with no issues", () => {
    const r = auditContextualGrammar("الحمد لله رب العالمين والصلاة والسلام على رسول الله");
    expect(r.issues).toHaveLength(0);
    expect(r.isValid).toBe(true);
  });
});
