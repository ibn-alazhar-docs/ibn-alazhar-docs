"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resetPasswordSchema } from "@/lib/shared/validators/auth";

interface ActionState {
  error: string | null;
  success: boolean;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, submitAction, isPending] = useActionState<ActionState, FormData>(
    async (_prevState, formData) => {
      try {
        if (!token) {
          return { error: t("resetPasswordInvalid"), success: false };
        }

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Zod validation (same policy as registration)
        const validation = resetPasswordSchema.safeParse({
          email,
          token,
          password,
          confirmPassword,
        });
        if (!validation.success) {
          const fieldErrors: {
            email?: string;
            password?: string;
            confirmPassword?: string;
          } = {};
          validation.error.issues.forEach((issue) => {
            const path = issue.path[0] as "email" | "password" | "confirmPassword";
            if (path === "email") {
              fieldErrors.email = !email ? t("emailRequired") : t("validationError");
            } else if (path === "password") {
              fieldErrors.password = !password ? t("passwordRequired") : t("passwordHint");
            } else if (path === "confirmPassword") {
              fieldErrors.confirmPassword = t("confirmPasswordError");
            }
          });
          return { error: null, success: false, fieldErrors };
        }

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, token, password, confirmPassword }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          return {
            error: data?.error?.message || t("unexpectedError"),
            success: false,
          };
        }

        return { error: null, success: true };
      } catch {
        return { error: t("unexpectedError"), success: false };
      }
    },
    { error: null, success: false },
  );

  if (!token && !state.success) {
    return (
      <div className="mt-8">
        <div
          className="rounded-xl border border-danger/20 bg-danger/5 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-danger">{t("resetPasswordInvalid")}</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted-color">
          <Link
            href="/forgot-password"
            className="font-semibold text-gold underline underline-offset-4 decoration-1 decoration-gold/20 hover:decoration-gold/50 transition-colors"
          >
            {t("forgotPasswordLink")}
          </Link>
        </p>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="mt-8">
        <div
          className="rounded-xl border border-success/20 bg-success/5 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-success">{t("resetPasswordSuccess")}</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted-color">
          <Link
            href="/login"
            className="font-semibold text-gold underline underline-offset-4 decoration-1 decoration-gold/20 hover:decoration-gold/50 transition-colors"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5 text-start" action={submitAction}>
      {state.error && (
        <div
          className="rounded-xl border border-danger/20 bg-danger/5 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-danger">{state.error}</p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-bold text-muted-color">{t("emailLabel")}</label>
        <input
          type="email"
          name="email"
          dir="ltr"
          autoComplete="email"
          aria-invalid={!!state.fieldErrors?.email}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
          placeholder={t("emailPlaceholder")}
        />
        {state.fieldErrors?.email && (
          <p className="mt-1.5 text-xs text-danger" id="email-error" role="alert">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold text-muted-color">
          {t("passwordLabel")}
        </label>
        <input
          type="password"
          name="password"
          dir="ltr"
          autoComplete="new-password"
          aria-invalid={!!state.fieldErrors?.password}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
          placeholder={t("passwordPlaceholder")}
        />
        {state.fieldErrors?.password && (
          <p className="mt-1.5 text-xs text-danger" id="password-error" role="alert">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold text-muted-color">
          {t("confirmPasswordLabel")}
        </label>
        <input
          type="password"
          name="confirmPassword"
          dir="ltr"
          autoComplete="new-password"
          aria-invalid={!!state.fieldErrors?.confirmPassword}
          aria-describedby={
            state.fieldErrors?.confirmPassword ? "confirmPassword-error" : undefined
          }
          className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
          placeholder={t("confirmPasswordPlaceholder")}
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="mt-1.5 text-xs text-danger" id="confirmPassword-error" role="alert">
            {state.fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="landing-btn-primary flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold tracking-[0.04em] no-underline shadow-[0_4px_14px_0_var(--btn-shadow)] disabled:opacity-50 transition-all hover:shadow-lg cursor-pointer"
      >
        {isPending ? t("loggingIn") : t("resetPasswordButton")}
      </button>

      <p className="text-center text-xs text-very-muted">
        <Link
          href="/login"
          className="font-semibold text-gold underline underline-offset-4 decoration-1 decoration-gold/20 hover:decoration-gold/50 transition-colors"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
