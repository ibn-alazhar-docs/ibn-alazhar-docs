"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTheme } from "@/components/theme/theme-provider";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { UI_TIMING } from "@/lib/shared/constants";
import { Text } from "@/components/ui/text";
import { useState, useTransition } from "react";
import { signOut, useSession } from "next-auth/react";

interface SettingsContentProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
}

export function SettingsContent({ user }: SettingsContentProps) {
  const tNav = useTranslations("nav");
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const { update } = useSession();

  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleLanguageSwitch(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("error"));
        return;
      }
      setSaved(true);
      await update({ name: name.trim() });
      router.refresh();
      setTimeout(() => setSaved(false), UI_TIMING.TOAST_RESET_MS);
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError(t("error"));
      setDeleting(false);
    }
  }

  const roleLabel = user.role === "ADMIN" ? t("admin") : t("user");

  return (
    <Container>
      <Section padding="md">
        <Stack gap={6}>
          <Heading level={2}>{tNav("settings")}</Heading>

          {saved && (
            <div className="rounded-xl bg-[var(--success-bg)] p-4 text-[var(--success)]">
              {t("saved")}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-[var(--danger-bg)] p-4 text-[var(--danger)]">{error}</div>
          )}

          {/* Profile Section */}
          <div className="rounded-xl border border-line bg-card p-6">
            <Heading level={3}>{t("profile")}</Heading>
            <Text color="muted" className="mt-1">
              {t("profileDescription")}
            </Text>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-color">{t("name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-input-border bg-input px-4 py-2.5 text-sm text-primary-color focus:border-[var(--success)] focus:ring-2 focus:ring-[var(--success)]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-color">{t("email")}</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="mt-1 block w-full rounded-lg border border-line bg-muted px-4 py-2.5 text-sm text-very-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-color">{t("role")}</label>
                <input
                  type="text"
                  value={roleLabel}
                  disabled
                  className="mt-1 block w-full rounded-lg border border-line bg-muted px-4 py-2.5 text-sm text-very-muted cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div className="rounded-xl border border-line bg-card p-6">
            <Heading level={3}>{t("language")}</Heading>
            <Text color="muted" className="mt-1">
              {t("languageDescription")}
            </Text>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleLanguageSwitch("ar")}
                disabled={isPending || locale === "ar"}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)] ${
                  locale === "ar"
                    ? "bg-btn-primary text-btn-primary-text"
                    : "border border-line bg-page text-primary-color hover:bg-hover"
                } disabled:opacity-50`}
              >
                {t("arabic")}
              </button>
              <button
                onClick={() => handleLanguageSwitch("en")}
                disabled={isPending || locale === "en"}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)] ${
                  locale === "en"
                    ? "bg-btn-primary text-btn-primary-text"
                    : "border border-line bg-page text-primary-color hover:bg-hover"
                } disabled:opacity-50`}
              >
                {t("english")}
              </button>
            </div>
          </div>

          {/* Theme Section */}
          <div className="rounded-xl border border-line bg-card p-6">
            <Heading level={3}>{t("theme")}</Heading>
            <Text color="muted" className="mt-1">
              {t("themeDescription")}
            </Text>

            <div className="mt-4 flex gap-3">
              {(["light", "dark"] as const).map((t_) => (
                <button
                  key={t_}
                  onClick={() => {
                    if (theme !== t_) toggleTheme();
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)] ${
                    theme === t_
                      ? "bg-btn-primary text-btn-primary-text"
                      : "border border-line bg-page text-primary-color hover:bg-hover"
                  }`}
                >
                  {t(t_)}
                </button>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-bg)] p-6">
            <Heading level={3} className="text-[var(--danger)]">
              {t("dangerZone")}
            </Heading>
            <Text color="muted" className="mt-1">
              {t("dangerZoneDescription")}
            </Text>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 rounded-lg border border-[var(--danger)]/30 bg-card px-4 py-2 text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
              >
                {t("deleteAccount")}
              </button>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <Text color="muted" className="text-sm">
                  {t("deleteAccountConfirm")}
                </Text>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="rounded-lg bg-[var(--danger)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                >
                  {deleting ? "..." : tCommon("confirm")}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="rounded-lg border border-line bg-page px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)]"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || name.trim() === (user.name || "")}
              className="rounded-lg bg-btn-primary px-6 py-2.5 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)]"
            >
              {saving ? "..." : tCommon("save")}
            </button>
          </div>
        </Stack>
      </Section>
    </Container>
  );
}
