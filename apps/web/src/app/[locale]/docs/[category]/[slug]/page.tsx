import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { generatePageMetadata } from "@/lib/frontend/metadata";
import {
  getDocContent,
  getDocNavigation,
  getCategoryLabel,
  getAllDocs,
  getRelatedDocs,
  getPrerequisiteDocs,
  getContinuationDoc,
  getDocJourneys,
} from "@/lib/backend/content";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { Breadcrumbs } from "@/components/reading/breadcrumbs";
import { DocMetadataBar } from "@/components/reading/doc-metadata";
import { DocNavigation } from "@/components/reading/doc-navigation";
import { TOC } from "@/components/reading/toc";
import { ReadingProgress } from "@/components/reading/reading-progress";
import { Container } from "@/components/ui/container";
import { JourneyContext } from "@/components/discovery/journey-context";
import { RelatedDocs } from "@/components/discovery/related-docs";
import { PrerequisiteBanner } from "@/components/discovery/prerequisite-banner";
import { ContinuationLink } from "@/components/discovery/continuation-link";

interface DocPageProps {
  params: Promise<{ locale: string; category: string; slug: string }>;
}

export async function generateStaticParams(): Promise<
  { locale: string; category: string; slug: string }[]
> {
  const locales = ["ar", "en"];
  const params: { locale: string; category: string; slug: string }[] = [];

  for (const locale of locales) {
    const docs = await getAllDocs(locale);
    for (const doc of docs) {
      params.push({ locale, category: doc.category, slug: doc.slug });
    }
  }

  return params;
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const doc = await getDocContent(locale, category, slug);
  if (!doc) return { title: "Not Found" };

  return generatePageMetadata({
    locale,
    title: doc.metadata.title,
    description: doc.metadata.subtitle,
    path: `/docs/${category}/${slug}`,
    ogType: "article",
    publishedTime: doc.metadata.date,
  });
}

export default async function DocPage({ params }: DocPageProps) {
  const { locale, category, slug } = await params;
  const doc = await getDocContent(locale, category, slug);

  if (!doc) {
    notFound();
  }

  const { content } = await compileMDX({
    source: doc.content,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, rehypeHighlight],
      },
    },
  });

  const { prev, next } = await getDocNavigation(locale, slug);
  const categoryLabel = getCategoryLabel(category, locale);
  const relatedDocs = await getRelatedDocs(locale, slug);
  const prerequisiteDocs = await getPrerequisiteDocs(locale, slug);
  const continuationDoc = await getContinuationDoc(locale, slug);
  const journeyContext = await getDocJourneys(locale, slug);

  return (
    <>
      <ReadingProgress />
      <div className="min-h-screen pt-24">
        <Container size="lg">
          <div className="mb-6">
            <Breadcrumbs
              locale={locale}
              category={category}
              categoryLabel={categoryLabel}
              title={doc.metadata.title}
            />
          </div>

          <div className="reading-view">
            <article className="reading-content" itemScope itemType="https://schema.org/Article">
              <header className="mb-8">
                <JourneyContext journeys={journeyContext} locale={locale} />

                <h1 className="text-4xl font-extrabold leading-[1.2] tracking-tight text-primary-color sm:text-5xl">
                  {doc.metadata.title}
                </h1>
                {doc.metadata.subtitle && (
                  <p className="mt-3 text-lg leading-relaxed text-muted-color">
                    {doc.metadata.subtitle}
                  </p>
                )}
                <div className="mt-4">
                  <DocMetadataBar
                    metadata={doc.metadata}
                    locale={locale}
                    categoryLabel={categoryLabel}
                  />
                </div>
              </header>

              <PrerequisiteBanner docs={prerequisiteDocs} locale={locale} />

              <div className="reading-prose">{content}</div>

              <ContinuationLink doc={continuationDoc} locale={locale} />

              <RelatedDocs docs={relatedDocs} locale={locale} />

              <DocNavigation prev={prev} next={next} locale={locale} />
            </article>

            <aside className="toc-sidebar hidden lg:block" aria-label="Sidebar">
              <TOC />
            </aside>
          </div>
        </Container>
      </div>
    </>
  );
}
