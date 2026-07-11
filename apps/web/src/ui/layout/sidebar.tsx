"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/cn";
import { NavLink } from "./nav-link";
import {
  HomeIcon,
  FileTextIcon,
  FolderIcon,
  TagsIcon,
  SearchIcon,
  RefreshIcon,
  UserIcon,
  GearIcon,
} from "@/ui/icons";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role: string;
}

export function Sidebar({ isOpen, onClose, role }: SidebarProps) {
  const t = useTranslations();
  const isAdmin = role === "ADMIN";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    { href: "/dashboard", label: "nav.home", icon: HomeIcon },
    { href: "/files", label: "nav.files", icon: FileTextIcon },
    { href: "/folders", label: "nav.folders", icon: FolderIcon },
    { href: "/tags", label: "nav.tags", icon: TagsIcon },
    { href: "/search", label: "nav.search", icon: SearchIcon },
    { href: "/conversions", label: "nav.conversions", icon: RefreshIcon },
    ...(isAdmin ? [{ href: "/users", label: "nav.users", icon: UserIcon }] : []),
    { href: "/settings", label: "nav.settings", icon: GearIcon },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-line bg-page/90 backdrop-blur-xl pt-16 transition-transform duration-200 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:!translate-x-0",
        )}
        style={{ viewTransitionName: "dashboard-sidebar" }}
        data-testid="sidebar"
      >
        <nav
          aria-label={t("nav.mainNav")}
          className="flex-1 space-y-0.5 overflow-y-auto px-3 py-6"
          data-testid="sidebar-nav"
        >
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} onNavigate={onClose}>
              <item.icon />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-4">
          {isAdmin && (
            <span className="mb-2 inline-block rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
              {t("nav.admin")}
            </span>
          )}
          <p className="text-xs text-very-muted">
            {t("app.name")} <span className="text-[10px] opacity-50">v0</span>
          </p>
        </div>
      </aside>
    </>
  );
}
