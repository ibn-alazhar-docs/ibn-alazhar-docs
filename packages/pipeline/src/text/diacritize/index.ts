import type { DiacritizeOptions, DiacritizeResult, Diacritizer, DiacritizeEngineId } from "./types";
import { DiacritizeError } from "./types";
import { deterministicDiacritizer, deterministicDiacritize } from "./deterministic";
import {
  createPythonDiacritizer,
  probePythonBackend,
  type PythonBackendProbe,
} from "./python-backend";

/**
 * Public surface of the tashkeel module.
 *
 * Contract callers rely on:
 * - `diacritizeText` NEVER returns the input silently labelled success.
 *   The deterministic engine reports what it did through `coverage` and
 *   `warnings`; a requested-but-unavailable Python engine throws
 *   `DiacritizeError` with code "ENGINE_UNAVAILABLE" (tool layer: HTTP 503).
 * - Worker-safe: no node builtins at module scope (the Python backend
 *   lazily imports `runPython` inside its functions).
 */

export interface DiacritizersStatus {
  deterministic: true;
  python: PythonBackendProbe;
}

export type DiacritizeAvailability =
  | { available: true; engine: DiacritizeEngineId }
  | { available: false; reason: string };

let pythonProbeCache: Promise<PythonBackendProbe> | null = null;

/** Cached Python probe (per process). Pass `refresh` after installing deps. */
export function probePythonDiacritizer(refresh = false): Promise<PythonBackendProbe> {
  if (refresh || !pythonProbeCache) {
    pythonProbeCache = probePythonBackend().catch(
      (err: unknown): PythonBackendProbe => ({
        available: false,
        camelMle: false,
        cambrt: false,
        detail: String((err as Error)?.message ?? err),
      }),
    );
  }
  return pythonProbeCache;
}

export async function probeDiacritizers(): Promise<DiacritizersStatus> {
  return { deterministic: true, python: await probePythonDiacritizer() };
}

/**
 * Availability gate for tool wiring: with no argument, true when ANY real
 * engine can run (deterministic always can). Pass "python" to gate the
 * sidecar-backed feature flag honestly.
 */
export async function isDiacritizerAvailable(engine?: "python"): Promise<boolean> {
  if (engine === "python") return (await probePythonDiacritizer()).available;
  return true;
}

async function selectEngine(
  preference: DiacritizeOptions["engine"],
): Promise<{ diacritizer: Diacritizer; forced: boolean }> {
  if (preference === "deterministic") {
    return { diacritizer: deterministicDiacritizer, forced: true };
  }
  if (preference === "python") {
    return { diacritizer: await createPythonDiacritizer(), forced: true };
  }
  const probe = await probePythonDiacritizer();
  if (probe.available) {
    return { diacritizer: await createPythonDiacritizer(probe), forced: false };
  }
  return { diacritizer: deterministicDiacritizer, forced: false };
}

/**
 * Main entry point. `engine: "python"` demands the sidecar and fails with
 * `ENGINE_UNAVAILABLE` instead of pretending; the default "auto" prefers
 * the sidecar and falls back to the deterministic engine.
 */
export async function diacritizeText(
  text: string,
  options?: DiacritizeOptions,
): Promise<DiacritizeResult> {
  const maxChars = options?.maxInputChars ?? 200_000;
  if (text.trim().length === 0) {
    throw new DiacritizeError("INPUT_EMPTY", "لا نص لتشكله");
  }
  if (text.length > maxChars) {
    throw new DiacritizeError("INPUT_TOO_LARGE", `النص يتجاوز حد ${maxChars} حرفًا`);
  }

  const { diacritizer } = await selectEngine(options?.engine);
  return diacritizer.diacritize(text, options);
}

export { deterministicDiacritizer, deterministicDiacritize };
export { createPythonDiacritizer, probePythonBackend };
export {
  splitByProtectedSpans,
  extractProtectedSpans,
  isHeavilyVocalized,
} from "./protected-spans";
export { computeCoverage } from "./deterministic";
export type { PythonBackendProbe };
export type {
  DiacritizeOptions,
  DiacritizeResult,
  Diacritizer,
  DiacritizeEngineId,
  DiacritizeEnginePreference,
  DiacritizeErrorCode,
  DiacritizeWarningCode,
} from "./types";
export { DiacritizeError } from "./types";
