import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from "./constants";
import type { ValidProblem } from "./source";

// The build-time problem index behind /<section>/problems (plan §15.1): one small JSON record per problem
// with only what the list shows and filters on. It is computed while the page is prerendered and handed to
// the client list as props, so filtering runs in the browser with no request and no database. Statements,
// starters, tests and editorials are never part of it. Pure and client-safe (no Node imports).

export interface ProblemIndexEntry {
  slug: string;
  href: string;
  title: string;
  difficulty: Difficulty;
  patterns: string[];
  companies: string[];
  access: "free" | "premium";
}

export interface Facet {
  value: string;
  label: string;
  count: number;
}

export interface ProblemIndex {
  problems: ProblemIndexEntry[];
  facets: { difficulty: Facet[]; pattern: Facet[]; company: Facet[] };
}

export interface ProblemFilters {
  difficulty?: string;
  pattern?: string;
  company?: string;
}

interface IndexInput {
  problems: ValidProblem[];
  access: (p: ValidProblem) => "free" | "premium";
  patternLabels: Map<string, string>;
  companyLabels: Map<string, string>;
}

function facet(values: string[][], labels: Map<string, string>, order?: readonly string[]): Facet[] {
  const counts = new Map<string, number>();
  for (const list of values) for (const v of new Set(list)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const facets = [...counts].map(([value, count]) => ({ value, label: labels.get(value) ?? value, count }));
  return order
    ? facets.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
    : facets.sort((a, b) => a.label.localeCompare(b.label));
}

/** Published problems only, in content order, with the filter values that occur. */
export function buildProblemIndex({ problems, access, patternLabels, companyLabels }: IndexInput): ProblemIndex {
  const entries: ProblemIndexEntry[] = problems
    .filter((p) => p.fm.status === "published")
    .map((p) => ({
      slug: p.slug,
      href: p.href,
      title: p.fm.title,
      difficulty: p.fm.difficulty,
      patterns: p.fm.patterns,
      companies: p.fm.companies,
      access: access(p),
    }));
  const difficultyLabels = new Map<string, string>(Object.entries(DIFFICULTY_LABELS));
  return {
    problems: entries,
    facets: {
      difficulty: facet(
        entries.map((e) => [e.difficulty]),
        difficultyLabels,
        DIFFICULTIES
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
  return entries.filter(
    (e) =>
      (!filters.difficulty || e.difficulty === filters.difficulty) &&
      (!filters.pattern || e.patterns.includes(filters.pattern)) &&
      (!filters.company || e.companies.includes(filters.company))
  );
}
