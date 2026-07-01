import type { Metadata } from "next";
import { BRAND_NAME } from "./brand";
import { SITE_URL } from "@/lib/shared/constants";

export const siteName = BRAND_NAME.en;
export const siteNameAr = BRAND_NAME.ar;

export function getLocaleUrl(locale: string, path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}/${locale}${cleanPath}`;
}

export interface PageMetadataOptions {
  locale: string;
  title: string;
  description: string;
  path?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  image?: string;
}

export function generatePageMetadata({
  locale,
  title,
  description,
  path = "",
  ogType = "website",
  publishedTime,
  image,
}: PageMetadataOptions): Metadata {
  const url = getLocaleUrl(locale, path);
  const isAr = locale === "ar";
  const ogLocale = isAr ? "ar_AR" : "en_US";
  const fullTitle = title.includes("—") ? title : `${title} — ${isAr ? siteNameAr : siteName}`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
      languages: {
        ar: getLocaleUrl("ar", path),
        en: getLocaleUrl("en", path),
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: isAr ? siteNameAr : siteName,
      locale: ogLocale,
      type: ogType,
      ...(publishedTime && ogType === "article" && { publishedTime }),
      ...(image && {
        images: [{ url: image, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(image && { images: [image] }),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
