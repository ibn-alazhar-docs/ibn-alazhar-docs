export type Stage =
  | "pending"
  | "validating"
  | "splitting"
  | "ocr"
  | "cleaning"
  | "generating"
  | "completed"
  | "failed";

export const STAGE_ORDER: Stage[] = [
  "pending",
  "validating",
  "splitting",
  "ocr",
  "cleaning",
  "generating",
  "completed",
];

export const STATUS_NORMALIZE: Record<string, Stage> = {
  pending: "pending",
  validating: "validating",
  splitting: "splitting",
  ocr: "ocr",
  cleaning: "cleaning",
  generating: "generating",
  completed: "completed",
  failed: "failed",
  UPLOADED: "pending",
  VALIDATING: "validating",
  SPLITTING: "splitting",
  OCR_PROCESSING: "ocr",
  CLEANING: "cleaning",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
};

export function normalizeStage(raw: string): Stage {
  return STATUS_NORMALIZE[raw] ?? "pending";
}

export const DOC_PROGRESS_MAP: Record<string, number> = {
  UPLOADED: 0,
  VALIDATING: 10,
  SPLITTING: 25,
  OCR_PROCESSING: 40,
  CLEANING: 65,
  GENERATING: 85,
  COMPLETED: 100,
  FAILED: 0,
};

export function getProgressPercent(stage: Stage, progress: number = 0): number {
  if (stage === "completed") return 100;
  if (stage === "failed") return 100;
  if (progress > 0) return Math.max(5, Math.min(progress, 99));
  const currentIdx = STAGE_ORDER.indexOf(stage);
  if (currentIdx === -1) return 5;
  return Math.max(5, (currentIdx / (STAGE_ORDER.length - 1)) * 100);
}
