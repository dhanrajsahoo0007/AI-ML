import "server-only";
import { INTERVIEW_AREAS, INTERVIEW_TRACKS, type InterviewTrack } from "./interview-areas";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import { z } from "zod";
import { features, type FeatureFlag } from "@/config/features";
import { allSections, isPathVisible, sectionOfKind } from "@/features/sections/registry";
import { checkAnswerMdx, extractInterviewQuestions, hasInterviewQuestions } from "@/lib/question-answer";

// The interview question library: every question has a category and subsection from
// content/question-bank/taxonomy.yaml. Questions come from two places:
// - content/question-bank/<category>.yaml (entries with `source: outcome-school` are adapted from
//   Outcome School's "AI Engineering Interview Questions Company Wise", Apache 2.0; answers are ours);
// - practice questions inside articles, filed by content/question-bank/articles.yaml.
// A YAML question can list `topics` (site pages it belongs to; it is shown on each of them) and `followUps` (the
// questions an interviewer asks next). A follow-up is a question of its own with `parent` set.
// Answers from both places are MDX with a restricted component set (lib/question-answer.ts); the library pages
// compile them with components/mdx/question-answer.tsx.

export type Level = "Junior" | "Mid" | "Senior";
export type QuestionSource = "outcome-school" | "original" | "article";

export interface QuestionRef {
  title: string;
  url: string;
}

export interface LinkRef {
  href: string;
  title: string;
}

export interface LibraryQuestion {
  id: string;
  q: string;
  /** The answer as MDX (plan §6). Compile it with AnswerBody; never render it for a locked answer. */
  a: string;
  /** Where the question is written, relative to content/ (for error messages). */
  file: string;
  level?: Level;
  category: string;
  subcategory: string;
  /** Company slugs. */
  companies: string[];
  related?: LinkRef;
  /** Site pages the question is tagged to, main topic first. The question is listed on each of them. */
  topics: LinkRef[];
  refs: QuestionRef[];
  source: QuestionSource;
  /**
   * What the question tests: slugs from content/question-bank/signals.yaml (an Amazon Leadership Principle, a
   * company's focus area, a general competency). Empty on follow-ups and article questions.
   */
  signals: string[];
  /** Set on a follow-up: the question it follows. */
  parent?: { id: string; q: string };
  /** The follow-ups of this question, in the order an interviewer asks them. They are also in the library on their own. */
  followUps: LibraryQuestion[];
}

export interface Subsection {
  slug: string;
  title: string;
  description: string;
}

export interface Category {
  slug: string;
  title: string;
  group: string;
  /** AI and ML, or classic system design (INTERVIEW_TRACKS). */
  track: InterviewTrack;
  icon: string;
  description: string;
  study: LinkRef[];
  subsections: Subsection[];
  /** Feature flag that must be on for the category to be shown. */
  flag?: FeatureFlag;
  /** `premium`: answers are for Pro when the paywall is on (plan §9.1); default free. */
  access?: "free" | "premium";
}

export interface Company {
  slug: string;
  name: string;
  group: string;
  roles: string;
  loop: string;
}

// The areas an interview category belongs to, in display order (src/lib/interview-areas.ts): how models work (LLM),
// what is built on them (GenAI) and how the systems around them are designed (System Design).
export const CATEGORY_GROUPS = INTERVIEW_AREAS.map((a) => a.name);

export const COMPANY_GROUPS = [
  "Frontier AI Labs",
  "Big Tech AI",
  "AI Infrastructure",
  "AI-Native Products",
  "Forward-Deployed & Enterprise",
  // The companies known for the classic system design loop (Google, Netflix, Uber, Stripe and others).
  "Product & Platform Companies",
];

const LEVELS: Level[] = ["Junior", "Mid", "Senior"];
const CONTENT = path.join(process.cwd(), "content");
const BANK_DIR = path.join(CONTENT, "question-bank");
const DATA_FILES = new Set(["taxonomy.yaml", "articles.yaml", "signals.yaml"]);

function readYaml<T>(file: string): T {
  return yaml.load(fs.readFileSync(file, "utf8")) as T;
}

