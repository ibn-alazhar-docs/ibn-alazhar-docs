import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/ui/metadata";
import { Container } from "@/ui/container";
import { GUEST_TOOLS, GUEST_TOOLS_LIMITS } from "@/shared/tools/guest-limits";
import { ToolCard } from "@/ui/tools/tool-card";

interface ToolsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams(): Promise<{ locale: string }[]> {
  return [{ locale: "ar" }, { locale: "en" }];
}

export async function generateMetadata({ params }: ToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMetadata({
    locale,
    title: t("title"),
    description: t("subtitle"),
    path: "/tools",
  });
}

export default async function ToolsPage({ params }: ToolsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  const tPrinciples = await getTranslations({
    locale,
    namespace: "tools.principles",
  });
  const principles = tPrinciples.raw("items") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <div className="min-h-screen pt-24">
      <Container size="lg">
        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-extrabold text-primary-color">{t("title")}</h1>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {t("noAccountBadge")}
            </span>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-secondary-color">
            {t("subtitle")}
          </p>
        </header>

        <ul className="mb-10 flex flex-wrap gap-2 text-xs font-medium text-secondary-color">
          <li className="rounded-full border border-[var(--border-color,rgba(0,0,0,0.12))] px-3 py-1.5">
            {t("limits.maxSize")}
          </li>
          <li className="rounded-full border border-[var(--border-color,rgba(0,0,0,0.12))] px-3 py-1.5">
            {t("limits.maxPages")}
          </li>
          <li className="rounded-full border border-[var(--border-color,rgba(0,0,0,0.12))] px-3 py-1.5">
            {t("limits.queue")} ({GUEST_TOOLS_LIMITS.maxConcurrentJobsTotal}/
            {GUEST_TOOLS_LIMITS.maxConcurrentJobsPerTool}/
            {GUEST_TOOLS_LIMITS.maxConcurrentJobsPerIp})
          </li>
          <li className="rounded-full border border-[var(--border-color,rgba(0,0,0,0.12))] px-3 py-1.5">
            {t("limits.ttl")}
          </li>
        </ul>

        <div className="mb-12 grid gap-5 sm:grid-cols-2">
          {GUEST_TOOLS.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              name={t(`items.${tool.i18nKey}.name`)}
              tagline={t(`items.${tool.i18nKey}.tagline`)}
              cta={t(`items.${tool.i18nKey}.cta`)}
              badge={t(`items.${tool.i18nKey}.badge`)}
            />
          ))}
        </div>

        <section aria-labelledby="guest-principles">
          <h2
            id="guest-principles"
            className="mb-5 text-xl font-bold text-primary-color"
          >
            {tPrinciples("title")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--border-color,rgba(0,0,0,0.08))] bg-[var(--card-bg,#fff)] p-5"
              >
                <h3 className="mb-2 text-sm font-bold text-primary-color">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-secondary-color">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
