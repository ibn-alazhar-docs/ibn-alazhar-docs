export const DOC_STATUS_MAP: Record<string, string> = {
  UPLOADED: "pending",
  VALIDATING: "validating",
  SPLITTING: "splitting",
  OCR_PROCESSING: "ocr",
  CLEANING: "cleaning",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
};

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
