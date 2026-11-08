import type { Metadata } from "next";
import { BRAND_NAME, BRAND_OG_ALT, BRAND_OG_IMAGE } from "./brand";
import { SITE_URL } from "@/shared/constants";

export const siteName = BRAND_NAME.ar;
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
  image = BRAND_OG_IMAGE,
}: PageMetadataOptions): Metadata {
  const url = getLocaleUrl(locale, path);
  const ogLocale = "ar_AR";
  const fullTitle = title.includes("—") ? title : `${title} — ${siteNameAr}`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
      languages: {
        ar: getLocaleUrl("ar", path),
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteNameAr,
      locale: ogLocale,
      type: ogType,
      ...(publishedTime && ogType === "article" && { publishedTime }),
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: BRAND_OG_ALT.ar,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
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
