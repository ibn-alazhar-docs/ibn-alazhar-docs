/**
 * Public contracts for the diacritization (tashkeel) module.
 *
 * Design rule (docs/MERGE_PLAN.md graceful-degradation): an engine that
 * cannot run MUST fail with a coded `DiacritizeError`, never return the
 * input text and pretend success. Only the conservative deterministic
 * engine may leave individual words unvowelized — and it reports that in
 * `coverage` / `warnings` so callers can refuse to present weak results.
 */

export type DiacritizeEngineId = "deterministic" | "python-camel" | "python-cambrt";

export type DiacritizeEnginePreference = "auto" | "deterministic" | "python";

export interface DiacritizeOptions {
  /**
   * - "auto": use the Python backend when its availability probe succeeds,
   *   otherwise the deterministic engine (never a no-op).
   * - "deterministic": force the in-process rule engine.
   * - "python": force the Python backend; throws `DiacritizeError` with
   *   code "ENGINE_UNAVAILABLE" when the probe fails (maps to HTTP 503).
   */
  engine?: DiacritizeEnginePreference;
  /** Max per-word skip samples reported in `warnings`. Defaults to 20. */
  warnLimit?: number;
  /** Abort with code "INPUT_TOO_LARGE" above this many characters. Defaults to 200_000. */
  maxInputChars?: number;
}

export interface DiacritizeResult {
  /** Diacritized text. Equal to the input ONLY when nothing could be done to it. */
  text: string;
  /**
   * Measured share (0..1) of Arabic letters in the result that carry at least
   * one tashkeel mark. Lets callers distinguish "did almost nothing" from a
   * real result; a tool/UX layer should enforce a floor before presenting
   * the output as "tashkeel applied".
   */
  coverage: number;
  /** The engine that actually produced `text`. */
  engine: DiacritizeEngineId;
  /** Stable warning codes (see `DiacritizeWarningCode`), free-text after ":". */
  warnings: string[];
}

export interface Diacritizer {
  readonly id: DiacritizeEngineId;
  diacritize(text: string, opts?: DiacritizeOptions): Promise<DiacritizeResult>;
}

export type DiacritizeErrorCode =
  /** Backend requested but its probe failed — HTTP 503 material, not a fake success. */
  | "ENGINE_UNAVAILABLE"
  /** Backend probe passed but the run itself failed — HTTP 502 material. */
  | "ENGINE_FAILED"
  /** Response was not parseable / missed a deadline. */
  | "ENGINE_TIMEOUT"
  | "INPUT_EMPTY"
  | "INPUT_TOO_LARGE";

export type DiacritizeWarningCode =
  /** Conservative mode: the engine could not determine this word and left it bare. */
  | "UNVOWELIZED_WORD"
  | "UNVOWELIZED_COUNT"
  /** Non-Arabic span passed through untouched. */
  | "NON_ARABIC_PASSTHROUGH"
  /** Protected span (Quranic/legal) deliberately not modified. */
  | "PROTECTED_SPAN_PASSTHROUGH"
  /** Whole text already heavily vocalized — returned unchanged, on purpose. */
  | "ALREADY_VOCALIZED";

export class DiacritizeError extends Error {
  readonly code: DiacritizeErrorCode;

  constructor(code: DiacritizeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DiacritizeError";
    this.code = code;
  }
}
