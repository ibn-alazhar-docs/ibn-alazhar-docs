import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ibn Al-Azhar Docs",
    short_name: "Ibn Al-Azhar Docs",
    description: "Document processing and text search",
    start_url: "/ar",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16A34A",
    icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png" }],
  };
}
