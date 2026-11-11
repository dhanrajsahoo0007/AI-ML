import fs from "node:fs";
import path from "node:path";
import { navSection, type CompanyRef, type ContentError, type SectionKind } from "../sections/kind";
import { CONTENT_DIR } from "../sections/registry";
import { DESCRIPTION_MAX, type SectionDef } from "../sections/schema";
import {
  classCaseSchema,
  hiddenNamePattern,
  LANGUAGES,
  MIN_HIDDEN_TESTS,
  PREMIUM_BREAK,
  PY_MAIN_GUARD,
  type TestCase,
} from "./schema";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "./constants";
import {
  dsaDir,
  loadDsaItems,
  loadPatterns,
  PATTERNS_FILE,
  PROBLEMS_SEGMENT,
  problemsOf,
  readHiddenTestsForValidation,
  readPublicTests,
  readReferenceSolutionForValidation,
  referenceSolutionPath,
  SOLUTIONS_DIR,
  testFilePath,
  topicsOf,
  validProblems,
  withoutDrafts,
  type DsaItem,
  type ValidProblem,
} from "./source";

// The `problems` kind: DSA (plan §15.1). Items are the topics in content/<section>/topics/*.mdx and the
// problems in content/<section>/problems/*.mdx, served by the app/<section> routes:
//
//   /<section>                    hub: topics and a link to the problem list
//   /<section>/<topic>            topic article and its problems
//   /<section>/problems           filterable list (build-time JSON index, filtered in the browser)
//   /<section>/problems/<slug>    statement, in-browser editor and runner (public tests), editorial
//
// Access: a problem's statement and public tests are free; `access` (or the section's rules: topics and
// easy problems are always free) decides whether the editorial is shown or replaced by a Pro placeholder.
// Drafts (`status: draft`, topic or problem) are validated but not built, listed, indexed or in the sitemap.

/** The problem list's path for a section. */
export const problemListHref = (section: Pick<SectionDef, "href">) => `${section.href}/${PROBLEMS_SEGMENT}`;

function access(section: SectionDef, item: DsaItem): "free" | "premium" {
  const alwaysFree = section.access?.alwaysFree ?? [];
  if (item.type === "topic") return alwaysFree.includes("topics") ? "free" : (section.access?.default ?? "free");
  if (item.fm?.access) return item.fm.access;
  if (item.fm?.difficulty === "easy" && alwaysFree.includes("easy-problems")) return "free";
  return section.access?.default ?? "free";
}