// Resolves a site path such as /ai-system-design/genai-system-design to its MDX file and title.
function resolvePage(href: string): LinkRef | null {
  const file = path.join(CONTENT, `${href}.mdx`);
  if (!href.startsWith("/") || !fs.existsSync(file)) return null;
  const { data } = matter(fs.readFileSync(file, "utf8"));
  return { href, title: (data.title as string) ?? href };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// A subsection is exactly these three strings. In a YAML flow mapping ({ slug: …, description: … }) an
// unquoted comma ends the value, so an unquoted description with a comma would turn into extra keys.
const subsectionSchema = z.strictObject({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

/** Why a parsed taxonomy subsection is malformed, or null when it is fine. */
export function subsectionProblem(s: unknown): string | null {
  const parsed = subsectionSchema.safeParse(s);
  if (parsed.success) return null;
  return `${parsed.error.issues.map((i) => i.message).join("; ")} (quote values that contain commas)`;
}

function loadTaxonomy(errors: string[]): Category[] {
  type Raw = Omit<Category, "study"> & { study?: string[] };
  const raw = readYaml<Raw[]>(path.join(BANK_DIR, "taxonomy.yaml"));
  const seen = new Set<string>();
  return raw.map((c) => {
    if (seen.has(c.slug)) errors.push(`taxonomy: duplicate category ${c.slug}`);
    seen.add(c.slug);
    if (!CATEGORY_GROUPS.includes(c.group)) errors.push(`taxonomy ${c.slug}: unknown group ${c.group}`);
    if (!INTERVIEW_TRACKS.some((t) => t.slug === c.track)) {
      errors.push(`taxonomy ${c.slug}: track must be one of ${INTERVIEW_TRACKS.map((t) => t.slug).join(", ")}`);
    }
    if (c.flag !== undefined && !(c.flag in features)) errors.push(`taxonomy ${c.slug}: unknown flag ${c.flag}`);
    if (c.access !== undefined && c.access !== "free" && c.access !== "premium") {
      errors.push(`taxonomy ${c.slug}: access must be free or premium`);
    }
    const subs = new Set<string>();
    for (const s of c.subsections) {
      const problem = subsectionProblem(s);
      if (problem) errors.push(`taxonomy ${c.slug}: subsection ${String(s.slug)}: ${problem}`);
      if (subs.has(s.slug)) errors.push(`taxonomy ${c.slug}: duplicate subsection ${s.slug}`);
      subs.add(s.slug);
    }
    const study = (c.study ?? []).flatMap((href) => {
      const page = resolvePage(href);
      if (!page) errors.push(`taxonomy ${c.slug}: study page not found ${href}`);
      return page ? [page] : [];
    });
    return { ...c, study };
  });
}

function loadCompanies(errors: string[]): Company[] {
  const raw = readYaml<Company[]>(path.join(CONTENT, sectionOfKind("directory").key, "companies.yaml"));
  const slugs = new Set<string>();
  for (const c of raw) {
    for (const key of ["slug", "name", "group", "roles", "loop"] as const) {
      if (typeof c[key] !== "string" || !c[key]) errors.push(`company ${c.slug ?? "?"}: missing ${key}`);
    }
    if (!COMPANY_GROUPS.includes(c.group)) errors.push(`company ${c.slug}: unknown group ${c.group}`);
    if (slugs.has(c.slug)) errors.push(`company ${c.slug}: duplicate slug`);
    slugs.add(c.slug);
  }
  return raw;
}

export interface Signal {
  slug: string;
  title: string;
  /** The family it belongs to, e.g. "Amazon Leadership Principles". */
  group: string;
}

const signalSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string().min(1),
  group: z.string().min(1),
});

/** What a behavioural question tests (content/question-bank/signals.yaml). */
function loadSignals(errors: string[]): Signal[] {
  const raw = readYaml<unknown[]>(path.join(BANK_DIR, "signals.yaml")) ?? [];
  const out: Signal[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, i) => {
    const parsed = signalSchema.safeParse(entry);
    if (!parsed.success) errors.push(`signals.yaml entry ${i + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    else if (seen.has(parsed.data.slug)) errors.push(`signals.yaml: duplicate slug ${parsed.data.slug}`);
    else {
      seen.add(parsed.data.slug);
      out.push(parsed.data);
    }
  });
  return out;
}

export interface RawQuestion {
  id?: unknown;
  q?: unknown;
  a?: unknown;
  level?: unknown;
  category?: unknown;
  subcategory?: unknown;
  companies?: unknown;
  related?: unknown;
  refs?: unknown;
  source?: unknown;
  topics?: unknown;
  followUps?: unknown;
  signals?: unknown;
}

// The fields a follow-up may have (anything else, a nested `followUps` included, is an error).
const FOLLOW_UP_KEYS = new Set(Object.keys({ q: 0, a: 0, level: 0, companies: 0, topics: 0, refs: 0 }));

function loadYamlQuestions(
  categories: Map<string, Pick<Category, "track" | "subsections">>,
  companySlugByName: Map<string, string>,
  errors: string[],
  signalSlugs: ReadonlySet<string>
): LibraryQuestion[] {
  const files = fs.readdirSync(BANK_DIR).filter((f) => f.endsWith(".yaml") && !DATA_FILES.has(f));
  return files.flatMap((file) =>
    parseYamlQuestions(
      file,
      readYaml<RawQuestion[]>(path.join(BANK_DIR, file)) ?? [],
      categories,
      companySlugByName,
      errors,
      signalSlugs
    )
  );
}

/** The questions of one parsed library file, follow-ups included; problems are added to `errors`. */
export function parseYamlQuestions(
  file: string,
  entries: RawQuestion[],
  categories: Map<string, Pick<Category, "track" | "subsections">>,
  companySlugByName: Map<string, string>,
  errors: string[],
  /** The slugs of signals.yaml. Left out (unit tests), a question's `signals` are only checked for shape. */
  signalSlugs?: ReadonlySet<string>
): LibraryQuestion[] {
  const out: LibraryQuestion[] = [];

  // The fields a question and a follow-up share.
  const common = (r: RawQuestion, where: string) => {
    if (typeof r.q !== "string" || !r.q.trim()) errors.push(`${where}: missing q`);
    if (typeof r.a !== "string" || !r.a.trim()) errors.push(`${where}: missing a`);
    else for (const problem of checkAnswerMdx(r.a)) errors.push(`${where}: ${problem}`);
    if (!LEVELS.includes(r.level as Level)) errors.push(`${where}: bad level ${String(r.level)}`);
    const companies: string[] = [];
    for (const name of Array.isArray(r.companies) ? (r.companies as string[]) : []) {
      const slug = companySlugByName.get(name);
      if (slug) companies.push(slug);
      else errors.push(`${where}: unknown company ${name}`);
    }
    const topics: LinkRef[] = [];
    if (r.topics !== undefined && !Array.isArray(r.topics)) errors.push(`${where}: topics must be a list of pages`);
    for (const href of Array.isArray(r.topics) ? (r.topics as unknown[]) : []) {
      const page = typeof href === "string" ? resolvePage(href) : null;
      if (!page) errors.push(`${where}: topic page not found ${String(href)}`);
      else if (topics.some((t) => t.href === page.href)) errors.push(`${where}: duplicate topic ${page.href}`);
      else topics.push(page);
    }
    const refs = Array.isArray(r.refs) ? (r.refs as QuestionRef[]) : [];
    for (const ref of refs) if (!ref?.title || !/^https:\/\//.test(ref?.url ?? "")) errors.push(`${where}: bad ref`);
    return {
      q: String(r.q).trim(),
      a: String(r.a).trim(),
      level: r.level as Level,
      companies,
      topics,
      refs,
    };
  };

  for (const r of entries) {
    const where = `${file} ${String(r.id ?? "?")}`;
    if (typeof r.id !== "string" || !r.id) {
      errors.push(`${where}: missing id`);
      continue;
    }
    const category = String(r.category);
    const subcategory = String(r.subcategory);
    if (`${category}.yaml` !== file) errors.push(`${where}: category ${category} does not match file`);
    if (!categories.get(category)?.subsections.some((s) => s.slug === subcategory)) {
      errors.push(`${where}: unknown subsection ${category}/${subcategory}`);
    }
    const fields = common(r, where);
    let related: LinkRef | undefined;
    if (r.related !== undefined) {
      const page = typeof r.related === "string" ? resolvePage(r.related) : null;
      if (!page) errors.push(`${where}: related page not found ${String(r.related)}`);
      else related = page;
    }
    if (r.source !== undefined && r.source !== "outcome-school") errors.push(`${where}: unknown source`);
    // A system design question is always shown on a topic page, so it must name one.
    if (categories.get(category)?.track === "design" && fields.topics.length === 0) {
      errors.push(`${where}: a system design question needs at least one topic`);
    }
    const signals: string[] = [];
    if (r.signals !== undefined && !Array.isArray(r.signals)) errors.push(`${where}: signals must be a list`);
    for (const slug of Array.isArray(r.signals) ? (r.signals as unknown[]) : []) {
      if (typeof slug !== "string" || (signalSlugs && !signalSlugs.has(slug))) {
        errors.push(`${where}: unknown signal ${String(slug)}`);
      } else if (signals.includes(slug)) errors.push(`${where}: duplicate signal ${slug}`);
      else signals.push(slug);
    }
    const question: LibraryQuestion = {
      id: r.id,
      ...fields,
      signals,
      file: `question-bank/${file}`,
      category,
      subcategory,
      // The main topic is the deep-dive link unless the entry names another page.
      related: related ?? fields.topics[0],
      source: r.source === "outcome-school" ? "outcome-school" : "original",
      followUps: [],
    };
    out.push(question);

    if (r.followUps !== undefined && !Array.isArray(r.followUps)) errors.push(`${where}: followUps must be a list`);
    for (const raw of Array.isArray(r.followUps) ? (r.followUps as Record<string, unknown>[]) : []) {
      const slug = slugify(String(raw?.q ?? ""));
      const id = `${r.id}--${slug}`;
      const at = `${file} ${id}`;
      // One level only: a follow-up is a short probe, not a new thread.
      for (const key of Object.keys(raw ?? {})) {
        if (!FOLLOW_UP_KEYS.has(key)) errors.push(`${at}: a follow-up cannot have ${key}`);
      }
      const own = common(raw ?? {}, at);
      const followUp: LibraryQuestion = {
        id,
        ...own,
        file: question.file,
        category,
        subcategory,
        related: own.topics[0] ?? question.related,
        source: "original",
        signals: [],
        parent: { id: question.id, q: question.q },
        followUps: [],
      };
      question.followUps.push(followUp);
      out.push(followUp);
    }
  }
  return out;
}

// Practice questions written inside articles, filed under the article's subsection.
function loadArticleQuestions(
  isSubsection: (cat: string, sub: string) => boolean,
  companySlugByName: Map<string, string>,
  errors: string[]
): LibraryQuestion[] {
  const map = readYaml<Record<string, string>>(path.join(BANK_DIR, "articles.yaml"));
  const out: LibraryQuestion[] = [];
  for (const [href, target] of Object.entries(map)) {
    const [category, subcategory] = target.split("/");
    if (!isSubsection(category, subcategory)) errors.push(`articles.yaml ${href}: unknown subsection ${target}`);
    const file = path.join(CONTENT, `${href}.mdx`);
    if (!fs.existsSync(file)) {
      errors.push(`articles.yaml: page not found ${href}`);
      continue;
    }
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    const related = { href, title: (data.title as string) ?? href };
    const rel = path.relative(CONTENT, file);
    for (const { question: q, level, answer: a, companies: names = [] } of extractInterviewQuestions(content)) {
      const id = `${href}#${slugify(q)}`;
      for (const problem of checkAnswerMdx(a)) errors.push(`${rel} ${id}: ${problem}`);
      const companies: string[] = [];
      for (const name of names) {
        const slug = companySlugByName.get(name);
        if (slug) companies.push(slug);
        else errors.push(`${rel} ${id}: unknown company ${name}`);
      }
      out.push({
        id,
        q,
        a,
        file: rel,
        level: LEVELS.includes(level as Level) ? (level as Level) : undefined,
        category,
        subcategory,
        companies,
        related,
        topics: [],
        signals: [],
        refs: [],
        source: "article",
        followUps: [],
      });
    }
  }
  return out;
}

export interface UnmappedQuestionArticle {
  section: string;
  href: string;
  file: string;
}

// Every article with practice questions must be filed in articles.yaml. Checked for each section with
// `questions: true` in content/sections.yaml, by scripts/content-check.ts (not at render time).
export function findUnmappedQuestionArticles(): UnmappedQuestionArticle[] {
  const map = readYaml<Record<string, string>>(path.join(BANK_DIR, "articles.yaml"));
  const out: UnmappedQuestionArticle[] = [];
  for (const section of allSections().filter((s) => s.questions)) {
    const dir = path.join(CONTENT, section.key);
    if (!fs.existsSync(dir)) continue;
    for (const rel of (fs.readdirSync(dir, { recursive: true }) as string[]).sort()) {
      if (!rel.endsWith(".mdx")) continue;
      const href = `${section.href}/${rel.replace(/\.mdx$/, "")}`;
      const file = path.join(dir, rel);
      if (!(href in map) && hasInterviewQuestions(fs.readFileSync(file, "utf8"))) {
        out.push({ section: section.key, href, file });
      }
    }
  }
  return out;
}

/** Loads and validates the whole library; returns the problems instead of throwing (content-check). */
export function validateLibrary(): string[] {
  try {
    load();
    return [];
  } catch (e) {
    return String((e as Error).message)
      .split("\n")
      .slice(1);
  }
}

interface Library {
  categories: Category[];
  companies: Company[];
  signals: Signal[];
  questions: LibraryQuestion[];
}

let cache: Library | null = null;

function load(): Library {
  if (cache) return cache;
  const errors: string[] = [];
  const categories = loadTaxonomy(errors);
  const companies = loadCompanies(errors);
  const subs = new Set(categories.flatMap((c) => c.subsections.map((s) => `${c.slug}/${s.slug}`)));
  const isSubsection = (cat: string, sub: string) => subs.has(`${cat}/${sub}`);
  const companySlugByName = new Map(companies.map((c) => [c.name, c.slug]));
  const signals = loadSignals(errors);

  const questions = [
    ...loadYamlQuestions(
      new Map(categories.map((c) => [c.slug, c])),
      companySlugByName,
      errors,
      new Set(signals.map((s) => s.slug))
    ),
    ...loadArticleQuestions(isSubsection, companySlugByName, errors),
  ];
  const ids = new Set<string>();
  for (const q of questions) {
    if (ids.has(q.id)) errors.push(`duplicate question id ${q.id}`);
    ids.add(q.id);
  }
  if (errors.length) throw new Error(`Invalid interview question library:\n${errors.join("\n")}`);

  // Library order: category, then subsection order from the taxonomy.
  const rank = new Map<string, number>();
  categories.forEach((c, i) => c.subsections.forEach((s, j) => rank.set(`${c.slug}/${s.slug}`, i * 100 + j)));
  questions.sort((a, b) => rank.get(`${a.category}/${a.subcategory}`)! - rank.get(`${b.category}/${b.subcategory}`)!);
  cache = { categories, companies, signals, questions };
  return cache;
}

// Everything is loaded and validated, but readers only see categories whose flag is on, and
// links and article questions from sections that are not `on` (hidden or off) are left out.
function isCategoryVisible(c: Category) {
  return !c.flag || features[c.flag];
}

function visibleLink(link?: LinkRef) {
  return link && isPathVisible(link.href) ? link : undefined;
}

/** The visible categories, area by area (CATEGORY_GROUPS order), each area in taxonomy order. */
export function getCategories() {
  const rank = (c: Category) => CATEGORY_GROUPS.indexOf(c.group);
  return load()
    .categories.filter(isCategoryVisible)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .map(({ c }) => ({ ...c, study: c.study.filter((s) => isPathVisible(s.href)) }));
}

export function getCategory(slug: string) {
  return getCategories().find((c) => c.slug === slug);
}

// What a reader may see of a question: links to pages of sections that are not `on` are dropped.
function visibleQuestion(q: LibraryQuestion): LibraryQuestion {
  const topics = q.topics.filter((t) => isPathVisible(t.href));
  const related = visibleLink(q.related);
  if (related === q.related && topics.length === q.topics.length && q.followUps.length === 0) return q;
  return { ...q, related, topics, followUps: q.followUps.map(visibleQuestion) };
}

/**
 * The visible questions, in library order. Follow-ups are included as questions of their own (`parent` set),
 * straight after the question they follow, so counts and the company filter see them.
 */
export function getQuestions({
  category,
  subcategory,
  company,
  track,
}: { category?: string; subcategory?: string; company?: string; track?: InterviewTrack } = {}) {
  const visible = new Map(getCategories().map((c) => [c.slug, c]));
  return load()
    .questions.filter(
      (q) =>
        visible.has(q.category) &&
        !(q.source === "article" && !visibleLink(q.related)) &&
        (!category || q.category === category) &&
        (!subcategory || q.subcategory === subcategory) &&
        (!track || visible.get(q.category)!.track === track) &&
        (!company || q.companies.includes(company))
    )
    .map(visibleQuestion);
}

/**
 * The library questions tagged to a page (`topics`), for the "Asked in interviews" list on that page. A follow-up
 * tagged to the page is returned on its own unless its parent is tagged too (the parent then carries it).
 */
export function getQuestionsForTopic(href: string) {
  const tagged = getQuestions().filter((q) => q.topics.some((t) => t.href === href));
  const ids = new Set(tagged.map((q) => q.id));
  return tagged.filter((q) => !q.parent || !ids.has(q.parent.id));
}

export function getSignals() {
  return load().signals;
}

export function getCompanies() {
  return load().companies;
}

export function getCompany(slug: string) {
  return load().companies.find((c) => c.slug === slug);
}
