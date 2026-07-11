"use client";

import { useTranslations } from "next-intl";
import { ShieldIcon, CheckIcon, FolderIcon, FileTextIcon } from "@/ui/icons";
import { GeometricStar } from "@/ui/geometric-star";
import * as motion from "motion/react-client";

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

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export function Features() {
  const t = useTranslations("section.features");
  const items = t.raw("items") as FeatureItem[];

  return (
    <section className="relative" aria-labelledby="features-title">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--gold)_0%,_transparent_70%)] opacity-[0.03] blur-[80px] pointer-events-none -z-10" />

      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-32">
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-10px" }}
          className="mb-16 flex items-center gap-3"
        >
          <span
            id="features-title"
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-badge px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-tertiary uppercase"
          >
            {t("title")}
          </span>
        </motion.div>

        <motion.div
          initial="visible"
          whileInView="visible"
          viewport={{ once: true, margin: "-10px" }}
          transition={{ staggerChildren: 0.15 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {items.map((item, index) => (
            <motion.article
              variants={cardVariants}
              key={item.title}
              className="card-manuscript group relative flex flex-col gap-4 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-lg sm:p-10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-[0.03] rounded-2xl" />

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/5 border border-gold/10 text-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-gold/10">
                <IconSlot index={index} className="h-6 w-6" />
              </div>

              <h3 className="heading-display-sm mt-2 text-xl font-bold text-primary-color">
                {item.title}
              </h3>

              <p className="max-w-lg text-sm leading-relaxed text-muted-color">
                {item.description}
              </p>
            </motion.article>
          ))}
        </motion.div>

        <div className="geometric-divider mt-24">
          <GeometricStar className="geometric-star h-3.5 w-3.5" />
        </div>
      </div>
    </section>
  );
}
