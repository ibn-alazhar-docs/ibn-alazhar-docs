import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuth } from "@/lib/auth-guards";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await requireAuth();
  const role = session.user.role;

  return <DashboardShell role={role}>{children}</DashboardShell>;
}
