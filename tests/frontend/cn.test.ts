import { describe, it, expect } from "vitest";
import { cn } from "../../apps/web/src/lib/cn";

describe("cn", () => {
  it("single class returns itself", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("multiple classes joined with space", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("false filtered out", () => {
    expect(cn("foo", false, "bar")).toBe("foo bar");
  });

  it("null filtered out", () => {
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("undefined filtered out", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("empty input returns empty string", () => {
    expect(cn()).toBe("");
  });

  it("all falsy returns empty string", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("mixed truthy and falsy values", () => {
    expect(cn("a", false, "b", null, "c", undefined)).toBe("a b c");
  });

  it("whitespace in classes preserved", () => {
    expect(cn("  foo  ", "bar")).toBe("  foo   bar");
  });

  it("duplicate classes not deduped", () => {
    expect(cn("foo", "foo")).toBe("foo foo");
  });

  it("long class list", () => {
    const classes = Array.from({ length: 20 }, (_, i) => `cls-${i}`);
    expect(cn(...classes)).toBe(classes.join(" "));
  });

  it("special chars in class names", () => {
    expect(cn("text-red-500", "bg-[#fff]", "hover:text-blue-300")).toBe(
      "text-red-500 bg-[#fff] hover:text-blue-300",
    );
  });
});
