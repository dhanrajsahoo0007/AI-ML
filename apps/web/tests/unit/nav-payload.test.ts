import { afterEach, describe, expect, it } from "vitest";
import { getHeaderNav, getNavTree, type NavSection } from "@/lib/nav-tree";
import { allSections, visibleSections } from "@/features/sections/registry";
import { APP_ENVS } from "@/features/sections/schema";

// Plan §6 P4: the header is serialized into every page, so it gets only the top-level list (sections and
// their first-level groups). The item-level tree (every article) belongs in that section's sidebar only.

const before = process.env.APP_ENV;
afterEach(() => {
  if (before === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = before;
});

/** Every article/company href in a section's full nav (below the first-level groups). */
function itemHrefs(nav: NavSection): string[] {
  return nav.groups.flatMap((g) => [
    ...(g.items ?? []).map((i) => i.href),
    ...(g.categories ?? []).flatMap((c) => c.items.map((i) => i.href)),
  ]);
}

describe("header nav payload", () => {
  it("carries no item-level nav from any section", async () => {
    const full = await getNavTree();
    const header = await getHeaderNav();
    const json = JSON.stringify(header);

    expect(json).not.toMatch(/"items"|"categories"/);
    for (const section of header) {
      for (const group of section.groups) {
        expect(Object.keys(group).sort()).toEqual(
          ["count", "href", "slug", "title", ...(group.icon ? ["icon"] : [])].sort()
        );
      }
    }

    // No article href may appear, except one that is also a section or group link (a group's landing page).
    const topLevel = new Set(header.flatMap((s) => [s.href, ...s.groups.map((g) => g.href)]));
    const leaked = full.flatMap(itemHrefs).filter((href) => !topLevel.has(href) && json.includes(`"${href}"`));
    expect(leaked).toEqual([]);
  });

  it("keeps the first-level groups and their page counts", async () => {
    const full = await getNavTree();
    const header = await getHeaderNav();
    expect(header.map((s) => s.key)).toEqual(full.map((s) => s.key));
    for (const [i, section] of header.entries()) {
      expect(section.groups.map((g) => g.slug)).toEqual(full[i].groups.map((g) => g.slug));
      expect(section.groups.reduce((n, g) => n + g.count, 0)).toBe(itemHrefs(full[i]).length);
    }
  });

  it("is much smaller than the full tree", async () => {
    const full = JSON.stringify(await getNavTree()).length;
    const header = JSON.stringify(await getHeaderNav()).length;
    expect(header).toBeLessThan(full / 4);
  });

  it.each(APP_ENVS)("lists only `on` sections in %s (hidden and off sections stay out)", async (env) => {
    process.env.APP_ENV = env;
    const keys = (await getHeaderNav()).map((s) => s.key);
    expect(keys).toEqual(visibleSections().map((s) => s.key));
    for (const s of allSections().filter((s) => s.state !== "on")) expect(keys).not.toContain(s.key);
  });
});
