import type { MetadataRoute } from "next";
import { getAllDocs, getJourneys } from "@/lib/backend/content";
import { SITE_URL } from "@/lib/shared/constants";

const locales = ["ar", "en"] as const;

function languageAlternates(path: string): Record<string, string> {
  return {
    ar: `${SITE_URL}/ar${path}`,
    en: `${SITE_URL}/en${path}`,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages for each locale
  const staticPaths = ["", "/docs", "/journeys"];
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

  // Doc pages for each locale
  for (const locale of locales) {
    const docs = await getAllDocs(locale);
    for (const doc of docs) {
      const path = `/docs/${doc.category}/${doc.slug}`;
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(doc.metadata.date),
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  // Journey pages for each locale
  for (const locale of locales) {
    const journeys = await getJourneys(locale);
    for (const journey of journeys) {
      const path = `/journeys/${journey.slug}`;
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}
