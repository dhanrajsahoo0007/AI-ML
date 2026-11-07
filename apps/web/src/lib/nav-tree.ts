import "server-only";
import { builtSections, getSection, visibleSections } from "@/features/sections/registry";
import { loadSection } from "@/features/sections/kinds";
import { headerNavSection, type HeaderNavSection } from "@/features/sections/public";
import type { NavSection } from "@/features/sections/kind";

// Site navigation, built from the section registry (content/sections.yaml): each section's kind
// builds its own nav (docs sections read content/<section>/_index.yaml). The header gets a slim list
// of every `on` section (top-level link and first-level groups, no articles), sent with every page;
// a section's sidebar gets only that section's full tree.

export type { NavCategory, NavGroup, NavSection } from "@/features/sections/kind";

const cache = new Map<string, NavSection>();

async function buildNav(key: string): Promise<NavSection> {
  const hit = cache.get(key);
  if (hit) return hit;
  const def = getSection(key);
  if (!def) throw new Error(`Unknown section "${key}"`);
  const { section, kind, items } = await loadSection(def);
  const nav = kind.nav(section, items);
  cache.set(key, nav);
  return nav;
}

/** Full nav of every `on` section, in registry order (server-side use only: home counts, tests). */
export async function getNavTree(): Promise<NavSection[]> {
  return Promise.all(visibleSections().map((s) => buildNav(s.key)));
}

/** Nav for the header mega-menu: every `on` section without its item-level tree. */
export async function getHeaderNav(): Promise<HeaderNavSection[]> {
  return (await getNavTree()).map(headerNavSection);
}

/** Nav for one section's sidebar (also for `hidden` sections, whose own pages still need it). */
export async function getSectionNav(key: string): Promise<NavSection> {
  if (!builtSections().some((s) => s.key === key)) throw new Error(`Section "${key}" is off`);
  return buildNav(key);
}