function lineOf(file: string, needle: RegExp): number | undefined {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const i = lines.findIndex((l) => needle.test(l));
  return i === -1 ? undefined : i + 1;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when a site path in `related` names a page that exists in the content tree. */
function relatedExists(section: SectionDef, items: DsaItem[], href: string): boolean {
  if (href === section.href || href.startsWith(`${section.href}/`)) {
    return (
      href === section.href || href === problemListHref(section) || withoutDrafts(items).some((i) => i.href === href)
    );
  }
  return fs.existsSync(path.join(CONTENT_DIR, `${href.slice(1)}.mdx`));
}

export const problemsKind: SectionKind<DsaItem> = {
  kind: "problems",

  async load(section) {
    return loadDsaItems(section);
  },

  staticParams(_section, items) {
    const built = withoutDrafts(items);
    return [...topicsOf(built).map((t) => ({ topic: t.slug })), ...problemsOf(built).map((p) => ({ slug: p.slug }))];
  },

  // Two groups: the topics, and the problems by difficulty.
  nav(section, items) {
    const problems = validProblems(items).filter((p) => p.fm.status === "published");
    return navSection(section, [
      {
        slug: "topics",
        title: "Topics",
        href: section.href,
        items: topicsOf(withoutDrafts(items)).map((t) => ({ slug: t.slug, title: t.title, href: t.href })),
      },
      {
        slug: PROBLEMS_SEGMENT,
        title: "Problems",
        href: problemListHref(section),
        categories: DIFFICULTIES.map((d) => ({
          title: DIFFICULTY_LABELS[d],
          items: problems
            .filter((p) => p.fm.difficulty === d)
            .map((p) => ({ slug: p.slug, title: p.title, href: p.href })),
        })).filter((c) => c.items.length > 0),
      },
    ]);
  },

  sitemap(section, items) {
    return [
      { url: section.href },
      { url: problemListHref(section) },
      ...withoutDrafts(items).map((i) => ({ url: i.href })),
    ];
  },

  // Titles and one-line summaries only: no statement, editorial or tests.
  search(section, items) {
    return withoutDrafts(items).map((i) => ({
      href: i.href,
      title: i.title,
      description: i.description,
      section: section.key,
    }));
  },

  access,

  companyRefs(item): CompanyRef[] {
    if (item.type !== "problem" || !item.fm || item.fm.status !== "published") return [];
    return item.fm.companies.map((company) => ({ company, href: item.href }));
  },

  counts(items) {
    const problems = problemsOf(items);
    const drafts = problems.filter((p) => p.fm?.status === "draft").length;
    return { written: problems.length - drafts, outline: drafts };
  },

  async validate(section, items) {
    const { getCompanies } = await import("../../lib/question-bank");
    const { iconMap } = await import("../../lib/icons");
    const errors: ContentError[] = [];
    const rel = (file: string) => path.relative(process.cwd(), file);
    const push = (file: string, message: string, line?: number, level: ContentError["level"] = "error") =>
      errors.push({ file: rel(file), line, message, level });
    const fieldLine = (file: string, key: string) => lineOf(file, new RegExp(`^${escape(key)}:`)) ?? 1;

    const patternsFile = path.join(dsaDir(section), PATTERNS_FILE);
    const patterns = new Set(loadPatterns(section).map((p) => p.slug));
    if (!fs.existsSync(patternsFile)) push(patternsFile, "missing pattern list");
    else if (patterns.size === 0) push(patternsFile, "invalid or empty pattern list (slug + label per entry)");
    const companies = new Set(getCompanies().map((c) => c.slug));
    const topicSlugs = new Set(topicsOf(items).map((t) => t.slug));

    for (const item of items) {
      for (const issue of item.issues) {
        const key = issue.split(/[.:]/)[0];
        push(item.file, `frontmatter ${issue}`, fieldLine(item.file, key));
      }
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug)) push(item.file, "file name must be lowercase kebab-case");
      if (item.description && item.description.length > DESCRIPTION_MAX) {
        push(
          item.file,
          `description is ${item.description.length} characters (max ${DESCRIPTION_MAX} for <meta>)`,
          fieldLine(item.file, "description"),
          "warning"
        );
      }
    }

    for (const topic of topicsOf(items)) {
      if (topic.slug === PROBLEMS_SEGMENT)
        push(topic.file, `a topic cannot be called "${PROBLEMS_SEGMENT}" (that URL is the problem list)`);
      if (PREMIUM_BREAK.test(fs.readFileSync(topic.file, "utf8")))
        push(topic.file, "topics are free: remove <PremiumBreak/>");
      const icon = topic.fm?.icon;
      if (icon && !(icon in iconMap))
        push(topic.file, `unknown icon "${icon}"; add it to src/lib/icons.ts`, fieldLine(topic.file, "icon"));
    }

    for (const problem of problemsOf(items)) {
      if (!problem.hasBreak) push(problem.file, "missing <PremiumBreak/> between the statement and the editorial");
      if (!problem.fm) continue;
      checkProblem(section, items, problem as ValidProblem, { patterns, companies, topicSlugs, push, fieldLine });
    }
    return errors;
  },
};

interface Checks {
  patterns: Set<string>;
  companies: Set<string>;
  topicSlugs: Set<string>;
  push: (file: string, message: string, line?: number, level?: ContentError["level"]) => void;
  fieldLine: (file: string, key: string) => number;
}

