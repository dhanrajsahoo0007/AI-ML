import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { getCompanies } from "@/lib/question-bank";
import { CONTENT_DIR, isPathVisible, sectionOfKind, routeSection } from "../sections";
import type { SectionDef } from "../sections";
import { problemListHref, problemsForTopic, problemsKind } from "./kind";
import { buildProblemIndex } from "./problem-index";
import {
  loadDsaItems,
  loadPatterns,
  readPublicTests,
  validProblems,
  validTopics,
  withoutDrafts,
  type ValidProblem,
} from "./source";

// Helpers for the app/<section> routes of the problems kind. Every page is prerendered: these run at build
// time only. A section that is `off` builds no topic or problem pages, and its static pages render 404. Drafts
// get no page at all.

export type TopicParams = Promise<{ topic: string }>;
export type ProblemParams = Promise<{ slug: string }>;

const isBuilt = () => sectionOfKind("problems").state !== "off";

/** The problems section, or a 404 when it is off in this environment. */
export function dsaSection(): SectionDef {
  return routeSection("problems");
}

function items(section: SectionDef) {
  const all = loadDsaItems(section);
  const invalid = all.filter((i) => i.issues.length > 0);
  if (invalid.length > 0)
    throw new Error(`Invalid DSA frontmatter in ${invalid.map((i) => i.file).join(", ")} (run npm run content-check)`);
  return all;
}

/** The section's items, and its topics and problems that have pages (drafts left out). */
export function dsaContent(section: SectionDef = dsaSection()) {
  const all = items(section);
  return { section, items: all, topics: withoutDrafts(validTopics(all)), problems: withoutDrafts(validProblems(all)) };
}

export function topicParams() {
  return isBuilt() ? dsaContent(sectionOfKind("problems")).topics.map((t) => ({ topic: t.slug })) : [];
}

export function problemParams() {
  return isBuilt() ? dsaContent(sectionOfKind("problems")).problems.map((p) => ({ slug: p.slug })) : [];
}

export function getTopic(slug: string) {
  const content = dsaContent();
  const topic = content.topics.find((t) => t.slug === slug);
  if (!topic) notFound();
  return { ...content, topic, problems: problemsForTopic(content.items, slug) };
}

export function getProblem(slug: string) {
  const content = dsaContent();
  const problem = content.problems.find((p) => p.slug === slug);
  if (!problem) notFound();
  return { ...content, problem, access: problemsKind.access(content.section, problem) };
}

export function problemIndex(section: SectionDef, problems: ValidProblem[]) {
  return buildProblemIndex({
    problems,
    access: (p) => problemsKind.access(section, p),
    patternLabels: new Map(loadPatterns(section).map((p) => [p.slug, p.label])),
    companyLabels: new Map(getCompanies().map((c) => [c.slug, c.name])),
  });
}

/** Labels for a problem's patterns and companies, in the order the frontmatter lists them. */
export function problemLabels(section: SectionDef, problem: ValidProblem) {
  const patterns = new Map(loadPatterns(section).map((p) => [p.slug, p.label]));
  const companies = new Map(getCompanies().map((c) => [c.slug, c.name]));
  return {
    patterns: problem.fm.patterns.map((slug) => ({ slug, label: patterns.get(slug) ?? slug })),
    companies: problem.fm.companies.map((slug) => ({ slug, label: companies.get(slug) ?? slug })),
  };
}

/** What the in-browser workspace needs: starters, entry points and the PUBLIC tests. Never hidden tests. */
export function workspaceProps(section: SectionDef, problem: ValidProblem) {
  const { fm } = problem;
  return {
    slug: problem.slug,
    languages: fm.languages,
    starter: fm.starter,
    entry: fm.entry,
    mode: fm.mode,
    tests: readPublicTests(section, problem),
  };
}

/** The title of a docs page from its frontmatter (content-check has verified the file exists). */
function docTitle(href: string): string | undefined {
  const file = path.join(CONTENT_DIR, `${href.slice(1)}.mdx`);
  if (!fs.existsSync(file)) return undefined;
  const title = matter(fs.readFileSync(file, "utf8")).data.title;
  return typeof title === "string" ? title : undefined;
}

/**
 * The `related` links of a problem. A link into a section that is not `on` in this environment gets
 * href null and is rendered as plain text (plan §5.1.1).
 */
export function relatedLinks(section: SectionDef, problem: ValidProblem) {
  const titles = new Map(items(section).map((i) => [i.href, i.title]));
  titles.set(problemListHref(section), "All problems");
  return problem.fm.related.map((href) => ({
    href: isPathVisible(href) ? href : null,
    label: titles.get(href) ?? docTitle(href) ?? href.split("/").filter(Boolean).at(-1)!.replaceAll("-", " "),
  }));
}
