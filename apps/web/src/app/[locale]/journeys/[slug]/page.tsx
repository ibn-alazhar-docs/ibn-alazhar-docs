import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "@/lib/metadata";
import { getJourney, getJourneys, getCategoryLabel } from "@/lib/content";
import { Container } from "@/components/ui/container";

interface JourneyDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams(): Promise<{ locale: string; slug: string }[]> {
  const locales = ["ar", "en"];
  const params: { locale: string; slug: string }[] = [];

  for (const locale of locales) {
    const journeys = await getJourneys(locale);
    for (const j of journeys) {
      params.push({ locale, slug: j.slug });
    }
  }

  return params;
}

export async function generateMetadata({ params }: JourneyDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const journey = await getJourney(slug, locale);
  if (!journey) return { title: "Not Found" };

  return generatePageMetadata({
    locale,
    title: journey.title,
    description: journey.description,
    path: `/journeys/${slug}`,
  });
}

export default async function JourneyDetailPage({ params }: JourneyDetailPageProps) {
  const { locale, slug } = await params;
  const journey = await getJourney(slug, locale);

  if (!journey) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-24">
      <Container size="md">
        <div className="mb-6">
          <a
            href={`/${locale}/journeys`}
            className="text-sm font-medium text-muted-color no-underline transition-colors hover:text-primary-color"
          >
            {locale === "ar" ? "→ مسارات القراءة" : "← Reading Journeys"}
          </a>
        </div>

        <div className="journey-header">
          <div className="journey-header-icon" aria-hidden="true">
            {journey.icon}
          </div>
          <h1>{journey.title}</h1>
          <p className="journey-description">{journey.description}</p>
          <div className="journey-stats">
            <span>
              {journey.docCount} {locale === "ar" ? "مستند" : "documents"}
            </span>
            <span>
              ~{journey.totalReadingTime} {locale === "ar" ? "دقيقة" : "min"}
            </span>
          </div>
        </div>

        <div className="journey-timeline">
          {journey.docs.map((doc, index) => (
            <div key={doc.slug} className="journey-step">
              <div className="journey-step-number">
                {locale === "ar" ? `الخطوة ${index + 1}` : `Step ${index + 1}`}
              </div>
              <a href={`/${locale}/docs/${doc.category}/${doc.slug}`}>
                <div className="journey-step-title">{doc.metadata.title}</div>
              </a>
              {doc.metadata.subtitle && (
                <div className="journey-step-subtitle">{doc.metadata.subtitle}</div>
              )}
              <div className="journey-step-meta">
                <span>
                  {doc.metadata.readingTime} {locale === "ar" ? "دقائق" : "min"}
                </span>
                <span>{getCategoryLabel(doc.category, locale)}</span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
