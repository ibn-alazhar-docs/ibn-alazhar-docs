export const BRAND_NAME = { ar: "مستندات ابن الأزهر", en: "Ibn Al-Azhar Docs" } as const;

/** Brand palette — Visual Identity (docs/BRAND_IMPLEMENTATION.md) */
export const BRAND_COLORS = {
  teal: "#127E87",
  gold: "#DA9E2C",
  prussian: "#083B40",
} as const;

/** Logo lockup rules: clear space 190px on all sides, minimum size 152px. */
export const BRAND_LOGO = {
  clearSpacePx: 190,
  minSizePx: 152,
} as const;

export const BRAND_FONTS = {
  body: "Almarai",
  display: "Thmanyah",
} as const;
