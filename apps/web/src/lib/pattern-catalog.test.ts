import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { PATTERN_CATEGORIES, PATTERNS, USE_CASES, computeMatches } from "./pattern-catalog";

// The section and hub come from the catalog's own hrefs ("/<section>/<hub>/<slug>").
const [, SECTION, HUB] = PATTERNS[0].href.split("/");
const CONTENT = path.join(process.cwd(), "content");
const fileFor = (href: string) => path.join(CONTENT, href.slice(1) + ".mdx");

interface IndexCard {
  title: string;
  href: string;
  tier?: string;
}
interface IndexHub {
  slug: string;
  categories: { title: string; cards: IndexCard[] }[];
}

describe("pattern catalog", () => {
  it("has 36 patterns: 19 foundational and 17 advanced", () => {
    expect(PATTERNS).toHaveLength(36);
    expect(PATTERNS.filter((p) => p.tier === "core")).toHaveLength(19);
    expect(PATTERNS.filter((p) => p.tier === "advanced")).toHaveLength(17);
  });

  it("has unique slugs and use-case ids", () => {
    expect(new Set(PATTERNS.map((p) => p.slug)).size).toBe(PATTERNS.length);
    expect(new Set(USE_CASES.map((u) => u.id)).size).toBe(USE_CASES.length);
  });

  it("puts every pattern in at least one use case", () => {
    const used = new Set(USE_CASES.flatMap((u) => u.patterns.map((e) => e.slug)));
    expect(PATTERNS.filter((p) => !used.has(p.slug)).map((p) => p.slug)).toEqual([]);
  });

  it("gives every use case at least three foundational and one interview-edge pattern, all known", () => {
    for (const u of USE_CASES) {
      expect(u.patterns.filter((e) => e.role === "core").length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.patterns.filter((e) => e.role === "edge").length, u.id).toBeGreaterThanOrEqual(1);
      for (const e of u.patterns) {
        expect(
          PATTERNS.some((p) => p.slug === e.slug),
          `${u.id}: ${e.slug}`
        ).toBe(true);
        expect(e.why.length, `${u.id}: ${e.slug}`).toBeLessThanOrEqual(60);
      }
    }
  });

  it("links only to pages and case studies that exist", () => {
    const hrefs = [...PATTERNS.map((p) => p.href), ...USE_CASES.flatMap((u) => u.caseStudies.map((c) => c.href))];
    expect(hrefs.filter((h) => !fs.existsSync(fileFor(h)))).toEqual([]);
  });

  it("matches the hub in the nav index on href, title, tier and category order", () => {
    const index = yaml.load(fs.readFileSync(path.join(CONTENT, SECTION, "_index.yaml"), "utf8")) as {
      hubs: IndexHub[];
    };
    const hub = index.hubs.find((h) => h.slug === HUB)!;
    expect(hub.categories.map((c) => c.title)).toEqual([...PATTERN_CATEGORIES]);
    const fromIndex = hub.categories.flatMap((c) =>
      c.cards.map((card) => ({ href: card.href, title: card.title, tier: card.tier ?? "core", category: c.title }))
    );
    expect(fromIndex).toEqual(
      PATTERNS.map((p) => ({ href: p.href, title: p.title, tier: p.tier, category: p.category }))
    );
  });

  it("gives every advanced pattern an edge line without an em dash, and no core pattern one", () => {
    for (const p of PATTERNS) {
      if (p.tier === "advanced") {
        expect(p.edge?.length ?? 0, p.slug).toBeGreaterThan(0);
        expect(p.edge, p.slug).not.toContain("—");
      } else expect(p.edge, p.slug).toBeUndefined();
    }
  });

  it("marks the page frontmatter with the same tier", () => {
    for (const p of PATTERNS) {
      const advanced = /^tier:\s*advanced\s*$/m.test(fs.readFileSync(fileFor(p.href), "utf8"));
      expect(advanced, p.slug).toBe(p.tier === "advanced");
    }
  });
});

describe("computeMatches", () => {
  it("returns null when nothing is selected", () => {
    expect(computeMatches({ useCase: null, tier: "all" })).toBeNull();
  });

  it("matches every pattern of a tier, with an empty note, when only the tier is set", () => {
    const m = computeMatches({ useCase: null, tier: "advanced" })!;
    expect(m.size).toBe(17);
    expect([...m.values()].every((x) => x.role === "edge" && x.note === "")).toBe(true);
  });

  it("matches a use case's patterns with their reasons, narrowed by the tier", () => {
    const uc = USE_CASES.find((u) => u.id === "flash-sale-booking")!;
    const all = computeMatches({ useCase: uc.id, tier: "all" })!;
    expect(all.size).toBe(uc.patterns.length);
    const lock = all.get(PATTERNS.find((p) => p.slug === "concurrency-and-locking")!.href);
    expect(lock).toEqual({ role: "edge", note: "Timed seat holds" });
    const coreOnly = computeMatches({ useCase: uc.id, tier: "core" })!;
    expect(coreOnly.size).toBe(uc.patterns.filter((e) => e.role === "core").length);
  });
});
