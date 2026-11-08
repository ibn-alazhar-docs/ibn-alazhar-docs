"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useTheme } from "@/ui/theme/theme-provider";
import { Container } from "@/ui/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import { BrandLogo } from "@/ui/brand-logo";
import { UI_TIMING } from "@/shared/constants";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { SunIcon, MoonIcon } from "@/ui/icons";
import { apiFetch } from "@/shared/api";

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
  const tFooter = useTranslations("footer");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();

  const { update } = useSession();

  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/profile", {
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
      const res = await apiFetch("/api/profile", { method: "DELETE" });
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
  const isAdmin = user.role === "ADMIN";

  return (
    <Container>
      <div className="py-8 space-y-6 max-w-5xl">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-primary-color">{tNav("settings")}</h1>
            <p className="mt-1 text-sm text-secondary-color">{t("profileDescription")}</p>
          </div>
          {isAdmin && (
            <Badge variant="success" className="ms-auto shrink-0">
              {t("admin")}
            </Badge>
          )}
        </div>

        {/* Success Alert */}
        {saved && (
          <div className="flex items-center gap-3 rounded-xl bg-success-bg border border-success-border p-4 text-success text-sm font-medium">
            <span>✓</span>
            {t("saved")}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-danger-bg border border-danger-border p-4 text-danger text-sm font-medium">
            <span>✕</span>
            {error}
          </div>
        )}

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile")}</CardTitle>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t("role")}</Label>
              <Input
                id="role"
                type="text"
                value={roleLabel}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving || name.trim() === (user.name || "")}>
                {saving ? t("saving") : tCommon("save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>{t("theme")}</CardTitle>
            <CardDescription>{t("themeDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  if (theme !== "light") toggleTheme();
                }}
                variant={theme === "light" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <SunIcon className="h-4 w-4" />
                {t("light")}
              </Button>
              <Button
                onClick={() => {
                  if (theme !== "dark") toggleTheme();
                }}
                variant={theme === "dark" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <MoonIcon className="h-4 w-4" />
                {t("dark")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("about")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <BrandLogo alt={tNav("name")} className="h-8 w-auto shrink-0" />
              <p className="heading-display-sm min-w-[200px] flex-1 text-sm font-bold text-primary-color">
                {tFooter("tagline")}
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/tools">{t("toolsLink")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-danger/30 bg-danger-bg">
          <CardHeader>
            <CardTitle className="text-danger">{t("dangerZone")}</CardTitle>
            <CardDescription>{t("dangerZoneDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button variant="destructive-outline" onClick={() => setShowDeleteConfirm(true)}>
                {t("deleteAccount")}
              </Button>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-secondary-color flex-1">{t("deleteAccountConfirm")}</p>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                    {deleting ? t("deleting") : tCommon("confirm")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
