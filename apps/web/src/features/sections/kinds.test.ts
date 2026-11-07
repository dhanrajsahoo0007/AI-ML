import assert from "node:assert/strict";
import { describe, it } from "./test-runner";
import { allSections, builtSectionsOfKind } from "./registry";
import { kindOf } from "./kinds";
import { loadNavIndex } from "../docs/source";

describe("docs kind", () => {
  for (const section of allSections().filter((s) => s.kind === "docs")) {
    it(`${section.key}: every page gets a route and the nav matches the nav index`, async () => {
      const kind = kindOf(section);
      const items = await kind.load(section);
      assert.ok(items.length > 0, "has pages");
      const params = kind.staticParams(section, items) as { slug: string[] }[];
      assert.equal(params.length, items.length);
      const hrefs = new Set(items.map((i) => (i as { href: string }).href));
      const nav = kind.nav(section, items);
      assert.equal(nav.key, section.key);
      const navHrefs = nav.groups.flatMap((g) => [
        ...(g.items ?? []).map((i) => i.href),
        ...(g.categories ?? []).flatMap((c) => c.items.map((i) => i.href)),
      ]);
      for (const href of navHrefs) assert.ok(hrefs.has(href), `nav link ${href} has a page`);
      const cards = loadNavIndex(section).hubs.flatMap((h) => h.categories.flatMap((c) => c.cards.map((x) => x.href)));
      for (const href of cards) assert.ok(navHrefs.includes(href), `card ${href} is in the nav`);
    });
  }
});

describe("kinds", () => {
  it("every built section's kind returns nav and counts", async () => {
    for (const section of allSections().filter((s) => s.state !== "off")) {
      const kind = kindOf(section);
      const items = await kind.load(section);
      const counts = kind.counts(items);
      assert.ok(counts.written >= 0 && counts.outline >= 0);
      assert.equal(kind.nav(section, items).href, section.href);
    }
  });
  it("planned kinds load nothing and are marked coming soon", async () => {
    for (const section of builtSectionsOfKind("newsletter")) {
      const kind = kindOf(section);
      assert.deepEqual(await kind.load(section), []);
      assert.equal(kind.nav(section, []).comingSoon, true);
    }
  });
});
