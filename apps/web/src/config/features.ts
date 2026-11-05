import type { ContentSection } from "@/types/content";

// Switches for content that is parked for a future iteration. Files stay in the repo; flipping a
// flag to true and rebuilding brings the section or categories back everywhere (nav, pages,
// interview library, companies page and home counts).
export const features = {
  /** The /ml-system-design section and the practice questions from its articles. */
  mlSystemDesign: false,
  /** Interview categories flagged `mlInterviews` in taxonomy.yaml: ML Fundamentals, Deep Learning, Statistics & Data Science. */
  mlInterviews: false,
  /** The /cloud section (AWS, GCP and Azure). Shown under `next dev` only until the pilot pages are approved; set to
   *  true to publish it in production builds. */
  cloud: process.env.NODE_ENV !== "production",
} as const;

export type FeatureFlag = keyof typeof features;

export function isSectionEnabled(section: ContentSection) {
  if (section === "ml-system-design") return features.mlSystemDesign;
  if (section === "cloud") return features.cloud;
  return true;
}

// True when a site path such as /ml-system-design/... belongs to an enabled section.
export function isPathEnabled(href: string) {
  const under = (root: string) => href === root || href.startsWith(`${root}/`);
  if (under("/ml-system-design")) return features.mlSystemDesign;
  if (under("/cloud")) return features.cloud;
  return true;
}
