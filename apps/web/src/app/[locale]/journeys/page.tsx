import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { getJourneys } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { JourneyCard } from "@/components/discovery/journey-card";

interface JourneysIndexPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams(): Promise<{ locale: string }[]> {
  return [{ locale: "ar" }, { locale: "en" }];
}

export async function generateMetadata({ params }: JourneysIndexPageProps): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "ar" ? "مسارات القراءة — ابن الأزهر دوكس" : "Reading Journeys — Ibn Al-Azhar Docs";
  const description =
    locale === "ar"
      ? "مسارات قراءة منظمة ومنسقة لاستكشاف المعرفة في المكتبة"
      : "Curated reading paths for exploring knowledge in the library";
  return generatePageMetadata({
    locale,
    title,
    description,
    path: "/journeys",
  });
}

export default async function JourneysIndexPage({ params }: JourneysIndexPageProps) {
  const { locale } = await params;
  const journeys = await getJourneys(locale);

  return (
    <div className="min-h-screen pt-24">
      <Container size="lg">
        <div className="mb-6">
          <a
            href={`/${locale}/docs`}
            className="text-sm font-medium text-muted-color no-underline transition-colors hover:text-primary-color"
          >
            {locale === "ar" ? "← العودة إلى المكتبة" : "← Back to Library"}
          </a>
        </div>

        <h1 className="mb-2 text-3xl font-extrabold text-primary-color">
          {locale === "ar" ? "مسارات القراءة" : "Reading Journeys"}
        </h1>

        <p className="journeys-intro">
          {locale === "ar"
            ? "مسارات قراءة منظمة يصممها فريق التحرير لترشدك في استكشاف المعرفة. كل مسار هو رحلة متكاملة تبدأ من نقطة وصولًا إلى أخرى."
            : "Curated reading paths designed by the editorial team to guide your knowledge exploration. Each path is a complete journey from start to finish."}
        </p>

        {journeys.length === 0 ? (
          <p className="text-very-muted">
            {locale === "ar" ? "لا توجد مسارات قراءة بعد" : "No reading journeys yet"}
          </p>
        ) : (
          <div className="journey-grid">
            {journeys.map((j) => (
              <JourneyCard key={j.slug} journey={j} locale={locale} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
