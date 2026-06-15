import { describe, it, expect } from "vitest";

type Stage =
  | "pending"
  | "validating"
  | "splitting"
  | "ocr"
  | "cleaning"
  | "generating"
  | "completed"
  | "failed";

const STAGE_ORDER: Stage[] = [
  "pending",
  "validating",
  "splitting",
  "ocr",
  "cleaning",
  "generating",
  "completed",
];

const STATUS_NORMALIZE: Record<string, Stage> = {
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

function normalizeStage(raw: string): Stage {
  return STATUS_NORMALIZE[raw] ?? "pending";
}

function getProgressPercent(currentStage: Stage, progress: number = 0): number {
  if (currentStage === "completed") return 100;
  if (currentStage === "failed") return 100;
  if (progress > 0) return Math.min(progress, 99);
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1) return 5;
  return Math.max(5, Math.round((idx / (STAGE_ORDER.length - 1)) * 99));
}

describe("STATUS_NORMALIZE", () => {
  const lowercaseMap: [string, Stage][] = [
    ["pending", "pending"],
    ["validating", "validating"],
    ["splitting", "splitting"],
    ["ocr", "ocr"],
    ["cleaning", "cleaning"],
    ["generating", "generating"],
    ["completed", "completed"],
    ["failed", "failed"],
  ];

  lowercaseMap.forEach(([input, expected]) => {
    it(`maps "${input}" to "${expected}"`, () => {
      expect(STATUS_NORMALIZE[input]).toBe(expected);
    });
  });

  const uppercaseMap: [string, Stage][] = [
    ["UPLOADED", "pending"],
    ["VALIDATING", "validating"],
    ["SPLITTING", "splitting"],
    ["OCR_PROCESSING", "ocr"],
    ["CLEANING", "cleaning"],
    ["GENERATING", "generating"],
    ["COMPLETED", "completed"],
    ["FAILED", "failed"],
  ];

  uppercaseMap.forEach(([input, expected]) => {
    it(`maps "${input}" to "${expected}"`, () => {
      expect(STATUS_NORMALIZE[input]).toBe(expected);
    });
  });
});

describe("normalizeStage", () => {
  const cases: [string, Stage][] = [
    ["pending", "pending"],
    ["validating", "validating"],
    ["ocr", "ocr"],
    ["cleaning", "cleaning"],
    ["completed", "completed"],
    ["failed", "failed"],
  ];

  cases.forEach(([input, expected]) => {
    it(`normalizes "${input}" to "${expected}"`, () => {
      expect(normalizeStage(input)).toBe(expected);
    });
  });

  it("returns 'pending' for unknown status", () => {
    expect(normalizeStage("UNKNOWN_STATUS")).toBe("pending");
  });
});

describe("STAGE_ORDER", () => {
  it("has 7 items", () => {
    expect(STAGE_ORDER).toHaveLength(7);
  });

  it("starts with 'pending'", () => {
    expect(STAGE_ORDER[0]).toBe("pending");
  });

  it("ends with 'completed'", () => {
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe("completed");
  });

  it("contains correct order", () => {
    expect(STAGE_ORDER).toEqual([
      "pending",
      "validating",
      "splitting",
      "ocr",
      "cleaning",
      "generating",
      "completed",
    ]);
  });
});

describe("Progress bar logic", () => {
  it("returns 100 when completed", () => {
    expect(getProgressPercent("completed")).toBe(100);
  });

  it("returns 100 when failed", () => {
    expect(getProgressPercent("failed")).toBe(100);
  });

  it("returns minimum 5% for stage-based calculation", () => {
    expect(getProgressPercent("pending")).toBe(5);
  });

  it("uses progress value when greater than 0", () => {
    expect(getProgressPercent("ocr", 50)).toBe(50);
  });

  it("caps progress at 99", () => {
    expect(getProgressPercent("ocr", 100)).toBe(99);
  });
});

describe("Timeline logic", () => {
  const stages: Stage[] = [
    "pending",
    "validating",
    "splitting",
    "ocr",
    "cleaning",
    "generating",
    "completed",
  ];

  function getTimeline(currentStage: Stage) {
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    return stages.map((stage, idx) => ({
      stage,
      done: currentStage === "completed" || idx < currentIdx,
      active: idx === currentIdx && currentStage !== "completed",
    }));
  }

  it("all done when completed", () => {
    const timeline = getTimeline("completed");
    expect(timeline.every((t) => t.done)).toBe(true);
    expect(timeline.every((t) => !t.active)).toBe(true);
  });

  it("stages before current are done", () => {
    const timeline = getTimeline("ocr");
    expect(timeline[0].done).toBe(true);
    expect(timeline[1].done).toBe(true);
    expect(timeline[2].done).toBe(true);
  });

  it("current stage is active", () => {
    const timeline = getTimeline("ocr");
    expect(timeline[3].active).toBe(true);
    expect(timeline[3].done).toBe(false);
  });

  it("future stages are not done", () => {
    const timeline = getTimeline("ocr");
    expect(timeline[4].done).toBe(false);
    expect(timeline[5].done).toBe(false);
    expect(timeline[6].done).toBe(false);
  });
});
