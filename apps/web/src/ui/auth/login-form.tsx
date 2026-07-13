"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { FcGoogle } from "react-icons/fc";
import { loginSchema } from "@/shared/validators/auth";
import { preCheckLogin } from "./actions";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";

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
        <div>
          <label htmlFor="login-email" className="mb-2 block text-xs font-bold text-muted-color">
            {t("emailLabel")}
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            dir="ltr"
            disabled={isPending || state.isLocked}
            aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            className="w-full rounded-lg border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-50 transition-colors"
            placeholder={t("emailPlaceholder")}
          />
          {state.fieldErrors?.email && (
            <p className="mt-1.5 text-xs text-danger" id="email-error" role="alert">
              {state.fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="login-password" className="text-xs font-bold text-muted-color">
              {t("passwordLabel")}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-gold hover:underline underline-offset-4 decoration-1 decoration-gold/20 transition-colors"
            >
              {t("forgotPasswordLink")}
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            name="password"
            dir="ltr"
            disabled={isPending || state.isLocked}
            aria-invalid={!!state.fieldErrors?.password}
            aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
            className="w-full rounded-lg border border-line bg-page px-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-50 transition-colors"
            placeholder={t("passwordPlaceholder")}
          />
          {state.fieldErrors?.password && (
            <p className="mt-1.5 text-xs text-danger" id="password-error" role="alert">
              {state.fieldErrors.password}
            </p>
          )}
        </div>

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
            onClick={() => signIn("google", { redirectTo: "/dashboard" })}
            disabled={isPending || state.isLocked}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-page px-4 py-3 text-sm font-bold tracking-[0.04em] text-primary-color transition-all hover:bg-hover hover:border-gold/30 hover:shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FcGoogle className="h-5 w-5" />
            {isPending ? t("loggingIn") : t("continueWithGoogle")}
          </button>
        </>
      )}

      <p className="text-center text-xs text-very-muted">{t("tagline")}</p>
    </form>
  );
}
