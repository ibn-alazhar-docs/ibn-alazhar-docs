"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FcGoogle } from "react-icons/fc";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [error, submitAction, isPending] = useActionState(
    async (_prevState: string | null, formData: FormData) => {
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
          return t("loginError");
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

        router.push("/dashboard");
        return null;
      } catch {
        return t("unexpectedError");
      }
    },
    null,
  );

  return (
    <form className="mt-8 space-y-5" action={submitAction}>
      {error && (
        <div
          className="rounded-xl border border-danger/20 bg-danger/5 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-danger">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold text-muted-color">البريد الإلكتروني</label>
          <input
            type="email"
            name="email"
            dir="ltr"
            className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
            placeholder="admin@ibnalazhar.app"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-muted-color">كلمة المرور</label>
          <input
            type="password"
            name="password"
            dir="ltr"
            className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="landing-btn-primary flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold tracking-[0.04em] no-underline shadow-[0_4px_14px_0_var(--btn-shadow)] disabled:opacity-50 transition-all hover:shadow-lg"
        >
          {isPending ? t("loggingIn") : t("signIn")}
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-3 text-xs text-very-muted font-medium">أو</span>
        </div>
      </div>

      <button
        type="submit"
        name="provider"
        value="google"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-page px-4 py-3 text-sm font-bold tracking-[0.04em] text-primary-color transition-all hover:bg-hover hover:border-gold/30 hover:shadow-sm disabled:opacity-50"
      >
        <FcGoogle className="h-5 w-5" />
        {isPending ? t("loggingIn") : t("continueWithGoogle")}
      </button>

      <p className="text-center text-xs text-very-muted">{t("tagline")}</p>
    </form>
  );
}
