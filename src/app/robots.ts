import type { MetadataRoute } from "next";
import { absoluteUrl, seoConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/portfolio/"],
      disallow: [
        "/api/",
        "/app/",
        "/firms/",
        "/login/",
        "/owner/",
        "/s/",
        "/share",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: seoConfig.siteUrl,
  };
}
