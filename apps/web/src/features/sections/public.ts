import type { NavGroupName, SectionKindName } from "./schema";

// Client-safe view of the registry: the `on` sections' header links. next.config.ts resolves the
// registry at build and inlines the result as process.env.SECTION_NAV, so client components (header,
// footer) get the nav without shipping the YAML parser, and hidden or off sections never reach the
// browser bundle.

export interface PublicNavLink {
  key: string;
  kind: SectionKindName;
  label: string;
  href: string;
  icon: string;
  navGroup: NavGroupName;
  /** No pages yet: shown without a link. */
  comingSoon?: boolean;
}

/** Sections of this kind get a "Subscribe" call to action in the header once they have pages. */
export const SUBSCRIBE_KIND: SectionKindName = "newsletter";

export const NAV_GROUP_LABELS: Record<NavGroupName, string> = {
  learn: "Learn",
  practice: "Practice",
  more: "More",
};

let parsed: PublicNavLink[] | null = null;

export function publicNav(): PublicNavLink[] {
  parsed ??= JSON.parse(process.env.SECTION_NAV ?? "[]") as PublicNavLink[];
  return parsed;
}
