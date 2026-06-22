import { describe, it, expect } from "vitest";
import { routing } from "@/i18n/routing";

const LOCALES = routing.locales;

describe("LOCALES", () => {
  it('contains "ar"', () => {
    expect(LOCALES).toContain("ar");
  });

  it('contains "en"', () => {
    expect(LOCALES).toContain("en");
  });

  it("has exactly 2 entries", () => {
    expect(LOCALES).toHaveLength(2);
  });
});

describe("routing.defaultLocale", () => {
  it('is "ar"', () => {
    expect(routing.defaultLocale).toBe("ar");
  });
});

describe("routing.localePrefix", () => {
  it('is "always"', () => {
    expect(routing.localePrefix).toBe("always");
  });
});
