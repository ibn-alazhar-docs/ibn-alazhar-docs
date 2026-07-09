import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "@/ui/metadata";
import {
  getCategoryLabel,
  getCategoryDescription,
  getCategoryIcon,
  getCategoryThemes,
  getCategoryTotalReadingTime,
  getContentCollection,
} from "@/shared/content/index";
import { Container } from "@/ui/container";

interface CategoryPageProps {
  params: Promise<{ locale: string; category: string }>;
}

export async function generateStaticParams(): Promise<{ locale: string; category: string }[]> {
  const locales = ["ar", "en"];
  const params: { locale: string; category: string }[] = [];

  for (const locale of locales) {
    const collection = await getContentCollection(locale);
    for (const cat of collection.categories) {
      params.push({ locale, category: cat.id });
    }
  }

  return params;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, category } = await params;
  const label = getCategoryLabel(category, locale);
  const description = getCategoryDescription(category, locale);
  return generatePageMetadata({
    locale,
    title: label,
    description,
    path: `/docs/${category}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, category } = await params;
  const collection = await getContentCollection(locale);
  const cat = collection.categories.find((c) => c.id === category);

  if (!cat) {
    notFound();
  }

  const description = getCategoryDescription(category, locale);
  const icon = getCategoryIcon(category);
  const totalTime = await getCategoryTotalReadingTime(category, locale);
  const themeGroups = await getCategoryThemes(category, locale);

  return (
    <div className="min-h-screen pt-24">
      <Container size="lg">
        <div className="mb-8">
          <a
            href={`/${locale}/docs`}
            className="text-sm font-medium text-muted-color no-underline transition-colors hover:text-primary-color"
          >
            {locale === "ar" ? "→ العودة إلى المكتبة" : "← Back to Library"}
          </a>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            {icon}
          </span>
          <h1 className="text-3xl font-extrabold text-primary-color">{cat.label}</h1>
        </div>

        {description && <p className="category-intro">{description}</p>}

        <div className="category-stats">
          <span>
            {cat.docs.length} {locale === "ar" ? "مستند" : "documents"}
          </span>
          <span>
            ~{totalTime} {locale === "ar" ? "دقيقة قراءة" : "min reading"}
          </span>
        </div>

        <div>
          {themeGroups.map((group) => (
            <div key={group.theme} className="thematic-group">
              <div className="thematic-group-header">
                <span className="thematic-group-label">{group.label}</span>
                <span className="thematic-group-line" aria-hidden="true" />
              </div>
              {group.docs.map((doc) => (
                <a
                  key={doc.slug}
                  href={`/${locale}/docs/${cat.id}/${doc.slug}`}
                  className="doc-card"
                >
                  <div className="doc-card-title">{doc.metadata.title}</div>
                  {doc.metadata.subtitle && (
                    <div className="doc-card-subtitle">{doc.metadata.subtitle}</div>
                  )}
                  <div className="doc-card-meta">
                    <span>
                      {doc.metadata.readingTime} {locale === "ar" ? "دقائق" : "min"}
                    </span>
                    <span>{doc.metadata.date}</span>
                  </div>
                </a>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
