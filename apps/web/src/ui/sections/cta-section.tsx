"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GeometricStar } from "@/ui/geometric-star";
import * as motion from "motion/react-client";
import { ArrowLeftIcon, ArrowRightIcon } from "@/ui/icons";

export function CTASection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const t = useTranslations("section.cta");
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <section className="relative isolate overflow-hidden bg-[var(--surface)]">
      {/* Decorative Background Elements */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--gold)_0%,_transparent_60%)] opacity-[0.06]"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: 1, ease: "easeInOut" }}
        />
        <div className="absolute -left-20 -top-20 opacity-[0.04]">
          <GeometricStar className="h-64 w-64 text-[var(--gold)]" />
        </div>
        <div className="absolute -bottom-20 -right-20 opacity-[0.04]">
          <GeometricStar className="h-48 w-48 text-[var(--text-tertiary)]" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-32 sm:py-40">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="max-w-2xl relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-gold uppercase">
            {t("eyebrow")}
          </div>

          <h2 className="heading-display text-balance text-4xl font-bold tracking-tight text-primary-color sm:text-5xl lg:text-6xl">
            {t("title")}
          </h2>

          <p className="mt-6 max-w-lg text-balance text-base leading-relaxed text-muted-color sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mt-12">
            {isLoggedIn ? (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block"
              >
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
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block"
              >
                <Link
                  href="/register"
                  className="landing-btn-primary inline-flex items-center justify-center gap-3 rounded-xl px-8 py-4 text-xs font-bold tracking-[0.1em] no-underline shadow-[0_4px_14px_0_var(--btn-shadow)]"
                >
                  {t("button")}
                  <span aria-hidden="true" className="flex items-center">
                    {isRtl ? <ArrowLeftIcon size={16} /> : <ArrowRightIcon size={16} />}
                  </span>
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
