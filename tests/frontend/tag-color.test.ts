import { describe, it, expect } from "vitest";
import { tagChipStyle, tagDotStyle } from "@/ui/tags/tag-color";

describe("tag-color helpers (parity extraction)", () => {
  it("tagDotStyle returns solid background", () => {
    expect(tagDotStyle("#ff0000")).toEqual({ backgroundColor: "#ff0000" });
  });

  it("tagChipStyle matches legacy inline values", () => {
    expect(tagChipStyle("#112233")).toEqual({
      backgroundColor: "#11223320",
      color: "#112233",
      borderColor: "#11223340",
    });
  });
});
