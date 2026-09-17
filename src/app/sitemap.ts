import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { publicEngagements } from "./portfolio/portfolio-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const updatedAt = new Date();
  const routes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: updatedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/portfolio"),
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/portfolio/solutions"),
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/portfolio/engagements"),
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  for (const engagement of publicEngagements) {
    if (engagement.evidence === "PRODUCT_CAPABILITY") continue;
    routes.push({
      url: absoluteUrl(`/portfolio/case-studies/${engagement.slug}`),
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.65,
    });
  }

  return routes;
}
