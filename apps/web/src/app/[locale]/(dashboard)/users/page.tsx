"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Container } from "@/components/ui/container";
import { PageTransition } from "@/components/ui/page-transition";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: { documents: number };
}

export default function UsersPage() {
  const t = useTranslations("users");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        if (res.status === 403) {
          setError(t("forbidden"));
          return;
        }
        throw new Error("Failed to load");
      }
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "ADMIN" ? "STUDENT" : "ADMIN";
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Failed");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch {
      setError(t("roleChanged"));
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError(t("userDeleted"));
    }
  }

  if (loading) {
    return (
      <Container>
        <Section padding="md">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-hover rounded-lg animate-pulse" />
            ))}
          </div>
        </Section>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Section padding="md">
          <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-bg)] p-6 text-center">
            <p className="text-[var(--danger)]">{error}</p>
          </div>
        </Section>
      </Container>
    );
  }

  const admins = users.filter((u) => u.role === "ADMIN").length;
  const students = users.filter((u) => u.role === "STUDENT").length;

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <Stack gap={6}>
            <Heading level={2}>{t("title")}</Heading>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-card p-4">
                <p className="text-xs text-very-muted uppercase tracking-wide">{t("total")}</p>
                <p className="text-2xl font-bold text-primary-color mt-1">{users.length}</p>
              </div>
              <div className="rounded-xl border border-line bg-card p-4">
                <p className="text-xs text-very-muted uppercase tracking-wide">{t("admins")}</p>
                <p className="text-2xl font-bold text-[var(--success)] mt-1">{admins}</p>
              </div>
              <div className="rounded-xl border border-line bg-card p-4">
                <p className="text-xs text-very-muted uppercase tracking-wide">{t("students")}</p>
                <p className="text-2xl font-bold text-primary-color mt-1">{students}</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-line bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-hover">
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-color">
                        {t("name")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-color">
                        {t("email")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-color">
                        {t("role")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-color">
                        {t("createdAt")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-color">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-line last:border-0 hover:bg-hover transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-primary-color">
                          {user.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-color">{user.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              user.role === "ADMIN"
                                ? "bg-[var(--success-bg)] text-[var(--success)]"
                                : "bg-badge text-muted-color"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-very-muted">
                          {new Date(user.createdAt).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleRole(user.id, user.role)}
                              className="text-xs text-muted-color hover:text-primary-color transition-colors"
                            >
                              {user.role === "ADMIN" ? t("removeAdmin") : t("makeAdmin")}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUser(user.id)}
                              className="text-xs text-[var(--danger)] hover:text-[var(--danger)]/80 transition-colors"
                            >
                              {t("delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Stack>
        </Section>
      </Container>
    </PageTransition>
  );
}
