/** Brand wording — منصة ابن الأزهر (brandbook 01/02). */
export const BRAND_NAME = { ar: "منصة ابن الأزهر", en: "Ibn Al-Azhar Platform" } as const;
export const BRAND_TAGLINE = "في بيت كل طالب أزهري";
export const BRAND_POSITIONING =
  "منصة ابن الأزهر للمستندات — معالجة وتنظيم محتوى الثانوية الأزهرية";

/** Brand palette — Visual Identity (docs/BRAND_IMPLEMENTATION.md) */
export const BRAND_COLORS = {
  teal: "#127E87",
  gold: "#DA9E2C",
  prussian: "#083B40",
  paper: "#FBF5E9",
} as const;

/** Logo lockup rules: clear space 190px on all sides, minimum size 152px.
 *  Print/brand-sheet values — on-screen surfaces use `--logo-safe-inline`. */
export const BRAND_LOGO = {
  clearSpacePx: 190,
  minSizePx: 152,
} as const;

export const BRAND_FONTS = {
  body: "Almarai",
  display: "Amiri",
} as const;

/** Social-preview artwork. A pre-rendered PNG, not a dynamic `ImageResponse`:
 *  satori (next/og) has no Arabic shaper, so it would emit disconnected glyphs. */
export const BRAND_OG_IMAGE = "/brand/og-base.png";
export const BRAND_OG_ALT = { ar: BRAND_POSITIONING, en: "Ibn Al-Azhar Platform" } as const;

/** Values and tone of voice (brandbook 05) — copy guidance, not styling. */
export const BRAND_VALUES = ["جودة التعليم", "التخصص", "التنظيم", "الوضوح"] as const;
export const BRAND_TONE = ["مشجع", "مبسط", "واضح", "داعم"] as const;
