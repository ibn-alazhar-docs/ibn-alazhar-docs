import { describe, expect, it, vi, afterEach } from "vitest";
import { diacritizeArabic } from "./diacritize";

describe("diacritizeArabic", () => {
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

  it("throws GEMINI_API_KEY_MISSING when no key is configured", async () => {
    vi.stubEnv("MOCK_OCR", "false");
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("GEMINI_API_KEY")) delete process.env[key];
    }
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(diacritizeArabic("الحمد لله")).rejects.toThrow("GEMINI_API_KEY_MISSING");
  });
});
