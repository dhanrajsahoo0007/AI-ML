import { afterEach, describe, expect, it, vi } from "vitest";
import { sectionOfKind, type SectionDef } from "../sections/registry";
import { kindOf } from "../sections/kinds";
import { problemListHref, problemsKind } from "./kind";
import { loadDsaItems, problemsOf, topicsOf, validProblems, type DsaItem, type ValidProblem } from "./source";

// The `problems` kind against the real DSA content and registry entry (plan §15.1). The section is picked by
// kind, never by key (plan §5.1).

const section = sectionOfKind("problems");
const items = loadDsaItems(section);
const problems = validProblems(items);
const byTitle = (title: string) => problems.find((p) => p.fm.title === title)!;

afterEach(() => vi.unstubAllEnvs());

describe("problems kind: contract", () => {
  it("is the module the registry maps the kind to", () => {
    expect(kindOf(section)).toBe(problemsKind);
  });
  it("loads the topics and problems", async () => {
    const loaded = await problemsKind.load(section);
    expect(topicsOf(loaded).length).toBeGreaterThanOrEqual(2);
    expect(problemsOf(loaded).length).toBeGreaterThanOrEqual(3);
    expect(loaded.every((i) => i.issues.length === 0)).toBe(true);
  });
  it("has one route param per topic and per problem", () => {
    const params = problemsKind.staticParams(section, items);
    expect(params).toHaveLength(items.length);
    expect(params.filter((p) => "topic" in p).map((p) => p.topic)).toEqual(topicsOf(items).map((t) => t.slug));
    expect(params.filter((p) => "slug" in p).map((p) => p.slug)).toEqual(problemsOf(items).map((p) => p.slug));
  });
  it("builds a nav with topics and problems grouped by difficulty", () => {
    const nav = problemsKind.nav(section, items);
    expect(nav.href).toBe(section.href);
    expect(nav.comingSoon).toBeUndefined();
    expect(nav.groups.map((g) => g.title)).toEqual(["Topics", "Problems"]);
    expect(nav.groups[0].items!.map((i) => i.href)).toEqual(topicsOf(items).map((t) => t.href));
    const problemGroup = nav.groups[1];
    expect(problemGroup.href).toBe(problemListHref(section));
    expect(problemGroup.categories!.map((c) => c.title)).toEqual(["Easy", "Medium"]);
    expect(problemGroup.categories!.flatMap((c) => c.items.map((i) => i.href)).sort()).toEqual(
      problems.map((p) => p.href).sort()
    );
  });
  it("lists every page in the sitemap", () => {
    const urls = problemsKind.sitemap(section, items).map((e) => e.url);
    expect(urls).toEqual([section.href, problemListHref(section), ...items.map((i) => i.href)]);
  });
  it("indexes titles and summaries only for search", () => {
    const docs = problemsKind.search(section, items);
    expect(docs).toHaveLength(items.length);
    const text = JSON.stringify(docs);
    // Words that occur only in statements and editorials.
    for (const phrase of ["PremiumBreak", "Brute force", "doubly linked list", "Constraints"])
      expect(text).not.toContain(phrase);
  });
  it("counts published problems as written", () => {
    expect(problemsKind.counts(items)).toEqual({ written: problems.length, outline: 0 });
  });
});

describe("problems kind: access", () => {
  const withAccess = (access: SectionDef["access"]) => ({ ...section, access });
  it("keeps topics and easy problems free under the section's alwaysFree rules", () => {
    expect(section.access?.alwaysFree).toEqual(expect.arrayContaining(["topics", "easy-problems"]));
    for (const t of topicsOf(items)) expect(problemsKind.access(section, t)).toBe("free");
    expect(problemsKind.access(section, byTitle("Two Sum"))).toBe("free");
  });
  it("makes other problems premium by default, unless the frontmatter says otherwise", () => {
    expect(problemsKind.access(section, byTitle("Number of Islands"))).toBe("premium");
    expect(problemsKind.access(section, byTitle("LRU Cache"))).toBe("premium");
    const p = byTitle("Number of Islands");
    expect(problemsKind.access(section, { ...p, fm: { ...p.fm, access: "free" } })).toBe("free");
    const easy = byTitle("Two Sum");
    const noOverride = { ...easy, fm: { ...easy.fm, access: undefined } };
    expect(problemsKind.access(withAccess({ default: "premium" }), noOverride)).toBe("premium");
  });
});

