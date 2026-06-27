import type { MetadataRoute } from "next";
import { getAllDocs, getJourneys } from "@/lib/content";
import { SITE_URL } from "@/lib/constants";

const locales = ["ar", "en"] as const;

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
      });
    }
  }

  // Doc pages for each locale
  for (const locale of locales) {
    const docs = await getAllDocs(locale);
    for (const doc of docs) {
      entries.push({
        url: `${SITE_URL}/${locale}/docs/${doc.category}/${doc.slug}`,
        lastModified: new Date(doc.metadata.date),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Journey pages for each locale
  for (const locale of locales) {
    const journeys = await getJourneys(locale);
    for (const journey of journeys) {
      entries.push({
        url: `${SITE_URL}/${locale}/journeys/${journey.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
