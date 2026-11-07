import { Almarai, Amiri, Fira_Code } from "next/font/google";

/**
 * Brand fonts (see docs/BRAND_IMPLEMENTATION.md).
 *
 * The brandbook names Thmanyah Sans as the primary typeface, but it is a commercial
 * font with no licence file in this repository, so it is not loaded: the display
 * stack in brand.css names it first and falls through to these OFL faces.
 *
 * - Body/UI: Almarai (OFL)
 * - Display/headings, Quranic and hadith surfaces: Amiri (OFL)
 */
export const almarai = Almarai({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
});

export const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-amiri",
  display: "swap",
});

export const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
