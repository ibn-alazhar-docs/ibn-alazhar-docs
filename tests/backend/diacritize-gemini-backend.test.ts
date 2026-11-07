import { describe, expect, it, vi, afterEach } from "vitest";
import { diacritizeArabic } from "@ibn-al-azhar-docs/pipeline";

describe("diacritizeArabic (backend mirror)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty string as-is without calling the API", async () => {
    vi.stubEnv("MOCK_OCR", "false");
    await expect(diacritizeArabic("")).resolves.toBe("");
  });

  it("returns text as-is in MOCK_OCR mode without network", async () => {
    vi.stubEnv("MOCK_OCR", "true");
    await expect(diacritizeArabic("الحمد لله")).resolves.toBe("الحمد لله");
  });
});
