"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { PageTransition } from "@/components/ui/page-transition";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { TAG_COLORS } from "@/lib/validators/tag";

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  _count: { documents: number };
}

export default function TagsPage() {
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");
  const tDocs = useTranslations("documents");
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[0]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [mergingId, setMergingId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags);
      }
    } catch {
      setError("فشل تحميل الوسوم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setError(null);

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (res.ok) {
        const data = await res.json();
        setTags([...tags, { ...data.tag, _count: { documents: 0 } }]);
        setNewTagName("");
        setIsCreating(false);
      } else {
        const err = await res.json();
        setError(err.error);
      }
    } catch {
      setError("حدث خطأ");
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });

      if (res.ok) {
        setTags(
          tags.map((tag) =>
            tag.id === id ? { ...tag, name: editName.trim(), color: editColor } : tag,
          ),
        );
        setEditingId(null);
      } else {
        const err = await res.json();
        setError(err.error);
      }
    } catch {
      setError("حدث خطأ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;

    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTags(tags.filter((tag) => tag.id !== id));
      }
    } catch {
      setError("حدث خطأ");
    }
  };

  const handleMerge = async () => {
    if (!mergingId || !mergeTargetId) return;

    try {
      const res = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTagId: mergingId, targetTagId: mergeTargetId }),
      });

      if (res.ok) {
        await fetchTags();
        setMergingId(null);
        setMergeTargetId("");
      } else {
        const err = await res.json();
        setError(err.error);
      }
    } catch {
      setError("حدث خطأ");
    }
  };

  const totalDocuments = tags.reduce((sum, tag) => sum + tag._count.documents, 0);

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <Stack gap={6}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <Heading level={2}>{t("manage")}</Heading>
                <Text color="muted">
                  {t("tagsCount", { count: tags.length })} | {totalDocuments}{" "}
                  {t("documentsCount", { count: totalDocuments })}
                </Text>
              </div>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-btn-primary-text bg-[var(--success)] hover:opacity-90 rounded-lg"
                onClick={() => setIsCreating(true)}
              >
                {t("createButton")}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                className="p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-lg text-sm text-[var(--danger)]"
                role="alert"
                aria-live="polite"
              >
                {error}
                <button type="button" className="ms-2 underline" onClick={() => setError(null)}>
                  {tCommon("close")}
                </button>
              </div>
            )}

            {/* Create form */}
            {isCreating && (
              <div className="bg-card rounded-xl border border-line p-4">
                <h3 className="text-sm font-semibold text-primary-color mb-3">{t("createNew")}</h3>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--success)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setIsCreating(false);
                  }}
                />
                <div className="flex gap-1 mb-3">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full transition-transform ${
                        newTagColor === color ? "scale-125 ring-2 ring-offset-1" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover rounded-lg"
                    onClick={() => setIsCreating(false)}
                  >
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-btn-primary-text bg-[var(--success)] hover:opacity-90 rounded-lg"
                    onClick={handleCreate}
                  >
                    {tCommon("save")}
                  </button>
                </div>
              </div>
            )}

            {/* Tags table */}
            {loading ? (
              <div className="text-center py-8 text-very-muted">{tCommon("loading")}</div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-very-muted">{t("empty")}</div>
            ) : (
              <div className="bg-card rounded-xl border border-line overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-line sticky top-0 bg-card">
                      <th className="text-start px-4 py-3 text-xs font-semibold text-muted-color uppercase">
                        {t("colorLabel")}
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-muted-color uppercase">
                        {t("nameLabel")}
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-muted-color uppercase">
                        {tDocs("table.title")}
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-muted-color uppercase">
                        {tCommon("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((tag) => (
                      <tr
                        key={tag.id}
                        className="border-b border-line last:border-0 hover:bg-hover/50"
                      >
                        <td className="px-4 py-3">
                          {editingId === tag.id ? (
                            <div className="flex gap-1">
                              {TAG_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className={`w-5 h-5 rounded-full transition-transform ${
                                    editColor === color ? "scale-125 ring-2 ring-offset-1" : ""
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => setEditColor(color)}
                                />
                              ))}
                            </div>
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full inline-block"
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === tag.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 text-sm border border-line rounded focus:outline-none focus:ring-2 focus:ring-[var(--success)]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(tag.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          ) : (
                            <span className="text-sm font-medium text-primary-color">
                              {tag.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-color">{tag._count.documents}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {editingId === tag.id ? (
                              <>
                                <button
                                  type="button"
                                  className="text-xs text-[var(--success)] hover:underline"
                                  onClick={() => handleRename(tag.id)}
                                >
                                  {tCommon("save")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-very-muted hover:underline"
                                  onClick={() => setEditingId(null)}
                                >
                                  {tCommon("cancel")}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="text-xs text-muted-color hover:text-primary-color"
                                  onClick={() => {
                                    setEditingId(tag.id);
                                    setEditName(tag.name);
                                    setEditColor(tag.color);
                                  }}
                                >
                                  {t("rename")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-muted-color hover:text-primary-color"
                                  onClick={() => setMergingId(tag.id)}
                                >
                                  {t("merge")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-[var(--danger)] hover:text-[var(--danger)]/80"
                                  onClick={() => handleDelete(tag.id)}
                                >
                                  {tCommon("delete")}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Merge dialog */}
            {mergingId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                  <h2 className="text-lg font-semibold text-primary-color mb-2">
                    {t("mergeTitle")}
                  </h2>
                  <Text color="muted" size="sm" className="mb-4">
                    {t("mergeDescription")}
                  </Text>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-primary-color mb-1">
                        {t("mergeSource")}
                      </label>
                      <div className="px-3 py-2 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-lg text-sm text-[var(--danger)]">
                        {tags.find((t) => t.id === mergingId)?.name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-color mb-1">
                        {t("mergeTarget")}
                      </label>
                      <select
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--success)]"
                      >
                        <option value="">{t("mergeTarget")}</option>
                        {tags
                          .filter((tag) => tag.id !== mergingId)
                          .map((tag) => (
                            <option key={tag.id} value={tag.id}>
                              {tag.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover rounded-lg"
                      onClick={() => {
                        setMergingId(null);
                        setMergeTargetId("");
                      }}
                    >
                      {tCommon("cancel")}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-btn-primary-text bg-[var(--success)] hover:opacity-90 rounded-lg disabled:opacity-50"
                      disabled={!mergeTargetId}
                      onClick={handleMerge}
                    >
                      {t("mergeButton")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Stack>
        </Section>
      </Container>
    </PageTransition>
  );
}
