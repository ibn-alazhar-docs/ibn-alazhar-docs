import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/_next/",
        "/*/dashboard",
        "/*/files",
        "/*/folders",
        "/*/tags",
        "/*/conversions",
        "/*/settings",
        "/*/preview",
        "/*/users",
      ],
    },
    sitemap: "https://ibnalazhar-docs.vercel.app/sitemap.xml",
  };
}
