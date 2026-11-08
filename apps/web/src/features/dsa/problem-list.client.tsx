"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DIFFICULTY_LABELS } from "./constants";
import { filterProblems, type Facet, type ProblemFilters, type ProblemIndex } from "./problem-index";
import { DIFFICULTY_CLASS } from "./difficulty";

// The problem list with its filters (plan §15.1). The index is built at build time and arrives as props;
// filtering happens here, in the browser, with no request. The full list is in the prerendered HTML.

const FILTERS: { key: keyof ProblemFilters; label: string; all: string }[] = [
  { key: "difficulty", label: "Difficulty", all: "Any difficulty" },
  { key: "pattern", label: "Pattern", all: "Any pattern" },
  { key: "company", label: "Company", all: "Any company" },
];

export function ProblemList({ index }: { index: ProblemIndex }) {
  const [filters, setFilters] = useState<ProblemFilters>({});
  const shown = useMemo(() => filterProblems(index.problems, filters), [index.problems, filters]);
  const labels = (facets: Facet[]) => new Map(facets.map((f) => [f.value, f.label]));
  const patternLabels = useMemo(() => labels(index.facets.pattern), [index.facets.pattern]);
  const active = Object.values(filters).some(Boolean);

  return (
    <div>
      <form
        className="flex flex-wrap items-end gap-3"
        aria-label="Filter problems"
        onSubmit={(e) => e.preventDefault()}
      >
        {FILTERS.map(({ key, label, all }) => (
          <label
            key={key}
            className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            {label}
            <select
              name={key}
              value={filters[key] ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value || undefined }))}
              className="min-w-44 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink"
            >
              <option value="">{all}</option>
              {index.facets[key].map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} ({f.count})
                </option>
              ))}
            </select>
          </label>
        ))}
        {active && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-ink"
          >
            Clear filters
          </button>
        )}
      </form>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite" data-problem-count>
        {shown.length === index.problems.length
          ? `${shown.length} problems`
          : `${shown.length} of ${index.problems.length} problems`}
      </p>

      <ul className="mt-3 divide-y divide-hairline border-y border-hairline" aria-label="Problems">
        {shown.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4" data-problem={p.slug}>
            <Link href={p.href} className="font-semibold text-ink underline-offset-4 hover:underline">
              {p.title}
            </Link>
            <span className={`text-xs font-semibold ${DIFFICULTY_CLASS[p.difficulty]}`}>
              {DIFFICULTY_LABELS[p.difficulty]}
            </span>
            {p.access === "premium" && (
              <span className="rounded-full border border-hairline px-2 text-xs text-muted-foreground">
                Pro editorial
              </span>
            )}
            <span className="w-full text-sm text-muted-foreground sm:ml-auto sm:w-auto">
              {p.patterns.map((s) => patternLabels.get(s) ?? s).join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No problems match these filters yet.</p>}
    </div>
  );
}
