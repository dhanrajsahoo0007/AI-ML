import assert from "node:assert/strict";
import { describe, it } from "./test-runner";
import { allSections, builtSectionsOfKind, resolveSections, parseRegistry, REGISTRY_FILE } from "./registry";
import { kindOf } from "./kinds";
import { KINDS_WITH_ROUTES, SECTION_KINDS } from "./schema";
import { loadDocItems, loadNavIndex } from "../docs/source";
import fs from "node:fs";

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

describe("docs kind: hubs that are off (hubRelease)", () => {
  const entries = parseRegistry(fs.readFileSync(REGISTRY_FILE, "utf8"));
  const inEnv = (env: "local" | "production") =>
    resolveSections(entries, env).find((s) => s.key === "ai-system-design")!;
  it("leaves an off hub out of pages, routes, nav, sitemap and search", async () => {
    const section = inEnv("production");
    const kind = kindOf(section);
    const items = await kind.load(section);
    const offHref = "/ai-system-design/ml-system-design";
    const inOff = (href: string) => href === offHref || href.startsWith(`${offHref}/`);
    assert.ok(items.length > 0);
    assert.equal(items.filter((i) => inOff((i as { href: string }).href)).length, 0);
    assert.ok(!kind.sitemap(section, items).some((e) => inOff(e.url)));
    assert.ok(!kind.search(section, items).some((e) => inOff(e.href)));
    assert.ok(!kind.nav(section, items).groups.some((g) => inOff(g.href)));
    assert.ok(!loadNavIndex(section).hubs.some((h) => h.slug === "ml-system-design"));
    // The files are still there for the checks that need them.
    assert.ok(loadDocItems(section, { includeOffHubs: true }).some((i) => inOff(i.href)));
  });
  it("includes the hub where it is on", async () => {
    const section = inEnv("local");
    const items = await kindOf(section).load(section);
    assert.ok(items.some((i) => (i as { href: string }).href === "/ai-system-design/ml-system-design/drift-detection"));
  });
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
    const planned = SECTION_KINDS.filter((k) => !KINDS_WITH_ROUTES.includes(k));
    for (const section of planned.flatMap((k) => builtSectionsOfKind(k))) {
      const kind = kindOf(section);
      assert.deepEqual(await kind.load(section), []);
      assert.equal(kind.nav(section, []).comingSoon, true);
    }
  });
});
