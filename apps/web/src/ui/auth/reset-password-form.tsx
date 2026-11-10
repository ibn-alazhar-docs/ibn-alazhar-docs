"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resetPasswordSchema } from "@/shared/validators/auth";
import { apiFetch } from "@/shared/api";
import { FormField } from "./form-field";

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

        const response = await apiFetch("/api/auth/reset-password", {
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
          className="rounded-lg border border-danger/20 bg-danger-bg p-4"
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
          className="rounded-lg border border-success/20 bg-success-bg p-4"
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
          className="rounded-lg border border-danger/20 bg-danger-bg p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-danger">{state.error}</p>
        </div>
      )}

      <FormField
        type="email"
        name="email"
        label={t("emailLabel")}
        autoComplete="email"
        placeholder={t("emailPlaceholder")}
        error={state.fieldErrors?.email}
      />

      <FormField
        type="password"
        name="password"
        label={t("passwordLabel")}
        autoComplete="new-password"
        placeholder={t("passwordPlaceholder")}
        error={state.fieldErrors?.password}
      />

      <FormField
        type="password"
        name="confirmPassword"
        label={t("confirmPasswordLabel")}
        autoComplete="new-password"
        placeholder={t("confirmPasswordPlaceholder")}
        error={state.fieldErrors?.confirmPassword}
      />

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
