import { getTranslations } from "next-intl/server";
import type { JourneyEntry } from "@/lib/content";

interface JourneyContextProps {
  journeys: JourneyEntry[];
  locale: string;
}

export async function JourneyContext({ journeys, locale }: JourneyContextProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  if (journeys.length === 0) return null;

  return (
    <div className="journey-context">
      {journeys.map((j) => (
        <span key={j.slug} className="journey-context-label">
          <span>{t("journeyPartOf")}</span>
          <a href={`/${locale}/journeys/${j.slug}`}>{j.title}</a>
        </span>
      ))}
    </div>
  );
}
