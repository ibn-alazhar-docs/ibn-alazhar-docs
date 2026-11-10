import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/ui/brand-logo";

interface AuthPageShellProps {
  title: string;
  logoAlt: string;
  subtitle: ReactNode;
  children: ReactNode;
}

export function AuthPageShell({ title, logoAlt, subtitle, children }: AuthPageShellProps) {
  return (
    <div className="text-center">
      <Link href="/" className="inline-block mb-6">
        <BrandLogo alt={logoAlt} className="ms-auto me-auto h-12 w-auto" priority />
      </Link>
      <div className="gold-divider ms-auto me-auto mb-6" />
      <h2 className="heading-display text-xl font-bold tracking-[0.02em] text-primary-color sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-color">{subtitle}</p>
      {children}
    </div>
  );
}
