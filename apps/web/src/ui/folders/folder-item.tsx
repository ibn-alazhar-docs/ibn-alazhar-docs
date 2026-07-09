"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { FolderNode } from "@/core/folder-tree";
import { FolderIcon, ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon } from "@/ui/icons";

interface FolderItemProps {
  folder: FolderNode;
  level: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
  onMove: (folderId: string, parentId: string | null) => void;
}

export function FolderItem({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onRename,
  onDelete,
  onMove,
}: FolderItemProps) {
  const t = useTranslations("folders");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children.length > 0;
  const indent = level * 24;

  function handleRename() {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setIsEditing(false);
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-hover transition-colors ${
          isSelected ? "bg-[var(--success-bg)] text-[var(--success)]" : "text-primary-color"
        }`}
        style={{ paddingInlineStart: `${indent + 12}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {/* Expand/Collapse */}
        <button
          type="button"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={isExpanded ? t("collapse") : t("expand")}
          className={`min-h-11 min-w-11 flex items-center justify-center text-very-muted hover:text-muted-color transition-colors ${
            hasChildren ? "visible" : "invisible"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronDownIcon className="size-4" />
          ) : isRtl ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </button>

        {/* Folder Icon */}
        <span className="text-lg flex items-center">
          <FolderIcon className="w-5 h-5 text-muted-color" />
        </span>

        {/* Folder Name */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            aria-label={t("rename")}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="flex-1 px-2 py-1 text-sm border border-line rounded focus:outline-none focus:ring-2 focus:ring-[var(--success)]"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
        )}

        {/* Document Count */}
        {folder._count.documents > 0 && (
          <span className="text-xs text-very-muted bg-hover px-2 py-0.5 rounded-full">
            {folder._count.documents}
          </span>
        )}

        {/* Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="min-h-11 min-w-11 flex items-center justify-center text-very-muted hover:text-muted-color rounded"
            aria-label={tCommon("settings")}
            aria-haspopup="true"
            aria-expanded={showMenu}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            ⋮
          </button>

          {showMenu && (
            <div className="absolute end-0 top-full mt-1 w-40 bg-card rounded-lg shadow-lg border border-line py-1 z-50">
              <button
                type="button"
                className="w-full px-3 py-2 text-start text-sm hover:bg-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setShowMenu(false);
                }}
              >
                {t("rename")}
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-start text-sm hover:bg-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(folder.id, folder.parentId);
                  setShowMenu(false);
                }}
              >
                {t("moveTo")}
              </button>
              <hr className="my-1 border-line" />
              <button
                type="button"
                className="w-full px-3 py-2 text-start text-sm text-[var(--danger)] hover:bg-[var(--danger-bg)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(folder.id);
                  setShowMenu(false);
                }}
              >
                {tCommon("delete")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
