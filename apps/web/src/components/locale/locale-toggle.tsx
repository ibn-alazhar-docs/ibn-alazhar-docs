"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LocaleToggle() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const nextLocale = locale === "ar" ? "en" : "ar";

  function handleSwitch() {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  function switchLocale() {
    if (
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).hasUnsavedChanges === true
    ) {
      setShowConfirm(true);
    } else {
      handleSwitch();
    }
  }

  return (
    <>
      <button
        onClick={switchLocale}
        disabled={isPending}
        className="flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-[0.06em] text-muted-color transition-all hover:bg-hover hover:text-primary-color disabled:opacity-40"
        aria-label={t("toggle")}
      >
        {locale === "ar" ? "EN" : "AR"}
      </button>

      {showConfirm && (
        <ConfirmDialog
          title={t("switchTitle")}
          message={t("switchMessage")}
          confirmLabel={t("switchConfirm")}
          cancelLabel={tCommon("cancel")}
          variant="danger"
          onConfirm={() => {
            setShowConfirm(false);
            handleSwitch();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
