import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("transcription — Gemini audio → text", () => {
  beforeEach(() => {
    vi.stubEnv("MOCK_OCR", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("MOCK=true يرجع نصًا عربيًا ثابتًا بلا شبكة", async () => {
    const { transcribeAudio } = await import(
      "../../packages/pipeline/src/transcription/gemini-transcribe"
    );
    const text = await transcribeAudio(Buffer.from("fake-audio"), "audio/mpeg", "ar");
    expect(text).toContain("تفريغ صوتي تجريبي");
    expect(text.length).toBeGreaterThan(5);
  });

  it("بلا مفاتيح وبلا MOCK يرمي GEMINI_API_KEY_MISSING مميزًا", async () => {
    vi.stubEnv("MOCK_OCR", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    // حتمية: نثبّت loadGeminiKeys ليُرجع []؛ لا تحقل الشبكة
    vi.doMock("../../packages/pipeline/src/keypool", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../packages/pipeline/src/keypool")>();
      return { ...actual, loadGeminiKeys: () => [] as string[] };
    });
    const mod = await import("../../packages/pipeline/src/transcription/gemini-transcribe");
    await expect(mod.transcribeAudio(Buffer.from("fake"), "audio/wav", "ar")).rejects.toThrow(
      "GEMINI_API_KEY_MISSING",
    );
  });

  it("guest-limits يقبل صوتًا ويعتبر transcription متاحًا", async () => {
    const { GUEST_TOOLS, validateGuestFile, GUEST_ALLOWED_MIME_TYPES } = await import(
      "@/shared/tools/guest-limits"
    );
    expect(GUEST_ALLOWED_MIME_TYPES).toContain("audio/mpeg");
    expect(GUEST_ALLOWED_MIME_TYPES).toContain("audio/wav");
    expect(GUEST_ALLOWED_MIME_TYPES).toContain("audio/mp4");
    expect(GUEST_ALLOWED_MIME_TYPES).toContain("audio/ogg");

    const transcription = GUEST_TOOLS.find((t) => t.id === "transcription");
    expect(transcription?.status).toBe("available");

    const file = new File(["x"], "lesson.mp3", { type: "audio/mpeg" });
    const result = validateGuestFile(file);
    expect(result.valid).toBe(true);

    const wav = new File(["x"], "lesson.wav", { type: "audio/wav" });
    expect(validateGuestFile(wav).valid).toBe(true);

    const m4a = new File(["x"], "lesson.m4a", { type: "audio/mp4" });
    expect(validateGuestFile(m4a).valid).toBe(true);

    const ogg = new File(["x"], "lesson.ogg", { type: "audio/ogg" });
    expect(validateGuestFile(ogg).valid).toBe(true);
  });

  it("countGuestPages يعيد 1 لغير-PDF (صوت/صورة)", { timeout: 60000 }, async () => {
    const { countGuestPages } = await import("@/core/services/guest/guest-input-validation");
    const audioPages = await countGuestPages(
      new Uint8Array([0x52, 0x49, 0x46, 0x46]),
      "audio/wav" as never,
      "x.wav",
    );
    expect(audioPages.pageCount).toBe(1);

    const imagePages = await countGuestPages(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      "image/png" as never,
      "x.png",
    );
    expect(imagePages.pageCount).toBe(1);
  });

  it("validateGuestUpload يقبل WAV (RIFF/WAVE)", { timeout: 60000 }, async () => {
    const { validateGuestUpload } = await import("@/core/services/guest/guest-input-validation");
    // RIFF....WAVE
    const bytes = new Uint8Array([
      ...Buffer.from("RIFF", "utf-8"),
      0x00,
      0x00,
      0x00,
      0x00,
      ...Buffer.from("WAVE", "utf-8"),
      0x01,
      0x02,
      0x03,
    ]);
    const file = new File([bytes], "x.wav", { type: "audio/wav" });
    const out = await validateGuestUpload(file);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.mimeType).toBe("audio/wav");
      expect(out.pageCount).toBe(1);
    }
  });

  it("validateGuestUpload يقبل MP3 (ID3) وM4A (ftyp) وOGG (OggS)", { timeout: 60000 }, async () => {
    const { validateGuestUpload } = await import("@/core/services/guest/guest-input-validation");

    const mp3 = new File([new Uint8Array([...Buffer.from("ID3", "utf-8"), 0x01, 0x02])], "a.mp3", {
      type: "audio/mpeg",
    });
    const mp3Out = await validateGuestUpload(mp3);
    expect(mp3Out.ok).toBe(true);

    const m4a = new File(
      [new Uint8Array([0x00, 0x00, 0x00, 0x00, ...Buffer.from("ftyp", "utf-8"), 0x01])],
      "a.m4a",
      { type: "audio/mp4" },
    );
    const m4aOut = await validateGuestUpload(m4a);
    expect(m4aOut.ok).toBe(true);

    const ogg = new File([new Uint8Array([...Buffer.from("OggS", "utf-8"), 0x01, 0x02])], "a.ogg", {
      type: "audio/ogg",
    });
    const oggOut = await validateGuestUpload(ogg);
    expect(oggOut.ok).toBe(true);
  });

  it(
    "processGuestInput فرع transcription ينتج GuestJobResult عبر generateMarkdown",
    { timeout: 60000 },
    async () => {
      const { processGuestInput } = await import("@/core/services/guest/guest-tool-processor");
      // MOCK_OCR=true مُثبّت في beforeEach، لذلك transcribeAudio يرجع النص التجريبي
      const result = await processGuestInput({
        bytes: new Uint8Array(Buffer.from("fake-audio-bytes")),
        mimeType: "audio/mpeg" as never,
        fileName: "lesson.mp3",
        pageCount: 1,
        classification: null,
        toolId: "transcription",
      });
      expect(result.cleanedText.cleaned.length).toBeGreaterThan(0);
      expect(result.engine).toBe("gemini-transcription");
      expect(result.route).toBe("ocr");
    },
  );

  it(
    "processGuestInput يشفّط صوتًا حتى بلا toolId (fallback mime)",
    { timeout: 60000 },
    async () => {
      const { processGuestInput } = await import("@/core/services/guest/guest-tool-processor");
      const result = await processGuestInput({
        bytes: new Uint8Array(Buffer.from("fake")),
        mimeType: "audio/wav" as never,
        fileName: "x.wav",
        pageCount: 1,
        classification: null,
      });
      expect(result.engine).toBe("gemini-transcription");
    },
  );

  it("guestFailureFromError يرسم GEMINI_API_KEY_MISSING مميزًا", { timeout: 60000 }, async () => {
    const { guestFailureFromError } = await import("@/core/services/guest/guest-tool-processor");
    const info = guestFailureFromError(new Error("GEMINI_API_KEY_MISSING: no key"));
    expect(info.code).toBe("GEMINI_API_KEY_MISSING");
  });
});
