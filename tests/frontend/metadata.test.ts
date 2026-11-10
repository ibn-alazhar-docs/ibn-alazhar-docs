import { describe, it, expect } from "vitest";
import { siteName, siteNameAr, getLocaleUrl, generatePageMetadata } from "@/ui/metadata";

const siteUrl = "https://ibnalazhar-docs.vercel.app";

describe("getLocaleUrl", () => {
  it("returns correct url with leading slash path", () => {
    expect(getLocaleUrl("ar", "/about")).toBe("https://ibnalazhar-docs.vercel.app/ar/about");
  });

  it("prepends slash when path lacks one", () => {
    expect(getLocaleUrl("ar", "contact")).toBe("https://ibnalazhar-docs.vercel.app/ar/contact");
  });

  it("handles empty path", () => {
    expect(getLocaleUrl("ar")).toBe("https://ibnalazhar-docs.vercel.app/ar/");
  });

  it("works with a deep path", () => {
    expect(getLocaleUrl("ar", "/docs")).toContain("/ar/docs");
  });

  it("handles deep nested path", () => {
    expect(getLocaleUrl("ar", "/a/b/c/d")).toBe("https://ibnalazhar-docs.vercel.app/ar/a/b/c/d");
  });

  it("returns correct format for the ar locale", () => {
    const arUrl = getLocaleUrl("ar", "/page");
    expect(arUrl).toMatch(/\/ar\/page$/);
  });
});

describe("siteName constants", () => {
  it("siteName is the Arabic brand name", () => {
    expect(siteName).toBe("منصة ابن الأزهر");
  });

  it("siteNameAr equals siteName (ar-only)", () => {
    expect(siteNameAr).toBe(siteName);
  });
});

describe("generatePageMetadata", () => {
  it("passes the title through verbatim — the brand suffix is OG-only", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "Home",
      description: "Welcome",
    });
    expect(meta.title).toBe("Home");
    expect(meta.openGraph?.title).toBe("Home — منصة ابن الأزهر");
  });

  it("returns correct description", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "My description",
    });
    expect(meta.description).toBe("My description");
  });

  it("includes metadataBase", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
    });
    expect(meta.metadataBase).toEqual(new URL(siteUrl));
  });

  it("sets alternates with canonical and languages", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
      path: "/about",
    });
    expect(meta.alternates).toEqual({
      canonical: "https://ibnalazhar-docs.vercel.app/ar/about",
      languages: {
        ar: "https://ibnalazhar-docs.vercel.app/ar/about",
      },
    });
  });

  it("og title uses Arabic site name for ar locale", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "الرئيسية",
      description: "D",
    });
    expect(meta.openGraph?.title).toContain(siteNameAr);
  });

  it("og title uses English site name for en locale", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "Home",
      description: "D",
    });
    expect(meta.openGraph?.title).toContain(siteName);
  });

  it("ogType defaults to website", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
    });
    expect(meta.openGraph?.type).toBe("website");
  });

  it("ogType can be set to article", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
      ogType: "article",
    });
    expect(meta.openGraph?.type).toBe("article");
  });

  it("publishedTime only included for article ogType", () => {
    const withArticle = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
      ogType: "article",
      publishedTime: "2025-01-01",
    });
    expect(withArticle.openGraph?.publishedTime).toBe("2025-01-01");

    const withWebsite = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
      ogType: "website",
      publishedTime: "2025-01-01",
    });
    expect(withWebsite.openGraph?.publishedTime).toBeUndefined();
  });

  it("image included in openGraph when provided", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
      image: "https://example.com/og.png",
    });
    expect(meta.openGraph?.images).toEqual([
      {
        url: "https://example.com/og.png",
        width: 1200,
        height: 630,
        alt: "منصة ابن الأزهر للمستندات — معالجة وتنظيم محتوى الثانوية الأزهرية",
      },
    ]);
  });

  it("ogLocale is ar_AR for Arabic", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
    });
    expect(meta.openGraph?.locale).toBe("ar_AR");
  });

  it("ogLocale is always ar_AR (ar-only)", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
    });
    expect(meta.openGraph?.locale).toBe("ar_AR");
  });

  it("twitter card is summary_large_image", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
    });
    expect(meta.twitter?.card).toBe("summary_large_image");
  });

  it("robots allows indexing and following", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
    });
    expect(meta.robots?.index).toBe(true);
    expect(meta.robots?.follow).toBe(true);
    expect(meta.robots?.googleBot).toBeDefined();
  });
});
