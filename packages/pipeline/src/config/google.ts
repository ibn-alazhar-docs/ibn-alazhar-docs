import type { PipelineConfig } from "../types";

function toNum(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildGoogleConfig(): Pick<PipelineConfig, "google" | "gemini"> {
  return {
    google: {
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
      privateKey: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
      modelFallbacks: (() => {
        const raw =
          process.env.GEMINI_MODEL_FALLBACKS ??
          "gemini-2.5-flash,gemini-2.0-flash";
        return raw
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m.length > 0);
      })(),
      nativeChunkSize: toNum(process.env.GEMINI_NATIVE_CHUNK_SIZE, 4),
    },
  };
}
