import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// تشكيلة نصية (tashkeel) عبر نفس عقد processGuestInput: gemini-transcription غطّى الصوت،
// وهنا نغطي النص عبر processGuestText (MOCK + missing-key).

describe("guest text path — processGuestText (tashkeel)", () => {
  beforeEach(() => {
    vi.stubEnv("MOCK_OCR", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("MOCK=true يرجع نتيجة gemini عبر generateMarkdown", { timeout: 60000 }, async () => {
    const { processGuestText } = await import("@/core/services/guest/guest-tool-processor");
    const result = await processGuestText("بسم الله الرحمن الرحيم");
    expect(result.cleanedText.cleaned.length).toBeGreaterThan(0);
    expect(result.engine).toBe("gemini");
  });

  it("بلا مفاتيح يرمي GEMINI_API_KEY_MISSING", async () => {
    vi.stubEnv("MOCK_OCR", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.doMock("../../packages/pipeline/src/keypool", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../packages/pipeline/src/keypool")>();
      return { ...actual, loadGeminiKeys: () => [] as string[] };
    });
    const { processGuestText } = await import("@/core/services/guest/guest-tool-processor");
    await expect(processGuestText("نص")).rejects.toMatchObject({
      code: "GEMINI_API_KEY_MISSING",
    });
  });
});
