"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SuggestionList } from "./suggestion-list";

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
    if (selectedIndex >= 0) {
      const item = document.getElementById(`suggestion-${selectedIndex}`);
      item?.scrollIntoView({ block: "nearest" });
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
          data-testid="search-input"
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
        <SuggestionList
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          loading={loading}
          onSelect={handleSuggestionClick}
          onHover={setSelectedIndex}
        />
      )}
    </div>
  );
}
