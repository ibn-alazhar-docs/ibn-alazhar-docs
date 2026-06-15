import { describe, it, expect } from "vitest";

const siteName = "Ibn Al-Azhar Files";
const siteNameAr = "ملفات ابن الأزهر";
const siteUrl = "https://ibnalazhar-docs.vercel.app";

function getLocaleUrl(locale: string, path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}/${locale}${cleanPath}`;
}

interface PageMetadataOptions {
  locale: string;
  title: string;
  description: string;
  path?: string;
  ogType?: string;
  publishedTime?: string;
  image?: string;
}

function generatePageMetadata({
  locale,
  title,
  description,
  path = "",
  ogType = "website",
  publishedTime,
  image,
}: PageMetadataOptions) {
  const url = getLocaleUrl(locale, path);
  const isAr = locale === "ar";
  const ogLocale = isAr ? "ar_AR" : "en_US";
  const fullTitle = title.includes("—") ? title : `${title} — ${isAr ? siteNameAr : siteName}`;

  const og: Record<string, unknown> = {
    title: fullTitle,
    description,
    url,
    locale: ogLocale,
    type: ogType,
  };

  if (image) {
    og.images = [{ url: image, width: 1200, height: 630 }];
  }

  if (ogType === "article" && publishedTime) {
    og.publishedTime = publishedTime;
  }

  const alternates: Record<string, string> = {};
  const arPath = getLocaleUrl("ar", path);
  const enPath = getLocaleUrl("en", path);
  alternates[isAr ? "en" : "ar"] = isAr ? enPath : arPath;
  alternates.canonical = url;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(siteUrl),
    alternates,
    openGraph: og,
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: { index: true, follow: true },
  };
}

describe("getLocaleUrl", () => {
  it("returns correct url with leading slash path", () => {
    expect(getLocaleUrl("ar", "/about")).toBe("https://ibnalazhar-docs.vercel.app/ar/about");
  });

  it("prepends slash when path lacks one", () => {
    expect(getLocaleUrl("en", "contact")).toBe("https://ibnalazhar-docs.vercel.app/en/contact");
  });

  it("handles empty path", () => {
    expect(getLocaleUrl("ar")).toBe("https://ibnalazhar-docs.vercel.app/ar/");
  });

  it("works with ar locale", () => {
    expect(getLocaleUrl("ar", "/docs")).toContain("/ar/docs");
  });

  it("works with en locale", () => {
    expect(getLocaleUrl("en", "/docs")).toContain("/en/docs");
  });

  it("handles deep nested path", () => {
    expect(getLocaleUrl("ar", "/a/b/c/d")).toBe("https://ibnalazhar-docs.vercel.app/ar/a/b/c/d");
  });

  it("returns correct format for both locales", () => {
    const arUrl = getLocaleUrl("ar", "/page");
    const enUrl = getLocaleUrl("en", "/page");
    expect(arUrl).toMatch(/\/ar\/page$/);
    expect(enUrl).toMatch(/\/en\/page$/);
  });
});

describe("generatePageMetadata", () => {
  it("returns correct title with site name appended", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "Home",
      description: "Welcome",
    });
    expect(meta.title).toBe("Home — Ibn Al-Azhar Files");
  });

  it("returns correct description", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "My description",
    });
    expect(meta.description).toBe("My description");
  });

  it("includes metadataBase", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
    });
    expect(meta.metadataBase).toEqual(new URL(siteUrl));
  });

  it("sets alternates for Arabic locale", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
      path: "/about",
    });
    expect(meta.alternates.en).toBe("https://ibnalazhar-docs.vercel.app/en/about");
  });

  it("sets alternates for English locale", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
      path: "/about",
    });
    expect(meta.alternates.ar).toBe("https://ibnalazhar-docs.vercel.app/ar/about");
  });

  it("og title uses Arabic site name for ar locale", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "الرئيسية",
      description: "D",
    });
    expect(meta.openGraph.title).toContain(siteNameAr);
  });

  it("og title uses English site name for en locale", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "Home",
      description: "D",
    });
    expect(meta.openGraph.title).toContain(siteName);
  });

  it("ogType defaults to website", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
    });
    expect(meta.openGraph.type).toBe("website");
  });

  it("ogType can be set to article", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
      ogType: "article",
    });
    expect(meta.openGraph.type).toBe("article");
  });

  it("publishedTime only included for article ogType", () => {
    const withArticle = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
      ogType: "article",
      publishedTime: "2025-01-01",
    });
    expect(withArticle.openGraph.publishedTime).toBe("2025-01-01");

    const withWebsite = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
      ogType: "website",
      publishedTime: "2025-01-01",
    });
    expect(withWebsite.openGraph.publishedTime).toBeUndefined();
  });

  it("image included in openGraph when provided", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
      image: "https://example.com/og.png",
    });
    expect(meta.openGraph.images).toEqual([
      { url: "https://example.com/og.png", width: 1200, height: 630 },
    ]);
  });

  it("ogLocale is ar_AR for Arabic", () => {
    const meta = generatePageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
    });
    expect(meta.openGraph.locale).toBe("ar_AR");
  });

  it("ogLocale is en_US for English", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
    });
    expect(meta.openGraph.locale).toBe("en_US");
  });

  it("twitter card is summary_large_image", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
    });
    expect(meta.twitter.card).toBe("summary_large_image");
  });

  it("robots allows indexing and following", () => {
    const meta = generatePageMetadata({
      locale: "en",
      title: "T",
      description: "D",
    });
    expect(meta.robots).toEqual({ index: true, follow: true });
  });
});
