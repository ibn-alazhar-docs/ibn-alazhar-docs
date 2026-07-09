import { describe, it, expect } from "vitest";
import {
  expirationToMs,
  createShareSchema,
  EXPIRATION_OPTIONS,
} from "@/shared/validators/share";

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
