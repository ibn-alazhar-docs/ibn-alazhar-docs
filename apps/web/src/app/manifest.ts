import type { MetadataRoute } from "next";
import { BRAND_COLORS, BRAND_NAME, BRAND_POSITIONING } from "@/ui/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME.ar,
    short_name: BRAND_NAME.en,
    description: BRAND_POSITIONING,
    start_url: "/ar/dashboard",
    display: "standalone",
    background_color: BRAND_COLORS.paper,
    theme_color: BRAND_COLORS.teal,
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
