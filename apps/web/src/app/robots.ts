import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/business";
import { AI_CRAWLERS, DISALLOWED_PATHS, SEARCH_CRAWLERS } from "@/config/crawlers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...AI_CRAWLERS], disallow: "/" },
      { userAgent: [...SEARCH_CRAWLERS], allow: "/", disallow: DISALLOWED_PATHS },
      { userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
