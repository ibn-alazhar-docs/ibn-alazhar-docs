"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as motion from "motion/react-client";
import { ArrowLeftIcon, ArrowRightIcon } from "@/ui/icons";
import { GeometricStar } from "@/ui/geometric-star";

interface HeroProps {
  locale?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  isLoggedIn?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
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

export function Hero({ locale: localeProp, eyebrow, title, subtitle, cta, isLoggedIn }: HeroProps) {
  const t = useTranslations("section.hero");
  const localeFromHook = useLocale();
  const locale = localeProp || localeFromHook;
  const isRtl = locale === "ar";

  return (
    <section className="relative isolate min-h-[90dvh] overflow-hidden bg-[var(--page-bg)] pt-32 sm:pt-40 pb-16">
      {/* Dynamic Background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--gold)_0%,_transparent_55%)] opacity-[0.05]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.05, 0.07, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--btn-primary-bg)_0%,_transparent_55%)] opacity-[0.04]"
          animate={{ scale: [1, 1.08, 1], opacity: [0.04, 0.06, 0.04] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="absolute -right-20 top-10 opacity-[0.04] sm:-right-32 sm:top-0 sm:opacity-[0.06]">
          <GeometricStar className="h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] text-[var(--gold)]" />
        </div>

        <div className="absolute bottom-40 left-10 opacity-[0.03] hidden sm:block">
          <GeometricStar className="h-32 w-32 text-[var(--gold)]" />
        </div>
        <div className="absolute right-1/3 top-1/3 opacity-[0.02] hidden lg:block">
          <GeometricStar className="h-20 w-20 text-[var(--btn-primary-bg)]" />
        </div>

        <svg className="absolute inset-0 h-full w-full opacity-[0.012]" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="mx-auto flex min-h-[60dvh] max-w-6xl flex-col items-start justify-center px-6 pt-12 pb-8">
        <motion.div
          className="max-w-3xl"
          variants={containerVariants}
          initial="visible"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold-border)] bg-[var(--gold-bg)] px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-[var(--gold)] uppercase">
              {eyebrow || t("eyebrow")}
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="heading-display text-balance text-4xl font-bold leading-[1.15] tracking-tight text-[var(--text-primary)] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {title || t("title")}
          </motion.h1>

          <motion.div variants={itemVariants} className="geometric-divider my-8 max-w-md">
            <GeometricStar className="geometric-star h-5 w-5" />
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="max-w-xl text-balance text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg"
          >
            {subtitle || t("subtitle")}
          </motion.p>

          <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center gap-4">
            {isLoggedIn ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard"
                  className="landing-btn-primary inline-flex items-center justify-center gap-3 rounded-xl px-8 py-4 text-xs font-bold tracking-[0.1em] no-underline shadow-[0_4px_14px_0_var(--btn-shadow)]"
                >
                  {t("dashboardCTA")}
                  <span aria-hidden="true" className="flex items-center">
                    {isRtl ? <ArrowLeftIcon size={16} /> : <ArrowRightIcon size={16} />}
                  </span>
                </Link>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/register"
                  className="landing-btn-primary inline-flex items-center justify-center gap-3 rounded-xl px-8 py-4 text-xs font-bold tracking-[0.1em] no-underline shadow-[0_4px_14px_0_var(--btn-shadow)]"
                >
                  {cta || t("cta")}
                  <span aria-hidden="true" className="flex items-center">
                    {isRtl ? <ArrowLeftIcon size={16} /> : <ArrowRightIcon size={16} />}
                  </span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
