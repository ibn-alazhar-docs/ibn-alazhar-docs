"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { FcGoogle } from "react-icons/fc";

export function RegisterForm() {
  const t = useTranslations("auth");

  const [error, submitAction, isPending] = useActionState(async () => {
    try {
      const result = await signIn("google", {
        redirect: false,
        redirectTo: "/dashboard",
      });

      if (result?.error) {
        return t("registerError");
      }

      return null;
    } catch {
      return t("unexpectedError");
    }
  }, null);

  return (
    <form className="mt-8 space-y-6" action={submitAction}>
      {error && (
        <div
          className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-xs text-[var(--danger)]">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-3 text-sm font-bold tracking-[0.04em] text-[var(--text-primary)] transition-all hover:bg-[var(--hover-bg)] hover:shadow-sm disabled:opacity-50"
      >
        <FcGoogle className="h-5 w-5" />
        {isPending ? t("registering") : t("continueWithGoogle")}
      </button>

      <p className="text-center text-xs text-[var(--text-tertiary)]">{t("tagline")}</p>
    </form>
  );
}
