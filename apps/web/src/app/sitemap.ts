import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/constants";

const locales = ["ar"] as const;

function languageAlternates(path: string): Record<string, string> {
  return {
    ar: `${SITE_URL}/ar${path}`,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages for each locale
  const staticPaths = [""];
  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: path === "" ? 1.0 : 0.8,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}
