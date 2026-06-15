import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ibn Al-Azhar",
    short_name: "Ibn Al-Azhar",
    description: "Document processing and text search",
    start_url: "/ar",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16A34A",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
