import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { CONTENT_DIR } from "../sections/registry";
import type { SectionDef } from "../sections";
import {
  patternsSchema,
  PREMIUM_BREAK,
  problemFrontmatterSchema,
  testFileSchema,
  topicFrontmatterSchema,
  type Pattern,
  type ProblemFrontmatter,
  type TestCase,
  type TopicFrontmatter,
} from "./schema";

// Reads a problems section from disk (plan §15.1). Build time only. No JSX imports, so content-check can
// load it with plain Node.
//
// Hidden tests: only their path is kept on the item. The one reader of their contents is
// readHiddenTestsForValidation(), used by content-check; no page imports it, so hidden cases never reach a
// page, its RSC payload or a client bundle (tested in src/features/dsa/leak.test.ts). Reference solutions
// (content/<section>/solutions/<slug>.py) follow the same rule: readReferenceSolutionForValidation() is their one
// reader, for content-check and the tests.

type Section = Pick<SectionDef, "key" | "href">;

interface Base {
  slug: string;
  href: string;
  /** Absolute path of the MDX file. */
  file: string;
  /** Raw frontmatter (validated below; content-check reports the issues). */
  data: Record<string, unknown>;
  /** zod issues in the frontmatter, as "field: message". Empty when valid. */
  issues: string[];
  title: string;
  description?: string;
}

export interface DsaTopic extends Base {
  type: "topic";
  fm: TopicFrontmatter | null;
}

export interface DsaProblem extends Base {
  type: "problem";
  fm: ProblemFrontmatter | null;
  /** True when the body has a <PremiumBreak/> marker. */
  hasBreak: boolean;
}

export type DsaItem = DsaTopic | DsaProblem;

/** A problem whose frontmatter passed validation. */
export type ValidProblem = DsaProblem & { fm: ProblemFrontmatter };
export type ValidTopic = DsaTopic & { fm: TopicFrontmatter };

export const TOPICS_DIR = "topics";
const PROBLEMS_DIR = "problems";
export const SOLUTIONS_DIR = "solutions";
export const PATTERNS_FILE = "patterns.yaml";
/** Path segment of the problem list and problem pages, below the section href. */
export const PROBLEMS_SEGMENT = "problems";

export function dsaDir(section: Pick<SectionDef, "key">) {
  return path.join(CONTENT_DIR, section.key);
}

function mdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    .map((e) => e.name)
    .sort();
}

function issuesOf(error: { issues: { path: PropertyKey[]; message: string; code?: string }[] }) {
  return error.issues.map((i) => `${i.path.map(String).join(".") || "frontmatter"}: ${i.message}`);
}

const byOrder = <T extends { fm: { order?: number } | null; title: string }>(a: T, b: T) =>
  (a.fm?.order ?? Infinity) - (b.fm?.order ?? Infinity) || a.title.localeCompare(b.title);

const cache = new Map<string, DsaItem[]>();

/** Topics first (by `order`, then title), then problems (by `order`, then title). */
export function loadDsaItems(section: Section): DsaItem[] {
  const hit = cache.get(section.key);
  if (hit) return hit;
  const dir = dsaDir(section);

  const topics = mdxFiles(path.join(dir, TOPICS_DIR)).map((name): DsaTopic => {
    const file = path.join(dir, TOPICS_DIR, name);
    const slug = name.slice(0, -4);
    const { data } = matter(fs.readFileSync(file, "utf8"));
    const parsed = topicFrontmatterSchema.safeParse(data);
    return {
      type: "topic",
      slug,
      href: `${section.href}/${slug}`,
      file,
      data,
      issues: parsed.success ? [] : issuesOf(parsed.error),
      fm: parsed.success ? parsed.data : null,
      title: typeof data.title === "string" ? data.title : slug,
      description: typeof data.description === "string" ? data.description : undefined,
    };
  });

  const problems = mdxFiles(path.join(dir, PROBLEMS_DIR)).map((name): DsaProblem => {
    const file = path.join(dir, PROBLEMS_DIR, name);
    const slug = name.slice(0, -4);
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    const parsed = problemFrontmatterSchema.safeParse(data);
    return {
      type: "problem",
      slug,
      href: `${section.href}/${PROBLEMS_SEGMENT}/${slug}`,
      file,
      data,
      issues: parsed.success ? [] : issuesOf(parsed.error),
      fm: parsed.success ? parsed.data : null,
      title: typeof data.title === "string" ? data.title : slug,
      description: typeof data.description === "string" ? data.description : undefined,
      hasBreak: PREMIUM_BREAK.test(content),
    };
  });

  const items = [...topics.sort(byOrder), ...problems.sort(byOrder)];
  cache.set(section.key, items);
  return items;
}

