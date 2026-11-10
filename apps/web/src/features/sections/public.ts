import type { NavGroupName, SectionKindName, SectionTone } from "./schema";

// Client-safe view of the registry: the `on` sections' header links. next.config.ts resolves the
// registry at build and inlines the result as process.env.SECTION_NAV, so client components (header,
// footer) get the nav without shipping the YAML parser, and hidden or off sections never reach the
// browser bundle.

export interface PublicNavLink {
  key: string;
  kind: SectionKindName;
  label: string;
  /** Shorter label for the header bar (sections.yaml `shortLabel`). */
  shortLabel?: string;
  href: string;
  icon: string;
  /** The section's tint (sections.yaml `tone`); absent means the default navy accent. */
  tone?: SectionTone;
  navGroup: NavGroupName;
  /** No pages yet: shown without a link. */
  comingSoon?: boolean;
}

/** Sections of this kind get a "Subscribe" call to action in the header once they have pages. */
export const SUBSCRIBE_KIND: SectionKindName = "newsletter";

/**
 * Kinds whose header menu lists only the first-level groups (Interview Practice: its topics), with no article
 * pane beside them. Their articles are left out of nav-items.json.
 */
export const GROUPS_ONLY_KINDS: readonly SectionKindName[] = ["question-bank"];

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

/** One first-level group in the header mega-menu: a link and a page count, never its pages. */
interface HeaderNavGroup {
  slug: string;
  title: string;
  href: string;
  icon?: string;
  /** Pages (or companies) in the group, shown as a hint. */
  count: number;
}

/**
 * A section as the header gets it on every page: the top-level link plus its first-level groups. The
 * item-level tree (every article) is left out; only that section's own sidebar receives it.
 */
export interface HeaderNavSection extends Omit<PublicNavLink, "comingSoon"> {
  groups: HeaderNavGroup[];
  comingSoon?: boolean;
}

/** Structural input for headerNavSection (a NavSection from the section kinds). */
interface FullNavSection extends Omit<HeaderNavSection, "groups"> {
  groups: {
    slug: string;
    title: string;
    href: string;
    icon?: string;
    items?: unknown[];
    categories?: { title: string; icon?: string; items: unknown[] }[];
  }[];
}

/** Strips a section's nav down to what the header shows. */
export function headerNavSection(nav: FullNavSection): HeaderNavSection {
  const { key, kind, label, shortLabel, href, icon, tone, navGroup, comingSoon } = nav;
  return {
    key,
    kind,
    label,
    ...(shortLabel ? { shortLabel } : {}),
    href,
    icon,
    ...(tone ? { tone } : {}),
    navGroup,
    ...(comingSoon ? { comingSoon } : {}),
    groups: nav.groups.map((g) => ({
      slug: g.slug,
      title: g.title,
      href: g.href,
      ...(g.icon ? { icon: g.icon } : {}),
      count: (g.items?.length ?? 0) + (g.categories ?? []).reduce((n, c) => n + c.items.length, 0),
    })),
  };
}

/** One block of a group's article list in the header menu: an optional category heading and its articles. */
export interface HeaderNavBlock {
  /** Category title; absent for a group's uncategorised items. */
  title?: string;
  /** The category's icon key (src/lib/icons.ts), shown before its heading. */
  icon?: string;
  /** `slug` is set for directory sections only: the company whose logo the menu shows. */
  items: { title: string; href: string; slug?: string }[];
}

/** Every `on` section's article lists for the header menu: section key → group slug → blocks. */
export type HeaderNavItems = Record<string, Record<string, HeaderNavBlock[]>>;

/** Builds public/nav-items.json: titles and links only, loaded by the header when a menu first opens. */
export function headerNavItems(navs: FullNavSection[]): HeaderNavItems {
  type Item = { title: string; href: string; slug: string };
  return Object.fromEntries(
    navs
      .filter((nav) => !GROUPS_ONLY_KINDS.includes(nav.kind))
      .map((nav) => {
        const withSlug = nav.kind === "directory";
        const pick = (items: unknown[]) =>
          (items as Item[]).map(({ title, href, slug }) => ({ title, href, ...(withSlug ? { slug } : {}) }));
        return [
          nav.key,
          Object.fromEntries(
            nav.groups.map((g) => {
              const blocks: HeaderNavBlock[] = [];
              if (g.items?.length) blocks.push({ items: pick(g.items) });
              for (const c of g.categories ?? [])
                if (c.items.length)
                  blocks.push({ title: c.title, ...(c.icon ? { icon: c.icon } : {}), items: pick(c.items) });
              return [g.slug, blocks];
            })
          ),
        ];
      })
  );
}