function checkProblem(section: SectionDef, items: DsaItem[], problem: ValidProblem, c: Checks) {
  const { fm, file } = problem;
  const valueLine = (value: string, key: string) =>
    lineOf(file, new RegExp(`\\b${escape(value)}\\b`)) ?? c.fieldLine(file, key);

  // Tags: each value must exist in its list.
  const tags = {
    patterns: { known: c.patterns, message: (v: string) => `unknown pattern "${v}" (add it to ${PATTERNS_FILE})` },
    topics: { known: c.topicSlugs, message: (v: string) => `unknown topic "${v}" (no topics/${v}.mdx)` },
    companies: {
      known: c.companies,
      message: (v: string) => `unknown company "${v}" (not in content/companies/companies.yaml)`,
    },
  };
  for (const [field, { known, message }] of Object.entries(tags)) {
    for (const v of fm[field as keyof typeof tags]) if (!known.has(v)) c.push(file, message(v), valueLine(v, field));
  }

  // A starter and an entry point for every language, and none for languages the problem doesn't offer.
  for (const lang of fm.languages) {
    if (!fm.starter[lang]) c.push(file, `no starter code for ${lang}`, c.fieldLine(file, "starter"));
    if (!fm.entry[lang]) c.push(file, `no entry point for ${lang}`, c.fieldLine(file, "entry"));
    else if (fm.starter[lang] && !fm.starter[lang]!.includes(fm.entry[lang]!)) {
      c.push(file, `the ${lang} starter does not define ${fm.entry[lang]}`, c.fieldLine(file, "starter"));
    }
  }
  for (const lang of LANGUAGES) {
    if (!fm.languages.includes(lang) && (fm.starter[lang] || fm.entry[lang])) {
      c.push(
        file,
        `starter or entry for ${lang}, which is not in languages`,
        c.fieldLine(file, "languages"),
        "warning"
      );
    }
  }

  // Test files: valid JSON of the right shape, enough cases, no hidden case repeated in the public file.
  const loaded: Record<"public" | "hidden", unknown[] | null> = { public: null, hidden: null };
  for (const kind of ["public", "hidden"] as const) {
    const target = testFilePath(section, fm.tests[kind]);
    if (!fs.existsSync(target)) {
      c.push(file, `${kind} tests: ${fm.tests[kind]} does not exist`, c.fieldLine(file, "tests"));
      continue;
    }
    try {
      const cases =
        kind === "public" ? readPublicTests(section, problem) : readHiddenTestsForValidation(section, problem);
      loaded[kind] = cases;
      if (fm.mode === "class") {
        cases.forEach((tc, i) => {
          const r = classCaseSchema.safeParse(tc);
          if (!r.success) c.push(target, `case ${i + 1}: ${r.error.issues.map((x) => x.message).join("; ")}`);
          else if (r.data.args[0][0] !== fm.entry[fm.languages[0]]) {
            c.push(target, `case ${i + 1}: the first operation must construct ${fm.entry[fm.languages[0]]}`);
          }
        });
      }
    } catch (e) {
      c.push(target, (e as Error).message.replace(`${target}: `, ""));
    }
  }
  if (loaded.hidden) {
    const pattern = hiddenNamePattern(problem.slug);
    const target = testFilePath(section, fm.tests.hidden);
    (loaded.hidden as TestCase[]).forEach((tc, i) => {
      if (!tc.name || !pattern.test(tc.name))
        c.push(target, `case ${i + 1}: hidden case names must be "hidden/${problem.slug}/NN <label>"`);
    });
  }
  if (loaded.hidden && loaded.hidden.length < MIN_HIDDEN_TESTS) {
    c.push(
      file,
      `only ${loaded.hidden.length} hidden tests (at least ${MIN_HIDDEN_TESTS} expected)`,
      c.fieldLine(file, "tests"),
      "warning"
    );
  }
  if (loaded.public && loaded.hidden) {
    const key = (tc: unknown) => JSON.stringify((tc as { args: unknown }).args);
    const pub = new Set(loaded.public.map(key));
    if (loaded.hidden.some((tc) => pub.has(key(tc))))
      c.push(file, "a hidden test repeats a public one", c.fieldLine(file, "tests"), "warning");
  }

  // Python: a reference solution in solutions/<slug>.py that defines the entry, and no __main__ block anywhere.
  if (fm.languages.includes("python")) {
    const entry = fm.entry.python;
    const reference = readReferenceSolutionForValidation(section, problem.slug);
    const refFile = referenceSolutionPath(section, problem.slug);
    if (reference === null) c.push(file, `no Python reference solution (${SOLUTIONS_DIR}/${problem.slug}.py)`);
    else {
      if (entry && !new RegExp(`^(?:def|class)\\s+${escape(entry)}\\b`, "m").test(reference))
        c.push(refFile, `the reference solution does not define ${entry} at the top level`);
      if (PY_MAIN_GUARD.test(reference)) c.push(refFile, 'remove the `if __name__ == "__main__":` block');
    }
    if (fm.starter.python && PY_MAIN_GUARD.test(fm.starter.python))
      c.push(file, 'the python starter has an `if __name__ == "__main__":` block', c.fieldLine(file, "starter"));
  }

  for (const href of fm.related) {
    if (!relatedExists(section, items, href))
      c.push(file, `related page ${href} does not exist`, valueLine(href, "related"));
  }
}

/** Problems tagged with a topic, in content order. */
export function problemsForTopic(items: DsaItem[], topic: string): ValidProblem[] {
  return validProblems(items).filter((p) => p.fm.status === "published" && p.fm.topics.includes(topic));
}
