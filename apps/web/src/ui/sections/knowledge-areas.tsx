"use client";

import { useTranslations } from "next-intl";
import { UploadIcon, ScanIcon, ExportIcon } from "@/ui/icons";
import { GeometricStar } from "@/ui/geometric-star";
import * as motion from "motion/react-client";

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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export function KnowledgeAreas() {
  const t = useTranslations("section.knowledgeAreas");
  const items = t.raw("items") as KnowledgeItem[];

  return (
    <section className="relative" aria-labelledby="how-it-works-title">
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--btn-primary-bg)_0%,_transparent_60%)] opacity-[0.03] blur-[100px] pointer-events-none -z-10" />

      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10px" }}
          className="mb-16 flex items-center gap-3"
        >
          <h2
            id="how-it-works-title"
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-badge px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-tertiary uppercase"
          >
            {t("title")}
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10px" }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-3"
        >
          {items.map((item, index) => (
            <motion.article
              variants={itemVariants}
              key={item.title}
              className="card-manuscript group relative flex flex-col gap-4 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-lg sm:p-10"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-gold to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-[0.03] rounded-2xl" />

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/5 border border-gold/10 text-gold transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                <IconSlot index={index} className="h-6 w-6" />
              </div>

              <h3 className="heading-display-sm mt-2 text-lg font-bold text-primary-color">
                {item.title}
              </h3>

              <p className="text-sm leading-relaxed text-muted-color">
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
