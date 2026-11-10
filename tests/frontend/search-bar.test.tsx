import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchBar } from "@/ui/search/search-bar";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("SearchBar testId", () => {
  it("defaults to search-input", () => {
    render(<SearchBar onSearch={() => {}} />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("accepts a custom testId and stays unique when header + page bars coexist", () => {
    render(
      <>
        <SearchBar testId="header-search-input" onSearch={() => {}} />
        <SearchBar onSearch={() => {}} />
      </>,
    );
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("header-search-input")).toBeInTheDocument();
    expect(screen.queryAllByTestId("search-input")).toHaveLength(1);
    expect(screen.queryAllByTestId("header-search-input")).toHaveLength(1);
  });
});
