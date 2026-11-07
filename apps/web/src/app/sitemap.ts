import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/business";
import { isSectionEnabled } from "@/config/features";
import { getContentSlugs } from "@/lib/mdx-doc";
import { getCategories } from "@/lib/question-bank";
import type { ContentSection } from "@/types/content";

// Basic sitemap: URLs only, never content (plan §11.10). Stream D rewires this to the section registry and
// release states.

const STATIC_PATHS = [
  "/",
  "/pricing",
  "/contact",
  "/security",
  "/legal/terms",
  "/legal/privacy",
  "/legal/refunds",
  "/legal/attributions",
  "/legal/copyright",
];

const DOC_SECTIONS: ContentSection[] = ["ai-system-design", "system-design", "cloud", "ml-system-design"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [...STATIC_PATHS];

  for (const section of DOC_SECTIONS) {
    if (!isSectionEnabled(section)) continue;
    paths.push(`/${section}`);
    for (const slug of await getContentSlugs(section)) paths.push(`/${section}/${slug}`);
  }

  if (isSectionEnabled("interviews")) {
    paths.push("/interviews");
    for (const c of getCategories()) {
      paths.push(`/interviews/${c.slug}`);
      for (const s of c.subsections) paths.push(`/interviews/${c.slug}/${s.slug}`);
    }
  }
  if (isSectionEnabled("companies")) paths.push("/companies");

  return paths.map((p) => ({ url: `${SITE_URL}${p === "/" ? "" : p}` }));
}
