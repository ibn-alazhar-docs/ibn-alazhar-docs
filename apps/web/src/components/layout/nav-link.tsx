"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useSyncExternalStore, type ReactNode } from "react";

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface NavLinkProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  onNavigate?: () => void;
}

export function NavLink({ href, children, icon, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();

  // For root path (/dashboard which might map to /), check if it matches exact.
  // pathname returns the un-prefixed path (e.g. /dashboard)
  const isActive = hydrated
    ? href === "/" || href === ""
      ? pathname === "/" || pathname === ""
      : pathname === href || pathname.startsWith(href + "/")
    : false;

  function handleClick() {
    if (onNavigate) {
      onNavigate();
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-[0.04em] transition-all",
        isActive
          ? "bg-active text-primary-color"
          : "text-muted-color hover:bg-hover hover:text-primary-color",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {icon && <span className="size-5 shrink-0">{icon}</span>}
      {children}
    </Link>
  );
}
