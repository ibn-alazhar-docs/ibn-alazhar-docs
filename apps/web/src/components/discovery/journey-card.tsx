import { getTranslations } from "next-intl/server";
import type { JourneyEntry } from "@/lib/backend/content";

interface JourneyCardProps {
  journey: JourneyEntry;
  locale: string;
}

export async function JourneyCard({ journey, locale }: JourneyCardProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  return (
    <a href={`/${locale}/journeys/${journey.slug}`} className="journey-card">
      <div className="journey-card-icon" aria-hidden="true">
        {journey.icon}
      </div>
      <div className="journey-card-title">{journey.title}</div>
      <p className="journey-card-description">{journey.description}</p>
      <div className="journey-card-meta">
        <span>
          {journey.docCount} {journey.docCount === 1 ? t("documents") : t("documentsPlural")}
        </span>
        <span>
          ~{journey.totalReadingTime} {t("minutes")}
        </span>
      </div>
    </a>
  );
}
