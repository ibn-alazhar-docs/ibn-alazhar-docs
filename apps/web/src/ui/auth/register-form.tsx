"use client";

import { useActionState, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FcGoogle } from "react-icons/fc";
import { registerSchema } from "@/shared/validators/auth";
import { apiFetch } from "@/shared/api";
import { FormField } from "./form-field";

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
  const locale = useLocale();
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

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
        <FormField
          id="register-name"
          type="text"
          name="name"
          label={t("nameLabel")}
          placeholder={t("namePlaceholder")}
          error={state.fieldErrors?.name}
        />

        <FormField
          id="register-email"
          type="email"
          name="email"
          label={t("emailLabel")}
          placeholder={t("emailPlaceholder")}
          error={state.fieldErrors?.email}
        />

        <FormField
          id="register-password"
          type="password"
          name="password"
          label={t("passwordLabel")}
          placeholder="••••••••"
          error={state.fieldErrors?.password}
        />

        <FormField
          id="register-confirm-password"
          type="password"
          name="confirmPassword"
          label={t("confirmPasswordLabel")}
          placeholder="••••••••"
          error={state.fieldErrors?.confirmPassword}
        />

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
            onClick={() => {
              setGoogleLoading(true);
              signIn("google", { redirectTo: `/${locale}/dashboard` });
            }}
            disabled={isPending || googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-page px-4 py-3 text-sm font-bold tracking-[0.04em] text-primary-color transition-all hover:bg-hover hover:border-gold/30 hover:shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FcGoogle className="h-5 w-5" />
            {googleLoading ? t("signingUp") : t("continueWithGoogle")}
          </button>
        </>
      )}

      <p className="text-center text-xs text-very-muted">{t("tagline")}</p>
    </form>
  );
}
