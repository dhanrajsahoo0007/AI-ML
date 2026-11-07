import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/business";
import { loadSection } from "@/features/sections/kinds";
import { visibleSections } from "@/features/sections/registry";

// URLs only, never content (plan §11.10). Sections come from the registry: only `on` sections are listed,
// so `hidden` and `off` sections never appear (plan §5.1.1).

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({ url: `${SITE_URL}${p === "/" ? "" : p}` }));

  for (const def of visibleSections()) {
    const { section, kind, items } = await loadSection(def);
    for (const entry of kind.sitemap(section, items)) {
      entries.push({ url: `${SITE_URL}${entry.url}`, lastModified: entry.lastModified });
    }
  }
  return entries;
}
