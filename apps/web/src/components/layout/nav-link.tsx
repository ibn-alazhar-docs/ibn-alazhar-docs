"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/frontend/cn";
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
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-[0.04em] transition-all duration-200",
        isActive
          ? "bg-gold/10 text-gold border-s-2 border-y-0 border-e-0 border-gold"
          : "text-muted-color hover:bg-hover hover:text-primary-color",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {icon && <span className="size-5 shrink-0">{icon}</span>}
      {children}
    </Link>
  );
}
