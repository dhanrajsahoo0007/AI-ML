import type { NavCategory } from "../sections/kind";
import type { SectionDef, SectionTone } from "../sections/schema";
import { slugify } from "../../lib/doc-headings";
import { hubsOf, loadNavIndex, type DocItem } from "./source";

// Section-level groups (`groups` in content/sections.yaml): the reading order of a docs section, each group a
// named list of hub categories. A group can draw categories from more than one hub, so the order on the section
// index, in the sidebar and in the header menu is set in one place and no page has to move. Categories of hubs
// that are `off` in this environment are left out, and a group with none left is dropped.

interface DocGroup {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  tone?: SectionTone;
  /** The hub page of the group's first category, at that category's heading. */
  href: string;
  categories: NavCategory[];
  /** Pages in the group. */
  count: number;
}

/** The id of a category's heading on its hub page (<ModelCategory> sets the same id). */
function categoryAnchor(title: string) {
  return slugify(title);
}

function lastSegment(href: string) {
  return href.split("/").filter(Boolean).at(-1) ?? href;
}

/** Every category of the section's visible hubs, in hub then index order, with the hub it belongs to. */
export function hubCategories(section: SectionDef, hub?: string): (NavCategory & { hub: string })[] {
  return loadNavIndex(section)
    .hubs.filter((h) => hub === undefined || h.slug === hub)
    .flatMap((h) =>
      h.categories
        .filter((c) => c.cards.length > 0)
        .map((c) => ({
          hub: h.slug,
          title: c.title,
          ...(c.icon ? { icon: c.icon } : {}),
          items: c.cards.map((card) => ({ slug: lastSegment(card.href), title: card.title, href: card.href })),
        }))
    );
}

/** The section's groups resolved against its visible hubs; empty when sections.yaml sets none. */
export function sectionGroups(section: SectionDef, items: DocItem[]): DocGroup[] {
  if (!section.groups?.length) return [];
  const hubHref = new Map(hubsOf(items).map((h) => [h.slug, h.href]));
  const all = hubCategories(section).filter((c) => hubHref.has(c.hub));
  const used = new Set<string>();
  const groups: DocGroup[] = [];
  for (const g of section.groups) {
    const matched = g.categories.flatMap((title) => all.find((c) => c.title === title && !used.has(c.title)) ?? []);
    if (matched.length === 0) continue;
    matched.forEach((c) => used.add(c.title));
    groups.push({
      slug: slugify(g.name),
      name: g.name,
      icon: g.icon,
      description: g.description,
      tone: g.tone,
      href: `${hubHref.get(matched[0].hub)}#${categoryAnchor(matched[0].title)}`,
      categories: matched.map(({ title, icon, items: cards }) => ({ title, ...(icon ? { icon } : {}), items: cards })),
      count: matched.reduce((n, c) => n + c.items.length, 0),
    });
  }
  return groups;
}
