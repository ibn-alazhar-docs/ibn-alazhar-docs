import { Almarai, Fira_Code } from "next/font/google";

/**
 * Brand fonts (see docs/BRAND_IMPLEMENTATION.md):
 * - Body/UI: Almarai (Google Fonts, loaded via next/font).
 * - Display/headings: Thmanyah — commercial font, not on Google Fonts.
 *   It is referenced by CSS family name in brand.css (`--font-thmanyah`)
 *   with Almarai/Amiri fallbacks until licensed files are self-hosted
 *   under `public/fonts/thmanyah/` and registered with @font-face.
 */
export const almarai = Almarai({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
});

/**
 * @deprecated Kept for backwards compatibility with existing imports.
 * Brand body font is now Almarai.
 */
export const cairo = almarai;

/**
 * @deprecated Kept for backwards compatibility with existing imports.
 * Brand display font is now Thmanyah (CSS stack) with Almarai fallback.
 */
export const amiri = almarai;

export const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
