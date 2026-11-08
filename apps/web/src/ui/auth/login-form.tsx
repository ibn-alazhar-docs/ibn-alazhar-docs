"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { FcGoogle } from "react-icons/fc";
import { loginSchema } from "@/shared/validators/auth";
import { preCheckLogin } from "./actions";
import { FormField } from "./form-field";

interface ActionState {
  error: string | null;
  isLocked?: boolean;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
}

export function LoginForm({ showGoogle = false }: { showGoogle?: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";
  const [googleLoading, setGoogleLoading] = useState(false);

  const [state, submitAction, isPending] = useActionState<ActionState, FormData>(
    async (_prevState, formData) => {
      try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        // Zod validation
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          const fieldErrors: { email?: string; password?: string } = {};
          validation.error.issues.forEach((issue) => {
            const path = issue.path[0] as "email" | "password";
            if (path === "email") {
              fieldErrors.email = !email ? t("emailRequired") : t("validationError");
            } else if (path === "password") {
              fieldErrors.password = !password ? t("passwordRequired") : t("passwordHint");
            }
          });
          return { error: null, fieldErrors };
        }

        // Pre-check for lockouts and rate limits since NextAuth swallows custom errors
        const preCheck = await preCheckLogin(email);
        if (preCheck.error) {
          if (preCheck.error === "AccountLocked") {
            return { error: t("accountLocked"), isLocked: true };
          }
          if (preCheck.error === "IpRateLimit") {
            return { error: t("ipRateLimit"), isLocked: true };
          }
        }

        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          redirectTo: "/dashboard",
        });

        // Fallback for custom errors if NextAuth ever starts supporting them
        if (result?.error === "AccountLocked") {
          return { error: t("accountLocked"), isLocked: true };
        }
        if (result?.error === "IpRateLimit") {
          return { error: t("ipRateLimit"), isLocked: true };
        }
        if (result?.error) {
          return { error: t("loginError") };
        }

        router.push("/dashboard");
        return { error: null };
      } catch {
        return { error: t("unexpectedError") };
      }
    },
    { error: null, isLocked: false },
  );

  return (
    <form className="mt-8 space-y-5 text-start" action={submitAction} noValidate>
      {isRegistered && !state.error && (
        <div
          className="rounded-lg border border-success/20 bg-success-bg p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-success">{t("autoLoginError")}</p>
        </div>
      )}

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
          id="login-email"
          type="email"
          name="email"
          label={t("emailLabel")}
          disabled={isPending || state.isLocked}
          placeholder={t("emailPlaceholder")}
          error={state.fieldErrors?.email}
        />

        <FormField
          id="login-password"
          type="password"
          name="password"
          label={t("passwordLabel")}
          disabled={isPending || state.isLocked}
          placeholder={t("passwordPlaceholder")}
          error={state.fieldErrors?.password}
          labelExtra={
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-gold hover:underline underline-offset-4 decoration-1 decoration-gold/20 transition-colors"
            >
              {t("forgotPasswordLink")}
            </Link>
          }
        />

        <button
          type="submit"
          disabled={isPending || state.isLocked}
          className="landing-btn-primary flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold tracking-[0.04em] no-underline shadow-[0_4px_14px_0_var(--btn-shadow)] disabled:opacity-50 transition-all hover:shadow-lg cursor-pointer"
        >
          {isPending ? t("loggingIn") : t("loginButton")}
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
            disabled={isPending || state.isLocked || googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-page px-4 py-3 text-sm font-bold tracking-[0.04em] text-primary-color transition-all hover:bg-hover hover:border-gold/30 hover:shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FcGoogle className="h-5 w-5" />
            {googleLoading ? t("loggingIn") : t("continueWithGoogle")}
          </button>
        </>
      )}

      <p className="text-center text-xs text-very-muted">{t("tagline")}</p>
    </form>
  );
}
