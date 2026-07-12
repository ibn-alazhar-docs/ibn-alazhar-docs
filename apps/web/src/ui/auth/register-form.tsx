"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FcGoogle } from "react-icons/fc";
import { registerSchema } from "@/shared/validators/auth";
import { apiFetch } from "@/shared/api";

interface ActionState {
  error: string | null;
  fieldErrors?: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

export function RegisterForm({ showGoogle = false }: { showGoogle?: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [state, submitAction, isPending] = useActionState<ActionState, FormData>(
    async (_prevState, formData) => {
      try {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Zod validation
        const validation = registerSchema.safeParse({ name, email, password, confirmPassword });
        if (!validation.success) {
          const fieldErrors: {
            name?: string;
            email?: string;
            password?: string;
            confirmPassword?: string;
          } = {};
          validation.error.issues.forEach((issue) => {
            const path = issue.path[0] as "name" | "email" | "password" | "confirmPassword";
            if (path === "name") {
              fieldErrors.name = !name ? t("nameRequired") : t("validationError");
            } else if (path === "email") {
              fieldErrors.email = !email ? t("emailRequired") : t("validationError");
            } else if (path === "password") {
              fieldErrors.password = !password ? t("passwordRequired") : t("passwordHint");
            } else if (path === "confirmPassword") {
              fieldErrors.confirmPassword = t("confirmPasswordError");
            }
          });
          return { error: null, fieldErrors };
        }

        // Post to /api/auth/register
        const response = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password, confirmPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { error: data.error?.message || t("registerError") };
        }

        router.push("/login?registered=true");
        return { error: null };
      } catch {
        return { error: t("unexpectedError") };
      }
    },
    { error: null },
  );

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

      <div className="space-y-4">
        <div>
          <label htmlFor="register-name" className="mb-2 block text-xs font-bold text-muted-color">
            {t("nameLabel")}
          </label>
          <input
            id="register-name"
            type="text"
            name="name"
            aria-invalid={!!state.fieldErrors?.name}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
            className="w-full rounded-lg border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
            placeholder={t("namePlaceholder")}
            dir="ltr"
          />
          {state.fieldErrors?.name && (
            <p className="mt-1.5 text-xs text-danger" id="name-error" role="alert">
              {state.fieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-email" className="mb-2 block text-xs font-bold text-muted-color">
            {t("emailLabel")}
          </label>
          <input
            id="register-email"
            type="email"
            name="email"
            dir="ltr"
            aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            className="w-full rounded-lg border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
            placeholder={t("emailPlaceholder")}
          />
          {state.fieldErrors?.email && (
            <p className="mt-1.5 text-xs text-danger" id="email-error" role="alert">
              {state.fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="mb-2 block text-xs font-bold text-muted-color"
          >
            {t("passwordLabel")}
          </label>
          <input
            id="register-password"
            type="password"
            name="password"
            dir="ltr"
            aria-invalid={!!state.fieldErrors?.password}
            aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
            className="w-full rounded-lg border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
            placeholder="••••••••"
          />
          {state.fieldErrors?.password && (
            <p className="mt-1.5 text-xs text-danger" id="password-error" role="alert">
              {state.fieldErrors.password}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-confirm-password"
            className="mb-2 block text-xs font-bold text-muted-color"
          >
            {t("confirmPasswordLabel")}
          </label>
          <input
            id="register-confirm-password"
            type="password"
            name="confirmPassword"
            dir="ltr"
            aria-invalid={!!state.fieldErrors?.confirmPassword}
            aria-describedby={
              state.fieldErrors?.confirmPassword ? "confirmPassword-error" : undefined
            }
            className="w-full rounded-lg border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
            placeholder="••••••••"
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
          {isPending ? t("registering") : t("registerButton")}
        </button>
      </div>

      {showGoogle && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-3 text-xs text-very-muted font-medium">{t("or")}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { redirectTo: "/dashboard" })}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-page px-4 py-3 text-sm font-bold tracking-[0.04em] text-primary-color transition-all hover:bg-hover hover:border-gold/30 hover:shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FcGoogle className="h-5 w-5" />
            {isPending ? t("registering") : t("continueWithGoogle")}
          </button>
        </>
      )}

      <p className="text-center text-xs text-very-muted">{t("tagline")}</p>
    </form>
  );
}
