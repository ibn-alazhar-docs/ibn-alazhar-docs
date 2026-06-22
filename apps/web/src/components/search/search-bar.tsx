"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface Suggestion {
  text: string;
  type: string;
  count: number;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder }: SearchBarProps) {
  const t = useTranslations("search");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions);
        }
      } catch {
        console.error("Failed to fetch suggestions");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  }

  function handleSuggestionClick(text: string) {
    setQuery(text);
    onSearch(text);
    setShowSuggestions(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder || t("placeholder")}
          className="w-full px-4 py-2 ps-10 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--success)] text-sm"
        />
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-very-muted">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
      </form>

      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div
          className="absolute top-full mt-1 w-full bg-card rounded-lg shadow-lg border border-line py-1 z-10"
          role="listbox"
          aria-label="Search suggestions"
        >
          {loading && <div className="px-4 py-2 text-sm text-muted-color">{t("searching")}</div>}
          {suggestions.map((s) => (
            <button
              key={`${s.type}-${s.text}`}
              type="button"
              role="option"
              className="w-full px-4 py-2 text-start text-sm hover:bg-badge flex items-center gap-2"
              onClick={() => handleSuggestionClick(s.text)}
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
      )}
    </div>
  );
}
