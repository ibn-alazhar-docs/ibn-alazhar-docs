import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

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
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
