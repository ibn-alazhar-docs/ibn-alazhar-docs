import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-guards";
import { SettingsContent } from "./settings-content";
import { PageTransition } from "@/components/ui/page-transition";
import { DURATIONS } from "@/lib/constants";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SettingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return {
    title: t("settings"),
  };
}

import { SessionProvider } from "next-auth/react";

export default async function SettingsPage() {
  const session = await requireAuth();

  return (
    <PageTransition>
      <SessionProvider
        session={{
          ...session,
          expires: new Date(Date.now() + DURATIONS.ONE_DAY_MS).toISOString(),
        }}
      >
        <SettingsContent
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role,
          }}
        />
      </SessionProvider>
    </PageTransition>
  );
}
