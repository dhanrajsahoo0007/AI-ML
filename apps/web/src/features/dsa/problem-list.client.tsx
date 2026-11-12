"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DIFFICULTY_LABELS } from "./constants";
import { filterProblems, pageOf, type Facet, type ProblemFilters, type ProblemIndex } from "./problem-index";
import { DIFFICULTY_CLASS } from "./difficulty";

// The problem list with its filters (plan §15.1). The index is built at build time and arrives as props;
// filtering and paging happen here, in the browser, with no request. The prerendered HTML holds the first page.
// Rows don't prefetch their problem pages: a page of 50 links would otherwise fetch 50 RSC payloads.

type FacetKey = "difficulty" | "topic" | "pattern" | "company";

const FILTERS: { key: FacetKey; label: string; all: string }[] = [
  { key: "difficulty", label: "Difficulty", all: "Any difficulty" },
  { key: "topic", label: "Topic", all: "Any topic" },
  { key: "pattern", label: "Pattern", all: "Any pattern" },
  { key: "company", label: "Company", all: "Any company" },
];

const fieldLabel = "flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const field =
  "rounded-lg border border-hairline bg-paper px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink";
const pageButton =
  "rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-50";

export function ProblemList({ index }: { index: ProblemIndex }) {
  const [filters, setFilters] = useState<ProblemFilters>({});
  const [page, setPage] = useState(1);
  const matching = useMemo(() => filterProblems(index.problems, filters), [index.problems, filters]);
  const shown = pageOf(matching, page);
  const patternLabels = useMemo(
    () => new Map(index.facets.pattern.map((f: Facet) => [f.value, f.label])),
    [index.facets.pattern]
  );
  const active = Object.values(filters).some(Boolean);
  const update = (next: ProblemFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div>
      <form
        className="flex flex-wrap items-end gap-3"
        aria-label="Filter problems"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className={fieldLabel}>
          Title
          <input
            type="search"
            name="q"
            value={filters.q ?? ""}
            placeholder="Search titles"
            onChange={(e) => update({ ...filters, q: e.target.value || undefined })}
            className={`${field} min-w-56`}
          />
        </label>
        {FILTERS.map(({ key, label, all }) => (
          <label key={key} className={fieldLabel}>
            {label}
            <select
              name={key}
              value={filters[key] ?? ""}
              onChange={(e) => update({ ...filters, [key]: e.target.value || undefined })}
              className={`${field} min-w-44`}
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
            onClick={() => update({})}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-ink"
          >
            Clear filters
          </button>
        )}
      </form>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite" data-problem-count>
        {matching.length === index.problems.length
          ? `${matching.length} problems`
          : `${matching.length} of ${index.problems.length} problems`}
      </p>

      <ul className="mt-3 divide-y divide-hairline border-y border-hairline" aria-label="Problems">
        {shown.rows.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4" data-problem={p.slug}>
            <Link
              href={`${index.base}/${p.slug}`}
              prefetch={false}
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
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
      {matching.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No problems match these filters yet.</p>
      )}

      {shown.pages > 1 && (
        <nav aria-label="Problem list pages" className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className={pageButton}
            disabled={shown.page === 1}
            onClick={() => setPage(shown.page - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground" data-problem-page>
            Page {shown.page} of {shown.pages}
          </span>
          <button
            type="button"
            className={pageButton}
            disabled={shown.page === shown.pages}
            onClick={() => setPage(shown.page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
