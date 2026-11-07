import "server-only";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import { features, type FeatureFlag } from "@/config/features";
import { allSections, isPathVisible, sectionOfKind } from "@/features/sections/registry";

// The interview question library: every question has a category and subsection from
// content/question-bank/taxonomy.yaml. Questions come from two places:
// - content/question-bank/<category>.yaml (entries with `source: outcome-school` are adapted from
//   Outcome School's "AI Engineering Interview Questions Company Wise", Apache 2.0; answers are ours);
// - practice questions inside articles, filed by content/question-bank/articles.yaml.

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
  a: string;
  level?: Level;
  category: string;
  subcategory: string;
  /** Company slugs. */
  companies: string[];
  related?: LinkRef;
  refs: QuestionRef[];
  source: QuestionSource;
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

export const CATEGORY_GROUPS = [
  "Generative AI & LLMs",
  "System Design & Production",
  "Machine Learning & Data Science",
  "Career & Applied",
];

export const COMPANY_GROUPS = [
  "Frontier AI Labs",
  "Big Tech AI",
  "AI Infrastructure",
  "AI-Native Products",
  "Forward-Deployed & Enterprise",
];

const LEVELS: Level[] = ["Junior", "Mid", "Senior"];
const CONTENT = path.join(process.cwd(), "content");
const BANK_DIR = path.join(CONTENT, "question-bank");
const DATA_FILES = new Set(["taxonomy.yaml", "articles.yaml"]);

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
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function loadTaxonomy(errors: string[]): Category[] {
  type Raw = Omit<Category, "study"> & { study?: string[] };
  const raw = readYaml<Raw[]>(path.join(BANK_DIR, "taxonomy.yaml"));
  const seen = new Set<string>();
  return raw.map((c) => {
    if (seen.has(c.slug)) errors.push(`taxonomy: duplicate category ${c.slug}`);
    seen.add(c.slug);
    if (!CATEGORY_GROUPS.includes(c.group)) errors.push(`taxonomy ${c.slug}: unknown group ${c.group}`);
    if (c.flag !== undefined && !(c.flag in features)) errors.push(`taxonomy ${c.slug}: unknown flag ${c.flag}`);
    if (c.access !== undefined && c.access !== "free" && c.access !== "premium") {
      errors.push(`taxonomy ${c.slug}: access must be free or premium`);
    }
    const subs = new Set<string>();
    for (const s of c.subsections) {
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

interface RawQuestion {
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
}

function loadYamlQuestions(
  isSubsection: (cat: string, sub: string) => boolean,
  companySlugByName: Map<string, string>,
  errors: string[]
): LibraryQuestion[] {
  const out: LibraryQuestion[] = [];
  const files = fs.readdirSync(BANK_DIR).filter((f) => f.endsWith(".yaml") && !DATA_FILES.has(f));
  for (const file of files) {
    for (const r of readYaml<RawQuestion[]>(path.join(BANK_DIR, file)) ?? []) {
      const where = `${file} ${String(r.id ?? "?")}`;
      if (typeof r.id !== "string" || !r.id) { errors.push(`${where}: missing id`); continue; }
      if (typeof r.q !== "string" || !r.q.trim()) errors.push(`${where}: missing q`);
      if (typeof r.a !== "string" || !r.a.trim()) errors.push(`${where}: missing a`);
      if (!LEVELS.includes(r.level as Level)) errors.push(`${where}: bad level ${String(r.level)}`);
      const category = String(r.category);
      const subcategory = String(r.subcategory);
      if (`${category}.yaml` !== file) errors.push(`${where}: category ${category} does not match file`);
      if (!isSubsection(category, subcategory)) errors.push(`${where}: unknown subsection ${category}/${subcategory}`);
      const companies: string[] = [];
      for (const name of Array.isArray(r.companies) ? (r.companies as string[]) : []) {
        const slug = companySlugByName.get(name);
        if (slug) companies.push(slug);
        else errors.push(`${where}: unknown company ${name}`);
      }
      let related: LinkRef | undefined;
      if (r.related !== undefined) {
        const page = typeof r.related === "string" ? resolvePage(r.related) : null;
        if (!page) errors.push(`${where}: related page not found ${String(r.related)}`);
        else related = page;
      }
      const refs = Array.isArray(r.refs) ? (r.refs as QuestionRef[]) : [];
      for (const ref of refs) if (!ref?.title || !/^https:\/\//.test(ref?.url ?? "")) errors.push(`${where}: bad ref`);
      if (r.source !== undefined && r.source !== "outcome-school") errors.push(`${where}: unknown source`);
      out.push({
        id: r.id,
        q: String(r.q).trim(),
        a: String(r.a).trim(),
        level: r.level as Level,
        category,
        subcategory,
        companies,
        related,
        refs,
        source: r.source === "outcome-school" ? "outcome-school" : "original",
      });
    }
  }
  return out;
}

const QUESTION_RE = /<InterviewQuestion\s+((?:[^>"]|"[^"]*")*)>([\s\S]*?)<\/InterviewQuestion>/g;

function attr(attrs: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
}

// Practice questions written inside articles, filed under the article's subsection.
function loadArticleQuestions(
  isSubsection: (cat: string, sub: string) => boolean,
  errors: string[]
): LibraryQuestion[] {
  const map = readYaml<Record<string, string>>(path.join(BANK_DIR, "articles.yaml"));
  const out: LibraryQuestion[] = [];
  for (const [href, target] of Object.entries(map)) {
    const [category, subcategory] = target.split("/");
    if (!isSubsection(category, subcategory)) errors.push(`articles.yaml ${href}: unknown subsection ${target}`);
    const file = path.join(CONTENT, `${href}.mdx`);
    if (!fs.existsSync(file)) { errors.push(`articles.yaml: page not found ${href}`); continue; }
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    const related = { href, title: (data.title as string) ?? href };
    for (const m of content.matchAll(QUESTION_RE)) {
      const q = attr(m[1], "question");
      if (!q) continue;
      const level = attr(m[1], "level") as Level | undefined;
      const a = m[2]
        .trim()
        .split(/\n\s*\n/)
        .map((p) => p.split("\n").map((l) => l.trim()).join(" "))
        .join("\n\n");
      out.push({
        id: `${href}#${slugify(q)}`,
        q,
        a,
        level: level && LEVELS.includes(level) ? level : undefined,
        category,
        subcategory,
        companies: [],
        related,
        refs: [],
        source: "article",
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
      if (!(href in map) && fs.readFileSync(file, "utf8").includes("<InterviewQuestion ")) {
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
    return String((e as Error).message).split("\n").slice(1);
  }
}

interface Library {
  categories: Category[];
  companies: Company[];
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

  const questions = [
    ...loadYamlQuestions(isSubsection, companySlugByName, errors),
    ...loadArticleQuestions(isSubsection, errors),
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
  questions.sort(
    (a, b) => rank.get(`${a.category}/${a.subcategory}`)! - rank.get(`${b.category}/${b.subcategory}`)!
  );
  cache = { categories, companies, questions };
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

export function getCategories() {
  return load()
    .categories.filter(isCategoryVisible)
    .map((c) => ({ ...c, study: c.study.filter((s) => isPathVisible(s.href)) }));
}

export function getCategory(slug: string) {
  return getCategories().find((c) => c.slug === slug);
}

export function getQuestions({
  category,
  subcategory,
  company,
}: { category?: string; subcategory?: string; company?: string } = {}) {
  const visible = new Set(getCategories().map((c) => c.slug));
  return load()
    .questions.filter(
      (q) =>
        visible.has(q.category) &&
        !(q.source === "article" && !visibleLink(q.related)) &&
        (!category || q.category === category) &&
        (!subcategory || q.subcategory === subcategory) &&
        (!company || q.companies.includes(company))
    )
    .map((q) => (q.related && !visibleLink(q.related) ? { ...q, related: undefined } : q));
}

export function getCompanies() {
  return load().companies;
}

export function getCompany(slug: string) {
  return load().companies.find((c) => c.slug === slug);
}