describe("problems kind: company refs", () => {
  it("tags each published problem with its companies, linking to the problem", () => {
    const p = byTitle("Two Sum");
    expect(problemsKind.companyRefs!(p)).toEqual(p.fm.companies.map((company) => ({ company, href: p.href })));
    expect(problemsKind.companyRefs!(topicsOf(items)[0])).toEqual([]);
    expect(problemsKind.companyRefs!({ ...p, fm: { ...p.fm, status: "draft" } } as DsaItem)).toEqual([]);
  });
});

describe("problems kind: validate", () => {
  const messages = async (list: DsaItem[]) =>
    (await problemsKind.validate(section, list)).filter((e) => e.level === "error").map((e) => e.message);
  const broken = (title: string, fm: Partial<ValidProblem["fm"]>, extra: Partial<ValidProblem> = {}) => {
    const p = byTitle(title);
    return items.map((i) => (i === p ? { ...p, ...extra, fm: { ...p.fm, ...fm } } : i));
  };

  it("passes on the real content", async () => {
    expect(await problemsKind.validate(section, items)).toEqual([]);
  });
  it("reports frontmatter issues", async () => {
    const p = byTitle("Two Sum");
    expect(await messages(items.map((i) => (i === p ? { ...p, issues: ["difficulty: Invalid option"] } : i)))).toEqual([
      "frontmatter difficulty: Invalid option",
    ]);
  });
  it("reports unknown companies, topics and patterns", async () => {
    expect(
      await messages(broken("Two Sum", { companies: ["acme-corp"], topics: ["nope"], patterns: ["telepathy"] }))
    ).toEqual([
      'unknown pattern "telepathy" (add it to patterns.yaml)',
      'unknown topic "nope" (no topics/nope.mdx)',
      'unknown company "acme-corp" (not in content/companies/companies.yaml)',
    ]);
  });
  it("requires a starter and an entry point for every language", async () => {
    const p = byTitle("Two Sum");
    expect(
      await messages(
        broken("Two Sum", { starter: { javascript: p.fm.starter.javascript }, entry: { python: "two_sum" } })
      )
    ).toEqual(["no entry point for javascript", "no starter code for python"]);
    expect(await messages(broken("Two Sum", { entry: { ...p.fm.entry, javascript: "solve" } }))).toEqual([
      "the javascript starter does not define solve",
    ]);
  });
  it("checks that test files exist and have the right shape", async () => {
    expect(
      await messages(
        broken("Two Sum", { tests: { public: "tests/missing.public.json", hidden: "tests/two-sum.hidden.json" } })
      )
    ).toEqual(["public tests: tests/missing.public.json does not exist"]);
    const asClass = await messages(broken("Two Sum", { mode: "class" }));
    expect(asClass.length).toBeGreaterThan(0);
    expect(asClass.every((m) => m.startsWith("case "))).toBe(true);
  });
  it("requires <PremiumBreak/> and existing related pages", async () => {
    expect(
      await messages(broken("Two Sum", { related: ["/system-design/patterns/no-such-page"] }, { hasBreak: false }))
    ).toEqual([
      "missing <PremiumBreak/> between the statement and the editorial",
      "related page /system-design/patterns/no-such-page does not exist",
    ]);
  });
  it("reserves the problem-list segment for the list", async () => {
    const t = topicsOf(items)[0];
    // Renaming the topic also orphans the problems that use it, so look for the one message.
    expect(await messages(items.map((i) => (i === t ? { ...t, slug: "problems" } : i)))).toContain(
      'a topic cannot be called "problems" (that URL is the problem list)'
    );
  });
});
