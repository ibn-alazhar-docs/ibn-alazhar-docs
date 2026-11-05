/**
 * Brand fonts (see docs/BRAND_IMPLEMENTATION.md):
 * - Body/UI: Almarai (self-hosted @font-face in styles/fonts.css).
 * - Display/headings: Thmanyah — commercial font, not on Google Fonts.
 *   It is referenced by CSS family name in brand.css (`--font-thmanyah`)
 *   with Almarai/Amiri fallbacks until licensed files are self-hosted
 *   under `public/fonts/thmanyah/` and registered with @font-face.
 * - Mono: Fira Code (self-hosted @font-face in styles/fonts.css).
 *
 * NOTE: These used to be loaded via next/font/google, which fetches CSS from
 * fonts.googleapis.com at build time. That network dependency made `next
 * build` fail on CI runners ("next/font/google queries have exactly one
 * entry"). The fonts are now self-hosted (OFL, from Fontsource) and served
 * from public/fonts, so the build is hermetic. The CSS variables that
 * next/font used to inject (--font-almarai, --font-mono) are now declared in
 * styles/fonts.css :root.
 */

interface FontObject {
  variable: string;
  className: string;
}

const makeFont = (variable: string, className: string): FontObject => ({
  variable,
  className,
});

export const almarai: FontObject = makeFont("--font-almarai", "font-almarai");

/**
 * @deprecated Kept for backwards compatibility with existing imports.
 * Brand body font is now Almarai.
 */
export const cairo: FontObject = almarai;

/**
 * @deprecated Kept for backwards compatibility with existing imports.
 * Brand display font is now Thmanyah (CSS stack) with Almarai fallback.
 */
export const amiri: FontObject = almarai;

export const firaCode: FontObject = makeFont("--font-mono", "font-mono");
