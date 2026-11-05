import { describe, it, expect } from "vitest";
import {
  buildManifest,
  filterRemaining,
  isRemainingStatus,
  manifest,
} from "../../packages/pipeline/src/queue/manifest";

describe("manifest — detects remaining", () => {
  it("filters pending/processing/error", () => {
    const items = [
      { id: "1", name: "a", status: "pending" },
      { id: "2", name: "b", status: "done" },
      { id: "3", name: "c", status: "processing" },
      { id: "4", name: "d", status: "error", error: "boom" },
    ];
    const remaining = filterRemaining(items);
    expect(remaining).toHaveLength(3);
  });

  it("isRemainingStatus", () => {
    expect(isRemainingStatus("pending")).toBe(true);
    expect(isRemainingStatus("processing")).toBe(true);
    expect(isRemainingStatus("error")).toBe(true);
    expect(isRemainingStatus("done")).toBe(false);
    expect(isRemainingStatus("completed")).toBe(false);
  });

  it("buildManifest returns count and text", () => {
    const items = [
      { id: "1", name: "a", status: "pending", size: 10 },
      { id: "2", name: "b", status: "done" },
    ];
    const m = buildManifest(items);
    expect(m.count).toBe(1);
    expect(m.total).toBe(2);
    expect(m.remaining).toHaveLength(1);
    expect(m.text).toContain("a");
  });

  it("manifest alias works", () => {
    const items = [{ id: "1", name: "a", status: "pending" }];
    const m = manifest(items);
    expect(m.count).toBe(1);
  });
});
