import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: "2026-11-24",
      changeFrequency: "weekly",
      priority: 1,
      images: [`${SITE_URL}/logo.png`],
    },
    {
      url: `${SITE_URL}/playground`,
      lastModified: "2026-11-24",
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
