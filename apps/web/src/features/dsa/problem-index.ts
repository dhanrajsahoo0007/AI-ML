import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from "./constants";
import type { ValidProblem } from "./source";

// The build-time problem index behind /<section>/problems (plan §15.1): one small JSON record per problem
// with only what the list shows and filters on. It is computed while the page is prerendered and handed to
// the client list as props, so filtering runs in the browser with no request and no database. Statements,
// starters, tests and editorials are never part of it. Pure and client-safe (no Node imports).
//
// Kept small because it is in the list page's payload once per problem: a problem's link is `base` + slug, so
// no entry carries its href.

export interface ProblemIndexEntry {
  slug: string;
  title: string;
  difficulty: Difficulty;
  patterns: string[];
  topics: string[];
  companies: string[];
  access: "free" | "premium";
}

export interface Facet {
  value: string;
  label: string;
  count: number;
}

export interface ProblemIndex {
  /** The problem list's path; a problem's page is `${base}/${slug}`. */
  base: string;
  problems: ProblemIndexEntry[];
  facets: { difficulty: Facet[]; topic: Facet[]; pattern: Facet[]; company: Facet[] };
}

export interface ProblemFilters {
  difficulty?: string;
  topic?: string;
  pattern?: string;
  company?: string;
  /** Text the title must contain (case-insensitive). */
  q?: string;
}

interface IndexInput {
  base: string;
  problems: ValidProblem[];
  access: (p: ValidProblem) => "free" | "premium";
  topicLabels: Map<string, string>;
  patternLabels: Map<string, string>;
  companyLabels: Map<string, string>;
}

/** Rows per page of the list. */
export const PAGE_SIZE = 50;

function facet(values: string[][], labels: Map<string, string>, order?: readonly string[]): Facet[] {
  const counts = new Map<string, number>();
  for (const list of values) for (const v of new Set(list)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const facets = [...counts].map(([value, count]) => ({ value, label: labels.get(value) ?? value, count }));
  return order
    ? facets.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
    : facets.sort((a, b) => a.label.localeCompare(b.label));
}

/** Published problems only, in content order, with the filter values that occur. */
export function buildProblemIndex(input: IndexInput): ProblemIndex {
  const { base, problems, access, topicLabels, patternLabels, companyLabels } = input;
  const entries: ProblemIndexEntry[] = problems
    .filter((p) => p.fm.status === "published")
    .map((p) => ({
      slug: p.slug,
      title: p.fm.title,
      difficulty: p.fm.difficulty,
      patterns: p.fm.patterns,
      topics: p.fm.topics,
      companies: p.fm.companies,
      access: access(p),
    }));
  const difficultyLabels = new Map<string, string>(Object.entries(DIFFICULTY_LABELS));
  return {
    base,
    problems: entries,
    facets: {
      difficulty: facet(
        entries.map((e) => [e.difficulty]),
        difficultyLabels,
        DIFFICULTIES
      ),
      topic: facet(
        entries.map((e) => e.topics),
        topicLabels
      ),
      pattern: facet(
        entries.map((e) => e.patterns),
        patternLabels
      ),
      company: facet(
        entries.map((e) => e.companies),
        companyLabels
      ),
    },
  };
}

/** The entries matching every filter that is set. */
export function filterProblems(entries: ProblemIndexEntry[], filters: ProblemFilters): ProblemIndexEntry[] {
  const q = filters.q?.trim().toLowerCase();
  return entries.filter(
    (e) =>
      (!filters.difficulty || e.difficulty === filters.difficulty) &&
      (!filters.topic || e.topics.includes(filters.topic)) &&
      (!filters.pattern || e.patterns.includes(filters.pattern)) &&
      (!filters.company || e.companies.includes(filters.company)) &&
      (!q || e.title.toLowerCase().includes(q))
  );
}

/** One page of `entries` (1-based, clamped to the pages that exist) and the number of pages. */
export function pageOf<T>(entries: T[], page: number, size = PAGE_SIZE): { rows: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { rows: entries.slice((current - 1) * size, current * size), page: current, pages };
}