export const topicsOf = (items: DsaItem[]) => items.filter((i): i is DsaTopic => i.type === "topic");
export const problemsOf = (items: DsaItem[]) => items.filter((i): i is DsaProblem => i.type === "problem");

/** Valid items only; pages call this, and content-check has already failed the build on invalid ones. */
export function validProblems(items: DsaItem[]): ValidProblem[] {
  return problemsOf(items).filter((p): p is ValidProblem => p.fm !== null);
}

export function validTopics(items: DsaItem[]): ValidTopic[] {
  return topicsOf(items).filter((t): t is ValidTopic => t.fm !== null);
}

/** `status: draft` topics and problems are not built, listed, indexed or put in the sitemap. */
export const withoutDrafts = <T extends DsaItem>(items: T[]) => items.filter((i) => i.fm?.status !== "draft");

/** The section's pattern list; empty when the file is missing or invalid (content-check reports that). */
export function loadPatterns(section: Pick<SectionDef, "key">): Pattern[] {
  const file = path.join(dsaDir(section), PATTERNS_FILE);
  if (!fs.existsSync(file)) return [];
  const parsed = patternsSchema.safeParse(yaml.load(fs.readFileSync(file, "utf8")));
  return parsed.success ? parsed.data : [];
}

/** Parses a test-case file. Throws with the file name on invalid JSON or shape. */
function readTestFile(file: string): TestCase[] {
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file}: invalid JSON (${(e as Error).message})`);
  }
  const parsed = testFileSchema.safeParse(json);
  if (!parsed.success) throw new Error(`${file}: ${issuesOf(parsed.error).join("; ")}`);
  return parsed.data;
}

export function testFilePath(section: Pick<SectionDef, "key">, rel: string) {
  return path.join(dsaDir(section), rel);
}

/** The public cases of a problem: run in the browser by the Stage B runner. */
export function readPublicTests(section: Pick<SectionDef, "key">, problem: ValidProblem): TestCase[] {
  return readTestFile(testFilePath(section, problem.fm.tests.public));
}

/**
 * The hidden cases of a problem, for content-check only. Never call this from a page, layout or client
 * module: hidden cases must not reach the browser (plan §15.1).
 */
export function readHiddenTestsForValidation(section: Pick<SectionDef, "key">, problem: ValidProblem): TestCase[] {
  return readTestFile(testFilePath(section, problem.fm.tests.hidden));
}

/** Where a problem's Python reference solution lives (whether or not it exists). */
export function referenceSolutionPath(section: Pick<SectionDef, "key">, slug: string) {
  return path.join(dsaDir(section), SOLUTIONS_DIR, `${slug}.py`);
}

/**
 * A problem's Python reference solution, or null when there is none. For content-check and the tests only:
 * like hidden tests, it must never reach a page, its RSC payload or a client bundle.
 */
export function readReferenceSolutionForValidation(section: Pick<SectionDef, "key">, slug: string): string | null {
  const file = referenceSolutionPath(section, slug);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

/** Splits a problem's MDX body at <PremiumBreak/>: the statement (free) and the editorial. */
export function splitProblemBody(body: string): { statement: string; editorial: string | null } {
  const m = PREMIUM_BREAK.exec(body);
  if (!m) return { statement: body, editorial: null };
  return { statement: body.slice(0, m.index), editorial: body.slice(m.index + m[0].length) };
}
