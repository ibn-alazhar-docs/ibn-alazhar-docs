"use client";

import { useTranslations } from "next-intl";
import { ShieldIcon, CheckIcon, FolderIcon, FileTextIcon } from "@/components/ui/icons";
import { GeometricStar } from "@/components/ui/geometric-star";

interface FeatureItem {
  title: string;
  description: string;
}

function IconSlot({ index, className }: { index: number; className: string }) {
  switch (index) {
    case 0:
      return <ShieldIcon className={className} />;
    case 1:
      return <CheckIcon className={className} />;
    case 2:
      return <FolderIcon className={className} />;
    case 3:
      return <FileTextIcon className={className} />;
    default:
      return null;
  }
}

export function Features() {
  const t = useTranslations("section.features");
  const items = t.raw("items") as FeatureItem[];

  return (
    <section className="border-t border-subtle" aria-labelledby="features-title">
      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-32">
        <div className="mb-16 flex items-center gap-3">
          <span
            id="features-title"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--badge-bg)] px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-muted-color uppercase"
          >
            {t("title")}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((item, index) => (
            <article
              key={item.title}
              className="group relative flex flex-col gap-4 rounded-xl border border-[var(--border-line)] bg-[var(--card-bg)] p-8 transition-all duration-300 hover:border-[var(--text-tertiary)] hover:translate-y-[-2px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.05)] sm:p-10"
            >
              <IconSlot index={index} className="h-5 w-5 fill-icon" />
              <h3 className="heading-display-sm text-lg font-bold text-primary-color">
                {item.title}
              </h3>
              <p className="max-w-lg text-sm leading-relaxed text-muted-color">
                {item.description}
              </p>
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
