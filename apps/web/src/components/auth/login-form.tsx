"use client";

import { useActionState, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { loginSchema } from "@/lib/validators/auth";
import { EyeIcon } from "@/components/ui/icons";

export function LoginForm() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const [showPassword, setShowPassword] = useState(false);

  const [error, submitAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      };

      const validation = loginSchema.safeParse(data);
      if (!validation.success) {
        const firstError = validation.error.issues[0];
        return firstError?.message || t("validationError");
      }

      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (result?.error) {
          return t("loginError");
        }

        window.location.href = `/${locale}/dashboard`;
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

      <div className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold tracking-[0.04em] text-primary-color"
          >
            {t("emailLabel")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5 block w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-primary-color placeholder-[var(--text-tertiary)] transition-all focus:border-[var(--success)] focus:ring-2 focus:ring-[var(--success)]/20 focus:outline-none"
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold tracking-[0.04em] text-primary-color"
          >
            {t("passwordLabel")}
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="block w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 ps-10 text-sm text-primary-color placeholder-[var(--text-tertiary)] transition-all focus:border-[var(--success)] focus:ring-2 focus:ring-[var(--success)]/20 focus:outline-none"
              placeholder={t("passwordPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 start-0 flex items-center ps-3 text-[var(--icon-muted)] transition-colors hover:text-muted-color"
              tabIndex={-1}
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[var(--btn-primary-bg)] px-4 py-3 text-xs font-bold tracking-[0.08em] text-[var(--btn-primary-text)] transition-all hover:opacity-90 hover:translate-y-[-1px] hover:shadow-[0_4px_16px_rgba(26,92,58,0.2)] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {isPending ? t("loggingIn") : t("loginButton")}
      </button>

      <p className="text-center text-xs text-[var(--text-tertiary)]">{t("tagline")}</p>
    </form>
  );
}
