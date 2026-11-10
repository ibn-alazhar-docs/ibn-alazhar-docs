import localFont from "next/font/local";

/**
 * Self-hosted brand fonts (see docs/BRAND_IMPLEMENTATION.md).
 *
 * Self-hosting replaces next/font/google: HF Space Docker builds have no
 * reliable access to fonts.googleapis.com and `next build` failed on it
 * (2026-11-07). All files are OFL-licensed; each family directory carries
 * its OFL.txt.
 *
 * The brandbook names Thmanyah Sans as the primary typeface, but it is a
 * commercial font with no licence file in this repository, so it is not
 * loaded: the display stack in brand.css names it first and falls through
 * to these OFL faces.
 *
 * - Body/UI: Almarai (OFL)
 * - Display/headings, Quranic and hadith surfaces: Amiri (OFL)
 */
export const almarai = localFont({
  src: [
    { path: "../app/fonts/almarai/Almarai-Light.woff2", weight: "300" },
    { path: "../app/fonts/almarai/Almarai-Regular.woff2", weight: "400" },
    { path: "../app/fonts/almarai/Almarai-Bold.woff2", weight: "700" },
    { path: "../app/fonts/almarai/Almarai-ExtraBold.woff2", weight: "800" },
  ],
  variable: "--font-almarai",
  // First-refresh FOUT fix (015): self-hosted local files (~50KB each, same
  // origin) swap visibly under `display: "swap"`. `block` holds text briefly
  // until the face is ready so first paint is already final. No sizeAdjust:
  // without measured Almarai metrics an invented value would worsen shift.
  display: "block",
  preload: true,
});

export const amiri = localFont({
  src: [
    { path: "../app/fonts/amiri/Amiri-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/amiri/Amiri-Italic.woff2", weight: "400", style: "italic" },
    { path: "../app/fonts/amiri/Amiri-Bold.woff2", weight: "700", style: "normal" },
    { path: "../app/fonts/amiri/Amiri-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-amiri",
  // Display headings: same block strategy so headings never restyle after load.
  display: "block",
  preload: true,
});

// Variable font: one file covers 400..600 declared weights.
export const firaCode = localFont({
  src: [{ path: "../app/fonts/fira-code/FiraCode-VF.woff2", weight: "400 600" }],
  variable: "--font-mono",
  // Mono is code-only and secondary: `optional` avoids blocking prose while
  // never swapping mid-read (fallback until cache, then correct face).
  display: "optional",
  preload: false,
});
