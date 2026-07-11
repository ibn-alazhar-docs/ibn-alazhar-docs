import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { ThemeToggle } from "@/ui/theme/theme-toggle";
import { renderWithProviders } from "../test-utils";

describe("ThemeToggle (component)", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("renders a button with an accessible label", () => {
    renderWithProviders(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label");
    expect(btn.className).toContain("hover:bg-hover");
  });

  it("shows the moon icon in light mode and toggles to sun in dark mode", () => {
    localStorage.setItem("theme", "light");
    renderWithProviders(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "toggleDark");

    fireEvent.click(btn);
    const after = screen.getByRole("button");
    expect(after).toHaveAttribute("aria-label", "toggleLight");
  });

  it("persists the selected theme to localStorage on toggle", () => {
    localStorage.setItem("theme", "light");
    renderWithProviders(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
