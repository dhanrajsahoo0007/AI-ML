import {
  KINDS_WITH_ROUTES,
  type NavGroupName,
  type SectionDef,
  type SectionKindName,
  type SectionTone,
} from "./schema";

// The section-kind contract (plan §5.1). Every kind (docs, question-bank, directory, and later
// problems and newsletter) is implemented once as an object of this shape, and shared code only loops
// over the registry calling these functions. Adding a section of an existing kind needs no code.

export type { SectionDef, SectionKindName };

/** One generateStaticParams entry. */
export type RouteParam = Record<string, string | string[]>;

export interface NavItem {
  slug: string;
  title: string;
  href: string;
  status?: "outline" | "draft" | "published";
}

export interface NavCategory {
  title: string;
  /** Icon key (src/lib/icons.ts) shown before the heading in the sidebar. */
  icon?: string;
  items: NavItem[];
}

export interface NavGroup {
  slug: string;
  title: string;
  href: string;
  icon?: string;
  tone?: SectionTone;
  categories?: NavCategory[];
  items?: NavItem[];
}

/** A section's nav: header mega-menu panel and sidebar. */
export interface NavSection {
  key: string;
  kind: SectionKindName;
  label: string;
  shortLabel?: string;
  href: string;
  icon: string;
  tone?: SectionTone;
  navGroup: NavGroupName;
  groups: NavGroup[];
  /** The section's kind has no pages yet: shown in the nav without a link. */
  comingSoon?: boolean;
}

export interface SitemapEntry {
  url: string;
  lastModified?: string;
}

export interface SearchDoc {
  href: string;
  title: string;
  description?: string;
  section: string;
}

/** An item whose practice questions feed Interview Practice. */
export interface QuestionRef {
  href: string;
  file: string;
}

/** A company tag on an item, aggregated by Company Questions. */
export interface CompanyRef {
  company: string;
  href: string;
}

export interface ContentError {
  file: string;
  line?: number;
  message: string;
  level: "error" | "warning";
}

export interface SectionKind<Item> {
  kind: SectionKindName;
  /** Build time only: the one place a kind reads content from disk. */
  load(section: SectionDef): Promise<Item[]>;
  /** Feeds generateStaticParams for the kind's routes. */
  staticParams(section: SectionDef, items: Item[]): RouteParam[];
  nav(section: SectionDef, items: Item[]): NavSection;
  /** Public URLs only. */
  sitemap(section: SectionDef, items: Item[]): SitemapEntry[];
  /** Build-time search index; premium bodies excluded. */
  search(section: SectionDef, items: Item[]): SearchDoc[];
  /** Feeds premium-routes.json for middleware (§9.2). */
  access(section: SectionDef, item: Item): "free" | "premium";
  questions?(item: Item): QuestionRef[];
  companyRefs?(item: Item): CompanyRef[];
  /** Home-page stats. */
  counts(items: Item[]): { written: number; outline: number };
  /** content-check (§5.4). */
  validate(section: SectionDef, items: Item[]): ContentError[] | Promise<ContentError[]>;
}

/** Builds a NavSection from a registry entry and its groups. */
export function navSection(section: SectionDef, groups: NavGroup[]): NavSection {
  const { key, kind, label, shortLabel, href, icon, navGroup, tone } = section;
  const comingSoon = !KINDS_WITH_ROUTES.includes(kind);
  return {
    key,
    kind,
    label,
    ...(shortLabel ? { shortLabel } : {}),
    href,
    icon,
    ...(tone ? { tone } : {}),
    navGroup,
    groups,
    ...(comingSoon ? { comingSoon } : {}),
  };
}
