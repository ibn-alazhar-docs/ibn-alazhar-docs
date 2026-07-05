"use client";

import { FolderIcon, FileTextIcon } from "@/components/ui/icons";

interface Suggestion {
  text: string;
  type: string;
  count: number;
}

interface SuggestionListProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  loading: boolean;
  onSelect: (text: string) => void;
  onHover: (index: number) => void;
}

export function SuggestionList({
  suggestions,
  selectedIndex,
  loading,
  onSelect,
  onHover,
}: SuggestionListProps) {
  return (
    <div
      className="absolute top-full mt-1 w-full bg-card rounded-lg shadow-lg border border-line py-1 z-10"
      role="listbox"
      aria-label="Search suggestions"
    >
      {loading && <div className="px-4 py-2 text-sm text-muted-color">...جاري البحث</div>}
      {suggestions.map((s, i) => (
        <button
          key={`${s.type}-${s.text}`}
          id={`suggestion-${i}`}
          type="button"
          role="option"
          aria-selected={i === selectedIndex}
          className={`w-full px-4 py-2 text-start text-sm flex items-center gap-2 ${
            i === selectedIndex ? "bg-badge" : "hover:bg-badge"
          }`}
          onClick={() => onSelect(s.text)}
          onMouseEnter={() => onHover(i)}
        >
          <span>
            {s.type === "folder" ? (
              <FolderIcon className="w-4 h-4 text-muted-color" />
            ) : (
              <FileTextIcon className="w-4 h-4 text-muted-color" />
            )}
          </span>
          <span className="flex-1 truncate">{s.text}</span>
          <span className="text-xs text-very-muted">{s.count}</span>
        </button>
      ))}
    </div>
  );
}
