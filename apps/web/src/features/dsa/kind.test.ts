import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sectionOfKind, type SectionDef } from "../sections/registry";
import { kindOf } from "../sections/kinds";
import { problemListHref, problemsKind } from "./kind";
import {
  loadDsaItems,
  problemsOf,
  referenceSolutionPath,
  topicsOf,
  validProblems,
  type DsaItem,
  type ValidProblem,
} from "./source";

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
    // Written problems first, then the statement-only outlines, which live at the same kind of URL.
    const pages = items.filter((i) => i.type !== "topic");
    expect(pages.length).toBeGreaterThan(problemsOf(items).length);
    expect(params.filter((p) => "slug" in p).map((p) => p.slug)).toEqual(pages.map((p) => p.slug));
  });
  it("builds a nav with one group per topic holding its problems, then a link to the problem list", () => {
    const nav = problemsKind.nav(section, items);
    expect(nav.href).toBe(section.href);
    expect(nav.comingSoon).toBeUndefined();
    const topics = topicsOf(items);
    expect(nav.groups.map((g) => g.title)).toEqual([...topics.map((t) => t.title), "Problems"]);
    expect(nav.groups.slice(0, -1).map((g) => g.href)).toEqual(topics.map((t) => t.href));
    expect(nav.groups.at(-1)).toEqual({ slug: "problems", title: "Problems", href: problemListHref(section) });
    // Every published problem is listed under each of its topics.
    const json = JSON.stringify(nav);
    for (const p of problems.filter((p) => p.fm?.status === "published")) expect(json).toContain(p.href);
  });
  it("lists every page in the sitemap", () => {
    const urls = problemsKind.sitemap(section, items).map((e) => e.url);
    expect(urls).toEqual([section.href, problemListHref(section), ...items.map((i) => i.href)]);
  });
  it("indexes titles and summaries only for search", () => {
    const docs = problemsKind.search(section, items);
    expect(docs).toHaveLength(items.length);
    // An outline's summary is the first sentence of its statement, so this check is for written problems.
    const outlineHrefs = new Set(items.filter((i) => i.type === "outline").map((i) => i.href));
    const text = JSON.stringify(docs.filter((d) => !outlineHrefs.has(d.href)));
    // Words that occur only in statements and editorials.
    for (const phrase of ["PremiumBreak", "Brute force", "doubly linked list", "Constraints"])
      expect(text).not.toContain(phrase);
  });
  it("counts published problems as written", () => {
    const outlines = items.filter((i) => i.type === "outline").length;
    expect(problemsKind.counts(items)).toEqual({ written: problems.length, outline: outlines });
  });
});

describe("problems kind: drafts", () => {
  const draftProblem = { ...byTitle("LRU Cache"), fm: { ...byTitle("LRU Cache").fm, status: "draft" as const } };
  const topic = topicsOf(items)[1];
  const draftTopic = { ...topic, fm: { ...topic.fm!, status: "draft" as const } };
  const withDrafts = items.map((i) => (i.slug === draftProblem.slug ? draftProblem : i === topic ? draftTopic : i));

  it("are not built: no route params for a draft topic or problem", () => {
    const params = problemsKind.staticParams(section, withDrafts);
    expect(params).toHaveLength(items.length - 2);
    expect(params).not.toContainEqual({ slug: draftProblem.slug });
    expect(params).not.toContainEqual({ topic: topic.slug });
  });
  it("are left out of the sitemap, search and the sidebar", () => {
    const urls = problemsKind.sitemap(section, withDrafts).map((e) => e.url);
    expect(urls).not.toContain(draftProblem.href);
    expect(urls).not.toContain(topic.href);
    const hrefs = problemsKind.search(section, withDrafts).map((d) => d.href);
    expect(hrefs).not.toContain(draftProblem.href);
    expect(hrefs).not.toContain(topic.href);
    expect(JSON.stringify(problemsKind.nav(section, withDrafts))).not.toContain(topic.href);
  });
  it("are still validated, and a related link to a draft is reported", async () => {
    const twoSum = byTitle("Two Sum");
    const list = withDrafts.map((i) =>
      i === twoSum ? { ...twoSum, fm: { ...twoSum.fm, related: [draftProblem.href] } } : i
    );
    const errors = (await problemsKind.validate(section, list)).map((e) => e.message);
    expect(errors).toContain(`related page ${draftProblem.href} does not exist`);
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
  it("requires hidden case names of the form hidden/<slug>/NN <label>", async () => {
    // Pointing Two Sum at another problem's hidden file: every name carries the wrong slug.
    const wrongSlug = await messages(
      broken("Two Sum", { tests: { public: "tests/two-sum.public.json", hidden: "tests/lru-cache.hidden.json" } })
    );
    expect(wrongSlug).toContain('case 1: hidden case names must be "hidden/two-sum/NN <label>"');
  });
  it("requires a Python reference solution that defines the entry and has no __main__ block", async () => {
    const p = byTitle("Two Sum");
    const file = referenceSolutionPath(section, p.slug);
    const real = { exists: fs.existsSync, read: fs.readFileSync };
    const text = real.read(file, "utf8");

    vi.spyOn(fs, "existsSync").mockImplementation((f) => f !== file && real.exists(f));
    expect(await messages(items)).toEqual(["no Python reference solution (solutions/two-sum.py)"]);
    vi.restoreAllMocks();

    const bad = `${text.replace("def two_sum", "def solve")}\nif __name__ == "__main__":\n    print(solve([1, 2], 3))\n`;
    vi.spyOn(fs, "readFileSync").mockImplementation(((f: fs.PathOrFileDescriptor, o?: BufferEncoding) =>
      f === file ? bad : real.read(f, o)) as typeof fs.readFileSync);
    expect(await messages(items)).toEqual([
      "the reference solution does not define two_sum at the top level",
      'remove the `if __name__ == "__main__":` block',
    ]);
    vi.restoreAllMocks();

    const starter = `${p.fm.starter.python}\nif __name__ == "__main__":\n    pass\n`;
    expect(await messages(broken("Two Sum", { starter: { ...p.fm.starter, python: starter } }))).toEqual([
      'the python starter has an `if __name__ == "__main__":` block',
    ]);
  });
  it("needs no Python reference for a problem without Python", async () => {
    const p = byTitle("Two Sum");
    const jsOnly = broken("Two Sum", {
      languages: ["javascript"],
      starter: { javascript: p.fm.starter.javascript },
      entry: { javascript: p.fm.entry.javascript },
    });
    expect(await messages(jsOnly)).toEqual([]);
  });
  it("reserves the problem-list segment for the list", async () => {
    const t = topicsOf(items)[0];
    // Renaming the topic also orphans the problems that use it, so look for the one message.
    expect(await messages(items.map((i) => (i === t ? { ...t, slug: "problems" } : i)))).toContain(
      'a topic cannot be called "problems" (that URL is the problem list)'
    );
  });
});
