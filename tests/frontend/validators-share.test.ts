import { describe, it, expect } from "vitest";
import {
  expirationToMs,
  msToExpirationOption,
  createShareSchema,
  EXPIRATION_OPTIONS,
} from "@/lib/validators/share";

describe("expirationToMs", () => {
  it('"never" returns null', () => {
    expect(expirationToMs("never")).toBeNull();
  });

  it('"7days" returns 604800000', () => {
    expect(expirationToMs("7days")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('"30days" returns 2592000000', () => {
    expect(expirationToMs("30days")).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("msToExpirationOption", () => {
  it("null returns never", () => {
    expect(msToExpirationOption(null)).toBe("never");
  });

  it("value within 7 days returns 7days", () => {
    expect(msToExpirationOption(7 * 24 * 60 * 60 * 1000)).toBe("7days");
  });

  it("value less than 7 days returns 7days", () => {
    expect(msToExpirationOption(1000)).toBe("7days");
  });

  it("value greater than 7 days returns 30days", () => {
    expect(msToExpirationOption(30 * 24 * 60 * 60 * 1000)).toBe("30days");
  });

  it("zero returns 7days", () => {
    expect(msToExpirationOption(0)).toBe("7days");
  });

  it("boundary: exactly 7 days returns 7days", () => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(msToExpirationOption(sevenDays)).toBe("7days");
  });

  it("boundary: 7 days + 1 ms returns 30days", () => {
    const sevenDaysPlusOne = 7 * 24 * 60 * 60 * 1000 + 1;
    expect(msToExpirationOption(sevenDaysPlusOne)).toBe("30days");
  });
});

describe("EXPIRATION_OPTIONS", () => {
  it("has 3 options", () => {
    expect(EXPIRATION_OPTIONS).toHaveLength(3);
  });

  it("contains never, 7days, 30days", () => {
    expect(EXPIRATION_OPTIONS).toContain("never");
    expect(EXPIRATION_OPTIONS).toContain("7days");
    expect(EXPIRATION_OPTIONS).toContain("30days");
  });
});

describe("createShareSchema", () => {
  it("valid expiration passes", () => {
    const result = createShareSchema.safeParse({ expiration: "7days" });
    expect(result.success).toBe(true);
  });

  it("expiration defaults to never", () => {
    const result = createShareSchema.parse({});
    expect(result.expiration).toBe("never");
  });

  it("never expiration passes", () => {
    const result = createShareSchema.safeParse({ expiration: "never" });
    expect(result.success).toBe(true);
  });

  it("30days expiration passes", () => {
    const result = createShareSchema.safeParse({ expiration: "30days" });
    expect(result.success).toBe(true);
  });

  it("invalid expiration fails", () => {
    const result = createShareSchema.safeParse({ expiration: "1day" });
    expect(result.success).toBe(false);
  });
});
