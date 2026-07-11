"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Stack } from "@/ui/stack";
import { Heading } from "@/ui/heading";
import { Card } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { apiFetch } from "@/shared/api";

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
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const res = await apiFetch("/api/users");
      if (!res.ok) {
        if (res.status === 403) {
          setError(t("forbidden"));
          return;
        }
        throw new Error(t("loadError"));
      }
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError(t("loadError"));
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
      const res = await apiFetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error(t("roleToggleError"));
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch {
      setError(t("roleToggleError"));
    }
  }

  async function performDelete(userId: string) {
    try {
      const res = await apiFetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error(t("deleteError"));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError(t("deleteError"));
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
              <Card className="p-4">
                <p className="text-xs text-very-muted uppercase tracking-wide">{t("total")}</p>
                <p className="text-2xl font-bold text-primary-color mt-1">{users.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-very-muted uppercase tracking-wide">{t("admins")}</p>
                <p className="text-2xl font-bold text-[var(--success)] mt-1">{admins}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-very-muted uppercase tracking-wide">{t("students")}</p>
                <p className="text-2xl font-bold text-primary-color mt-1">{students}</p>
              </Card>
            </div>

            {/* Users Table */}
            <Card className="overflow-hidden">
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
                          <Badge variant={user.role === "ADMIN" ? "success" : "secondary"}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-very-muted">
                          {new Date(user.createdAt).toLocaleDateString(
                            locale === "ar" ? "ar-EG" : "en-US",
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleRole(user.id, user.role)}
                            >
                              {user.role === "ADMIN" ? t("removeAdmin") : t("makeAdmin")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[var(--danger)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                              onClick={() => setDeletingUserId(user.id)}
                            >
                              {t("delete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            {deletingUserId && (
              <ConfirmDialog
                title={t("deleteConfirmTitle")}
                message={t("deleteConfirm")}
                confirmLabel={tCommon("delete")}
                cancelLabel={tCommon("cancel")}
                variant="danger"
                onConfirm={() => {
                  if (deletingUserId) {
                    performDelete(deletingUserId);
                    setDeletingUserId(null);
                  }
                }}
                onCancel={() => setDeletingUserId(null)}
              />
            )}
          </Stack>
        </Section>
      </Container>
    </PageTransition>
  );
}
