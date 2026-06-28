"use client";

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
              <svg
                className="w-4 h-4 text-muted-color"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-muted-color"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
          </span>
          <span className="flex-1 truncate">{s.text}</span>
          <span className="text-xs text-very-muted">{s.count}</span>
        </button>
      ))}
    </div>
  );
}
