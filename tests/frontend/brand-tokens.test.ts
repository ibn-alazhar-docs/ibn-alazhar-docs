import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Guards the brand typography chain end to end.
 *
 * Tailwind 4 tree-shakes `@theme` variables no utility references, and the brand
 * fonts are referenced only through `var()` inside plain CSS (`html`, `h1`–`h6`
 * in globals.css). When that shaking is enabled the variables silently vanish
 * from the stylesheet, every element falls back to the UA serif, and the Almarai
 * and Amiri files never download — the site still looks "fine" in a screenshot
 * and nothing in the suite notices. This happened on the brand migration, which
 * is why these source assertions exist.
 */

const STYLES = path.resolve(__dirname, "../../apps/web/src/styles");
const APP = path.resolve(__dirname, "../../apps/web/src/app");

const brandCss = readFileSync(path.join(STYLES, "brand.css"), "utf-8");
const globalsCss = readFileSync(path.join(STYLES, "globals.css"), "utf-8");
const rootLayout = readFileSync(path.join(APP, "layout.tsx"), "utf-8");

/** The `@theme … { … }` block, up to its closing brace at column 0. */
function themeBlock(css: string): string {
  const start = css.indexOf("@theme");
  expect(start, "brand.css must declare an @theme block").toBeGreaterThan(-1);
  const end = css.indexOf("\n}", start);
  expect(end, "the @theme block in brand.css is unterminated").toBeGreaterThan(start);
  return css.slice(start, end);
}

describe("brand typography chain", () => {
  it("emits every theme variable instead of tree-shaking the unused ones", () => {
    const block = themeBlock(brandCss);
    expect(block.startsWith("@theme static"), brandCss.slice(0, block.indexOf("\n"))).toBe(true);
    // The names globals.css substitutes through; losing any one of them is the bug.
    for (const name of [
      "--font-family-almarai",
      "--font-family-display",
      "--font-family-body",
      "--font-body",
      "--font-display",
    ]) {
      expect(block, `@theme static block is missing ${name}`).toContain(name + ":");
    }
  });

  it("attaches the next/font variables to <html>, where the base rules resolve them", () => {
    // `html { font-family: var(--font-family-body) }` substitutes at the root
    // element, so `--font-almarai` has to exist there — a class on <body> is too
    // late and the substitution fails to the initial serif.
    const htmlTag = rootLayout.slice(
      rootLayout.indexOf("<html"),
      rootLayout.indexOf(">", rootLayout.indexOf("<html")) + 1,
    );
    for (const font of ["almarai", "amiri", "firaCode"]) {
      expect(htmlTag, `<html> must carry the ${font} variable class`).toContain(`${font}.variable`);
    }
    const bodyTag = rootLayout.slice(
      rootLayout.indexOf("<body"),
      rootLayout.indexOf(">", rootLayout.indexOf("<body")) + 1,
    );
    expect(bodyTag).not.toContain(".variable");
  });

  it("keeps the loaded OFL faces as the only named families in the stacks", () => {
    const block = themeBlock(brandCss);
    expect(block).toContain("var(--font-almarai)");
    expect(block).toContain("var(--font-amiri)");
    // Thmanyah/Gilroy/Kitab are commercial and unlicensed (AGENTS.md): allowed as
    // a trailing name, never as the head of a stack. The head must be the loaded
    // OFL variable, so the browser never waits on a family it cannot fetch.
    expect(block, "display stack").toMatch(/--font-family-display:\s*var\(--font-amiri\)/);
    expect(block, "body stack").toMatch(/--font-family-almarai:\s*var\(--font-almarai\)/);
  });

  it("applies the stacks through the base layer, not per-component classes", () => {
    expect(globalsCss).toMatch(/html\s*\{[^}]*font-family:\s*var\(--font-family-body\)/s);
    expect(globalsCss).toMatch(
      /h1,[\s\S]*?h6\s*\{[^}]*font-family:\s*var\(--font-family-display\)/s,
    );
  });
});
