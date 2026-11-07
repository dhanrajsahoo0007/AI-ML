import "server-only";
import { builtSections, getSection, visibleSections } from "@/features/sections/registry";
import { loadSection } from "@/features/sections/kinds";
import type { NavSection } from "@/features/sections/kind";

// Site navigation, built from the section registry (content/sections.yaml): each section's kind
// builds its own nav (docs sections read content/<section>/_index.yaml). The header gets every `on`
// section; a section's sidebar gets only that section.

export type { NavItem, NavCategory, NavGroup, NavSection } from "@/features/sections/kind";

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

/** Nav for the header mega-menu: every `on` section, in registry order. */
export async function getNavTree(): Promise<NavSection[]> {
  return Promise.all(visibleSections().map((s) => buildNav(s.key)));
}

/** Nav for one section's sidebar (also for `hidden` sections, whose own pages still need it). */
export async function getSectionNav(key: string): Promise<NavSection> {
  if (!builtSections().some((s) => s.key === key)) throw new Error(`Section "${key}" is off`);
  return buildNav(key);
}
