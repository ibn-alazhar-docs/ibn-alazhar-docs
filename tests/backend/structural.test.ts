import { describe, it, expect } from "vitest";
import { auditStructuralIntegrity, applyStructuralFixes } from "@ibn-al-azhar-docs/pipeline/text";

describe("structural integrity", () => {
  it("returns a report for empty text", () => {
    const res = auditStructuralIntegrity("");
    expect(res.isValid).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it("detects orphan pipe rows", () => {
    const input = "hello\n| --- |\nworld";
    const res = auditStructuralIntegrity(input);
    expect(res.issues.some((i) => i.type === "orphan-pipe")).toBe(true);
  });

  it("applyStructuralFixes removes orphan scrap rows", () => {
    const input = "hello\n| --- |\nworld";
    const out = applyStructuralFixes(input);
    expect(out).not.toContain("| --- |");
    expect(out).toContain("hello");
    expect(out).toContain("world");
  });
});
