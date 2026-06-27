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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
        // Silently ignore — suggestions will remain empty
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
        break;
      case "Enter": {
        const selected = suggestions[selectedIndex];
        if (selected) {
          e.preventDefault();
          handleSuggestionClick(selected.text);
        }
        break;
      }
      case "Escape":
        setShowSuggestions(false);
        inputRef.current?.focus();
        break;
    }
  }

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

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
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("placeholder")}
          className="w-full px-4 py-2 ps-10 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--success)] text-sm"
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
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
          ref={listRef}
          className="absolute top-full mt-1 w-full bg-card rounded-lg shadow-lg border border-line py-1 z-10"
          role="listbox"
          aria-label="Search suggestions"
        >
          {loading && <div className="px-4 py-2 text-sm text-muted-color">{t("searching")}</div>}
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
              onClick={() => handleSuggestionClick(s.text)}
              onMouseEnter={() => setSelectedIndex(i)}
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
