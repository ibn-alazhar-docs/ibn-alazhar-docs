"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { FcGoogle } from "react-icons/fc";

export function LoginForm() {
  const t = useTranslations("auth");

  const [error, submitAction, isPending] = useActionState(
    async (prevState: string | null, formData: FormData) => {
      try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const isGoogle = formData.get("provider") === "google";

        if (isGoogle) {
          const result = await signIn("google", {
            redirect: false,
            redirectTo: "/dashboard",
          });
          if (result?.error) return t("loginError");
          return null;
        }

        if (!email || !password) {
          return t("loginError"); // or generic missing fields error
        }

        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          redirectTo: "/dashboard",
        });

        if (result?.error) {
          return t("loginError");
        }

        // Successful credentials login usually requires manual redirect or page refresh
        window.location.href = "/dashboard";
        return null;
      } catch {
        return t("unexpectedError");
      }
    },
    null,
  );

  return (
    <form className="mt-8 space-y-6" action={submitAction}>
      {error && (
        <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4">
          <p className="text-xs text-[var(--danger)]">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            name="email"
            dir="ltr"
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--input-focus)]"
            placeholder="admin@ibnalazhar.app"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
            كلمة المرور
          </label>
          <input
            type="password"
            name="password"
            dir="ltr"
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--input-focus)]"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="landing-btn-primary flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold tracking-[0.04em] no-underline shadow-[0_4px_14px_0_var(--btn-shadow)] disabled:opacity-50"
        >
          {isPending ? t("loggingIn") : t("signIn")}
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-line)]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[var(--card-bg)] px-2 text-xs text-[var(--text-tertiary)]">أو</span>
        </div>
      </div>

      <button
        type="submit"
        name="provider"
        value="google"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-3 text-sm font-bold tracking-[0.04em] text-[var(--text-primary)] transition-all hover:bg-[var(--hover-bg)] hover:shadow-sm disabled:opacity-50"
      >
        <FcGoogle className="h-5 w-5" />
        {isPending ? t("loggingIn") : t("continueWithGoogle")}
      </button>

      <p className="text-center text-xs text-[var(--text-tertiary)]">{t("tagline")}</p>
    </form>
  );
}
