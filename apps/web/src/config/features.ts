import type { ContentSection } from "@/types/content";

// Switches for content that is parked for a future iteration. Files stay in the repo; flipping a
// flag to true and rebuilding brings the section or categories back everywhere (nav, pages,
// interview library, companies page and home counts).
export const features = {
  /** The /ml-system-design section and the practice questions from its articles. */
  mlSystemDesign: false,
  /** Interview categories flagged `mlInterviews` in taxonomy.yaml: ML Fundamentals, Deep Learning, Statistics & Data Science. */
  mlInterviews: false,
} as const;

export type FeatureFlag = keyof typeof features;

export function isSectionEnabled(section: ContentSection) {
  return section === "ml-system-design" ? features.mlSystemDesign : true;
}

// True when a site path such as /ml-system-design/... belongs to an enabled section.
export function isPathEnabled(href: string) {
  return !(href === "/ml-system-design" || href.startsWith("/ml-system-design/")) || features.mlSystemDesign;
}
