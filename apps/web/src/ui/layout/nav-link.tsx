"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/ui/cn";
import { memo, useCallback, useRef } from "react";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  onNavigate?: () => void;
}

// PERFORMANCE FIX: Memoize NavLink to prevent unnecessary re-renders
export const NavLink = memo(function NavLink({ href, children, icon, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isNavigatingRef = useRef(false); // PERFORMANCE FIX: Debounce rapid clicks

  const isActive =
    href === "/" || href === ""
      ? pathname === "/" || pathname === ""
      : pathname === href || pathname.startsWith(href + "/");

  // PERFORMANCE FIX: Memoize click handler to prevent recreating on every render + debounce
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent rapid double-clicks causing duplicate navigation
      if (isNavigatingRef.current) {
        e.preventDefault();
        return;
      }

      isNavigatingRef.current = true;
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 1000); // 1 second debounce

      if (onNavigate) {
        onNavigate();
      }
    },
    [onNavigate],
  );

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 sm:gap-3 rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-semibold tracking-[0.04em] transition-all duration-200",
        isActive
          ? "bg-gold/10 text-gold border-s-2 border-y-0 border-e-0 border-gold"
          : "text-muted-color hover:bg-hover hover:text-primary-color",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {icon && <span className="size-4 sm:size-5 shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </Link>
  );
});
