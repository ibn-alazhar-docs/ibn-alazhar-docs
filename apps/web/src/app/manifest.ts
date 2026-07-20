import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مستندات ابن الأزهر",
    short_name: "Ibn Al-Azhar Docs",
    description: "منصة ذكية لتحويل واستخراج النصوص",
    start_url: "/ar/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b59954",
    icons: [
      {
        src: "/logo.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
