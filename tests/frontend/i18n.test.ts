import { describe, it, expect } from "vitest";

const LOCALES = ["ar", "en"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = "ar";
const LOCALE_PREFIX = "always";

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function getLocalePrefix(): string {
  return LOCALE_PREFIX;
}

function localizePath(path: string, locale: Locale): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${cleanPath}`;
}

function stripLocale(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 0 && isLocale(parts[0])) {
    return "/" + parts.slice(1).join("/");
  }
  return path;
}

function getLocaleFromPath(path: string): Locale | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 0 && isLocale(parts[0])) {
    return parts[0] as Locale;
  }
  return null;
}

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

describe("DEFAULT_LOCALE", () => {
  it('is "ar"', () => {
    expect(DEFAULT_LOCALE).toBe("ar");
  });
});

describe("LOCALE_PREFIX", () => {
  it('is "always"', () => {
    expect(LOCALE_PREFIX).toBe("always");
  });
});

describe("isLocale", () => {
  it('returns true for "ar"', () => {
    expect(isLocale("ar")).toBe(true);
  });

  it('returns true for "en"', () => {
    expect(isLocale("en")).toBe(true);
  });

  it('returns false for "fr"', () => {
    expect(isLocale("fr")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isLocale("")).toBe(false);
  });
});

describe("getLocalePrefix", () => {
  it('returns "always"', () => {
    expect(getLocalePrefix()).toBe("always");
  });
});

describe("localizePath", () => {
  it("prefixes Arabic locale", () => {
    expect(localizePath("/page", "ar")).toBe("/ar/page");
  });

  it("prefixes English locale", () => {
    expect(localizePath("/page", "en")).toBe("/en/page");
  });
});

describe("stripLocale", () => {
  it("removes ar prefix", () => {
    expect(stripLocale("/ar/page")).toBe("/page");
  });

  it("removes en prefix", () => {
    expect(stripLocale("/en/page")).toBe("/page");
  });
});

describe("getLocaleFromPath", () => {
  it('extracts "ar" from path', () => {
    expect(getLocaleFromPath("/ar/about")).toBe("ar");
  });

  it('extracts "en" from path', () => {
    expect(getLocaleFromPath("/en/about")).toBe("en");
  });
});
