import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import {
  getContentCollection,
  getCategoryDescription,
  getCategoryIcon,
  getCategoryTotalReadingTime,
  getJourneys,
  getRecentDocs,
} from "@/lib/content";
import { Container } from "@/components/ui/container";
import { KnowledgeHero } from "@/components/discovery/knowledge-hero";
import { CategoryCard } from "@/components/discovery/category-card";
import { JourneyCard } from "@/components/discovery/journey-card";

interface DocsIndexPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DocsIndexPageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "ar" ? "المكتبة — ابن الأزهر دوكس" : "Library — Ibn Al-Azhar Docs";
  const description =
    locale === "ar"
      ? "تصفح مستندات المكتبة ومنصة المعرفة العربية"
      : "Browse library documents and Arabic knowledge platform";
  return generatePageMetadata({
    locale,
    title,
    description,
    path: "/docs",
  });
}

export default async function DocsIndexPage({ params }: DocsIndexPageProps) {
  const { locale } = await params;
  const collection = await getContentCollection(locale);
  const journeys = await getJourneys(locale);
  const recent = await getRecentDocs(locale);

  const categoriesWithStats = await Promise.all(
    collection.categories.map(async (cat) => {
      const totalReadingTime = await getCategoryTotalReadingTime(cat.id, locale);
      return { ...cat, totalReadingTime };
    })
  );

  return (
    <div className="min-h-screen pt-24">
      <Container size="lg">
        <KnowledgeHero locale={locale} />

        {journeys.length > 0 && (
          <>
            <hr className="section-divider" />
            <section>
              <div className="discovery-section-header">
                <h2>{locale === "ar" ? "مسارات القراءة" : "Reading Journeys"}</h2>
                <a href={`/${locale}/journeys`} className="section-link">
                  {locale === "ar" ? "جميع المسارات ←" : "All journeys →"}
                </a>
              </div>
              <div className="journey-grid">
                {journeys.slice(0, 3).map((j) => (
                  <JourneyCard key={j.slug} journey={j} locale={locale} />
                ))}
              </div>
            </section>
          </>
        )}

        <hr className="section-divider" />

        <section>
          <div className="discovery-section-header">
            <h2>{locale === "ar" ? "التصنيفات" : "Categories"}</h2>
          </div>
          <div className="category-grid">
            {categoriesWithStats.map((cat) => (
              <CategoryCard
                key={cat.id}
                id={cat.id}
                label={cat.label}
                description={getCategoryDescription(cat.id, locale)}
                icon={getCategoryIcon(cat.id)}
                docCount={cat.docs.length}
                totalReadingTime={cat.totalReadingTime}
                locale={locale}
              />
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <>
            <hr className="section-divider" />
            <section>
              <div className="discovery-section-header">
                <h2>{locale === "ar" ? "أحدث المستندات" : "Recent Documents"}</h2>
              </div>
              <div className="recent-docs-grid">
                {recent.map((doc) => (
                  <a
                    key={doc.slug}
                    href={`/${locale}/docs/${doc.category}/${doc.slug}`}
                    className="recent-doc-card"
                  >
                    <div className="recent-doc-category">
                      {collection.categories.find((c) => c.id === doc.category)?.label ??
                        doc.category}
                    </div>
                    <div className="recent-doc-title">{doc.metadata.title}</div>
                    <div className="recent-doc-meta">
                      {doc.metadata.readingTime} {locale === "ar" ? "دقائق" : "min"} ·{" "}
                      {doc.metadata.date}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
      </Container>
    </div>
  );
}
