import { describe, it, expect } from "vitest";
import {
  applyQuranicFixes,
  AZHAR_CORRECTION_RULES,
  normalizePresentationForms,
  repairMojibake,
  expandPuaHonorifics,
} from "@ibn-al-azhar-docs/pipeline/text";

describe("quranic fixes", () => {
  it("applies a correction rule", () => {
    const input = "لِّيَنِينَ";
    const out = applyQuranicFixes(input);
    expect(out).toContain("لَّابِثِينَ");
  });

  it("exposes abbreviated rules", () => {
    expect(AZHAR_CORRECTION_RULES.length).toBeGreaterThan(0);
  });
});

describe("arabic unicode helpers", () => {
  it("normalizes presentation forms", () => {
    // U+FE8D is alef presentation form
    const input = "\uFE8D";
    const out = normalizePresentationForms(input);
    expect(out).toBe("ا");
  });

  it("expands pua honorifics", () => {
    const input = "\uF074";
    const out = expandPuaHonorifics(input);
    expect(out).toContain("رضي الله عنه");
  });

  it("repairs mojibake", () => {
    const input = "Ø§Ù„";
    const out = repairMojibake(input);
    expect(out).toBe("ال");
  });
});
