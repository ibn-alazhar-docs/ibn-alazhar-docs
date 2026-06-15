"use client";

import { useTranslations } from "next-intl";
import { UploadIcon, ScanIcon, ExportIcon } from "@/components/ui/icons";
import { GeometricStar } from "@/components/ui/geometric-star";

interface KnowledgeItem {
  title: string;
  description: string;
}

function IconSlot({ index, className }: { index: number; className: string }) {
  switch (index) {
    case 0:
      return <UploadIcon className={className} />;
    case 1:
      return <ScanIcon className={className} />;
    case 2:
      return <ExportIcon className={className} />;
    default:
      return null;
  }
}

export function KnowledgeAreas() {
  const t = useTranslations("section.knowledgeAreas");
  const items = t.raw("items") as KnowledgeItem[];

  return (
    <section className="border-t border-subtle" aria-labelledby="how-it-works-title">
      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-32">
        <div className="mb-16 flex items-center gap-3">
          <h2
            id="how-it-works-title"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--badge-bg)] px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-muted-color uppercase"
          >
            {t("title")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((item, index) => (
            <article
              key={item.title}
              className="group relative flex flex-col gap-4 rounded-xl border border-[var(--border-line)] bg-[var(--card-bg)] p-8 transition-all duration-300 hover:border-[var(--text-tertiary)] hover:translate-y-[-2px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.05)] sm:p-10"
            >
              <IconSlot index={index} className="h-5 w-5 fill-icon" />
              <h3 className="heading-display-sm text-lg font-bold text-primary-color">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-color">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="geometric-divider mt-16">
          <GeometricStar className="geometric-star h-3.5 w-3.5" />
        </div>
      </div>
    </section>
  );
}
